from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin, IsTherapistOrAdmin
from .matching import find_available_therapist, build_whatsapp_message, should_trigger_handoff
from .models import TherapistProfile, TherapistApplication, PatientAssignment, HandoffEvent, ConnectionRequest, DirectMessage
from .serializers import (
    TherapistProfileSerializer, TherapistApplicationSerializer,
    ConnectionRequestSerializer, DirectMessageSerializer,
)


class TherapistDirectoryView(generics.ListAPIView):
    """GET /api/v1/therapists/ — public directory of approved therapists"""

    serializer_class = TherapistProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = TherapistProfile.objects.filter(status=TherapistProfile.Status.APPROVED)
        spec = self.request.query_params.get('specialization')
        if spec:
            qs = qs.filter(specializations__contains=[spec])
        return qs.select_related('user')


class TherapistDetailView(generics.RetrieveAPIView):
    """GET /api/v1/therapists/<id>/"""

    serializer_class = TherapistProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = TherapistProfile.objects.filter(status=TherapistProfile.Status.APPROVED)


class FindAvailableTherapistView(APIView):
    """
    GET /api/v1/therapists/available/?module=anxiety
    Returns the best available therapist for the given module.
    Called by the frontend when showing the handoff banner.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        module_id = request.query_params.get('module', 'chat')
        therapist = find_available_therapist(module_id)

        if not therapist:
            return Response({'available': False, 'therapist': None})

        patient_name = request.user.name or request.user.email.split('@')[0]
        wa_message = build_whatsapp_message(patient_name, module_id)
        wa_number = therapist.whatsapp_number.replace('+', '').replace(' ', '')
        wa_link = f'https://wa.me/{wa_number}?text={wa_message}'

        return Response({
            'available': True,
            'therapist': TherapistProfileSerializer(therapist).data,
            'whatsapp_link': wa_link,
            'whatsapp_message': wa_message,
        })


class CheckHandoffView(APIView):
    """
    POST /api/v1/therapists/check-handoff/
    Called after each user message to check if handoff should trigger.
    Body: { session_id, module_id, messages, current_message }
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id', '')
        module_id = request.data.get('module_id', 'chat')
        messages = request.data.get('messages', [])
        current_message = request.data.get('current_message', '')

        result = should_trigger_handoff(messages, current_message)

        if not result['trigger']:
            return Response({'trigger': False})

        therapist = find_available_therapist(module_id)
        patient_name = request.user.name or request.user.email.split('@')[0]

        # Log the handoff event
        HandoffEvent.objects.create(
            patient=request.user,
            therapist=therapist,
            session_id=session_id,
            reason=result['reason'],
            trigger_text=current_message[:500],
        )

        if not therapist:
            return Response({
                'trigger': True,
                'available': False,
                'reason': result['reason'],
                'message': 'A therapist will reach out to you soon.',
            })

        wa_message = build_whatsapp_message(patient_name, module_id)
        wa_number = therapist.whatsapp_number.replace('+', '').replace(' ', '')
        wa_link = f'https://wa.me/{wa_number}?text={wa_message}'

        # Create patient assignment
        PatientAssignment.objects.get_or_create(
            therapist=therapist,
            patient=request.user,
            status='active',
            defaults={'module_id': module_id},
        )

        return Response({
            'trigger': True,
            'available': True,
            'reason': result['reason'],
            'therapist': TherapistProfileSerializer(therapist).data,
            'whatsapp_link': wa_link,
            'whatsapp_message': wa_message,
        })


class ApplyAsTherapistView(generics.CreateAPIView):
    """POST /api/v1/therapists/apply/ — public, no auth needed"""

    serializer_class = TherapistApplicationSerializer
    permission_classes = [permissions.AllowAny]


class TherapistPortalView(APIView):
    """GET /api/v1/therapists/portal/ — therapist sees their patients"""

    permission_classes = [IsTherapistOrAdmin]

    def get(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'error': 'No therapist profile found.'}, status=404)

        assignments = PatientAssignment.objects.filter(
            therapist=profile, status='active',
        ).select_related('patient')

        patients = []
        for a in assignments:
            from chat.models import ChatSession, MoodEntry
            sessions = ChatSession.objects.filter(
                user=a.patient,
            ).order_by('-created_at')[:5]

            last_mood = MoodEntry.objects.filter(user=a.patient).order_by('-created_at').first()

            patients.append({
                'patient_id': str(a.patient.id),
                'patient_name': a.patient.name or a.patient.email,
                'patient_email': a.patient.email,
                'module': a.module_id,
                'assigned_at': a.assigned_at,
                'last_mood': last_mood.mood if last_mood else None,
                'recent_sessions': [
                    {
                        'id': str(s.id),
                        'module': s.module_id,
                        'summary': s.summary,
                        'crisis_flag': s.crisis_flag,
                        'created_at': s.created_at,
                    }
                    for s in sessions
                ],
            })

        return Response({
            'therapist': TherapistProfileSerializer(profile).data,
            'active_patients': len(patients),
            'patients': patients,
        })


# ── Admin views ───────────────────────────────────────────────────────────────

class AdminApplicationListView(generics.ListAPIView):
    """GET /api/v1/therapists/admin/applications/"""

    serializer_class = TherapistApplicationSerializer
    permission_classes = [IsAdmin]
    queryset = TherapistApplication.objects.all()
    filterset_fields = ['status']


class AdminApplicationReviewView(APIView):
    """PATCH /api/v1/therapists/admin/applications/<id>/review/"""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            app = TherapistApplication.objects.get(id=pk)
        except TherapistApplication.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        action = request.data.get('action')  # 'approve' or 'reject'
        notes = request.data.get('notes', '')

        if action not in ('approve', 'reject'):
            return Response({'error': "action must be 'approve' or 'reject'"}, status=400)

        app.status = 'approved' if action == 'approve' else 'rejected'
        app.review_notes = notes
        app.reviewed_by = request.user
        app.reviewed_at = timezone.now()
        app.save()

        # On approval: create user account + therapist profile
        if action == 'approve':
            from users.models import User
            import secrets

            user, created = User.objects.get_or_create(
                email=app.email,
                defaults={
                    'name': app.full_name,
                    'role': 'therapist',
                    'is_active': True,
                },
            )
            if created:
                # Set a temporary password — shown to admin to share manually
                temp_password = secrets.token_urlsafe(12)
                user.set_password(temp_password)
                user.role = 'therapist'
                user.save()
            else:
                temp_password = None

            TherapistProfile.objects.get_or_create(
                user=user,
                defaults={
                    'bio': app.bio,
                    'credentials': app.credentials,
                    'years_experience': app.years_experience,
                    'specializations': app.specializations,
                    'whatsapp_number': app.whatsapp_number,
                    'phone_number': app.phone,
                    'title': app.title,
                    'status': TherapistProfile.Status.APPROVED,
                    'approved_by': request.user,
                    'approved_at': timezone.now(),
                    'working_hours': {
                        'mon': {'start': '09:00', 'end': '17:00'},
                        'tue': {'start': '09:00', 'end': '17:00'},
                        'wed': {'start': '09:00', 'end': '17:00'},
                        'thu': {'start': '09:00', 'end': '17:00'},
                        'fri': {'start': '09:00', 'end': '17:00'},
                    },
                },
            )

        response_data = {'status': app.status, 'notes': notes}
        if action == 'approve':
            response_data['therapist_email'] = app.email
            response_data['therapist_name'] = app.full_name
            response_data['whatsapp'] = app.whatsapp_number
            if 'temp_password' in dir() or 'temp_password' in locals():
                pass
            response_data['message'] = (
                f'Account created for {app.full_name}. '
                f'Share credentials via WhatsApp: {app.whatsapp_number}'
            )
        return Response(response_data)


# ── Therapist Profile Update ──────────────────────────────────────────────────

class TherapistProfileUpdateView(APIView):
    """PATCH /api/v1/therapists/profile/ — therapist updates their own profile"""

    permission_classes = [IsTherapistOrAdmin]

    EDITABLE_FIELDS = [
        'bio', 'credentials', 'years_experience', 'specializations',
        'whatsapp_number', 'phone_number', 'photo_url', 'working_hours',
        'timezone', 'max_patients', 'is_available',
    ]

    def get(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'error': 'No therapist profile found.'}, status=404)
        return Response(TherapistProfileSerializer(profile).data)

    def patch(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'error': 'No therapist profile found.'}, status=404)

        for field in self.EDITABLE_FIELDS:
            if field in request.data:
                setattr(profile, field, request.data[field])
        profile.save()
        return Response(TherapistProfileSerializer(profile).data)


# ── Connection Requests ───────────────────────────────────────────────────────

class ConnectionRequestListCreateView(APIView):
    """
    GET  /api/v1/therapists/connections/  — list user's requests or therapist's incoming
    POST /api/v1/therapists/connections/  — patient requests to connect with a therapist
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.role == 'therapist':
            try:
                profile = user.therapist_profile
            except TherapistProfile.DoesNotExist:
                return Response([])
            qs = ConnectionRequest.objects.filter(therapist=profile).select_related('patient')
        else:
            qs = ConnectionRequest.objects.filter(patient=user).select_related('therapist__user')
        return Response(ConnectionRequestSerializer(qs, many=True).data)

    def post(self, request):
        serializer = ConnectionRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(patient=request.user)
        return Response(serializer.data, status=201)


class ConnectionRequestRespondView(APIView):
    """PATCH /api/v1/therapists/connections/<id>/respond/ — therapist accepts/declines"""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            conn = ConnectionRequest.objects.get(id=pk)
        except ConnectionRequest.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)

        if request.user.role != 'therapist' or conn.therapist.user != request.user:
            return Response({'error': 'Forbidden.'}, status=403)

        action = request.data.get('action')
        if action not in ('accept', 'decline'):
            return Response({'error': "action must be 'accept' or 'decline'"}, status=400)

        conn.status = 'accepted' if action == 'accept' else 'declined'
        conn.responded_at = timezone.now()
        conn.save()
        return Response(ConnectionRequestSerializer(conn).data)


class DirectMessageListCreateView(APIView):
    """
    GET  /api/v1/therapists/connections/<id>/messages/ — fetch messages
    POST /api/v1/therapists/connections/<id>/messages/ — send a message
    """
    permission_classes = [permissions.IsAuthenticated]

    def _get_connection(self, pk, user):
        try:
            conn = ConnectionRequest.objects.select_related('therapist__user', 'patient').get(id=pk)
        except ConnectionRequest.DoesNotExist:
            return None, 'Not found.'
        is_patient = conn.patient == user
        is_therapist = conn.therapist.user == user
        if not (is_patient or is_therapist):
            return None, 'Forbidden.'
        if conn.status != 'accepted':
            return None, 'Connection not accepted yet.'
        return conn, None

    def get(self, request, pk):
        conn, err = self._get_connection(pk, request.user)
        if err:
            return Response({'error': err}, status=404 if err == 'Not found.' else 403)
        msgs = conn.messages.select_related('sender').all()
        return Response(DirectMessageSerializer(msgs, many=True, context={'request': request}).data)

    def post(self, request, pk):
        conn, err = self._get_connection(pk, request.user)
        if err:
            return Response({'error': err}, status=404 if err == 'Not found.' else 403)
        serializer = DirectMessageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        msg = serializer.save(connection=conn, sender=request.user)
        return Response(DirectMessageSerializer(msg, context={'request': request}).data, status=201)


# ── Clinical Notes ────────────────────────────────────────────────────────────

from .serializers import ClinicalNoteSerializer, AppointmentSerializer
from .models import ClinicalNote, Appointment


class ClinicalNoteListCreateView(APIView):
    """GET/POST /api/v1/therapists/notes/?patient=<uuid>"""

    permission_classes = [IsTherapistOrAdmin]

    def get(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response([])
        qs = ClinicalNote.objects.filter(therapist=profile).select_related('patient')
        patient_id = request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)
        return Response(ClinicalNoteSerializer(qs, many=True).data)

    def post(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response({'error': 'No therapist profile.'}, status=404)
        serializer = ClinicalNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(therapist=profile)
        return Response(serializer.data, status=201)


class ClinicalNoteDetailView(APIView):
    """PATCH /api/v1/therapists/notes/<pk>/"""

    permission_classes = [IsTherapistOrAdmin]

    def patch(self, request, pk):
        try:
            note = ClinicalNote.objects.get(id=pk, therapist=request.user.therapist_profile)
        except (ClinicalNote.DoesNotExist, TherapistProfile.DoesNotExist):
            return Response({'error': 'Not found.'}, status=404)
        serializer = ClinicalNoteSerializer(note, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Risk Dashboard ─────────────────────────────────────────────────────────────

class TherapistRiskFlagsView(APIView):
    """GET /api/v1/therapists/risk-flags/ — crisis flags for therapist's patients"""

    permission_classes = [IsTherapistOrAdmin]

    def get(self, request):
        try:
            profile = request.user.therapist_profile
        except TherapistProfile.DoesNotExist:
            return Response([])
        patient_ids = PatientAssignment.objects.filter(
            therapist=profile, status='active',
        ).values_list('patient_id', flat=True)
        from chat.models import CrisisFlag, ChatSession
        flags = (
            CrisisFlag.objects
            .filter(user_id__in=patient_ids, resolved=False)
            .select_related('user', 'session')
            .order_by('-created_at')
        )
        data = []
        for f in flags:
            data.append({
                'id': str(f.id),
                'patient_id': str(f.user_id),
                'patient_name': f.user.name or f.user.email,
                'patient_email': f.user.email,
                'severity': f.severity,
                'trigger_text': f.trigger_text,
                'module': f.session.module_id if f.session else None,
                'created_at': f.created_at,
            })
        return Response(data)

    def patch(self, request, pk):
        """Resolve a flag: PATCH /api/v1/therapists/risk-flags/<pk>/resolve/"""
        from chat.models import CrisisFlag
        try:
            flag = CrisisFlag.objects.get(id=pk)
        except CrisisFlag.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        from django.utils import timezone as tz
        flag.resolved = True
        flag.resolved_by = request.user
        flag.resolved_at = tz.now()
        flag.save()
        return Response({'resolved': True})


# ── Patient Outcomes ──────────────────────────────────────────────────────────

class PatientOutcomesView(APIView):
    """GET /api/v1/therapists/outcomes/<patient_id>/ — mood + session trends"""

    permission_classes = [IsTherapistOrAdmin]

    def get(self, request, patient_id):
        from chat.models import MoodEntry, ChatSession
        moods = list(
            MoodEntry.objects
            .filter(user_id=patient_id)
            .order_by('-created_at')[:30]
            .values('mood', 'score', 'created_at')
        )
        sessions = list(
            ChatSession.objects
            .filter(user_id=patient_id)
            .order_by('-created_at')[:10]
            .values('id', 'module_id', 'summary', 'mood_score', 'crisis_flag', 'created_at')
        )
        return Response({'moods': moods, 'sessions': sessions})


# ── Appointments ──────────────────────────────────────────────────────────────

class AppointmentListCreateView(APIView):
    """GET/POST /api/v1/therapists/appointments/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role in ('therapist', 'admin'):
            try:
                profile = request.user.therapist_profile
                qs = Appointment.objects.filter(therapist=profile).select_related('patient')
            except TherapistProfile.DoesNotExist:
                return Response([])
        else:
            qs = Appointment.objects.filter(patient=request.user).select_related('therapist__user')
        return Response(AppointmentSerializer(qs, many=True).data)

    def post(self, request):
        serializer = AppointmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class AppointmentUpdateView(APIView):
    """PATCH /api/v1/therapists/appointments/<pk>/"""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            if request.user.role in ('therapist', 'admin'):
                appt = Appointment.objects.get(id=pk, therapist=request.user.therapist_profile)
            else:
                appt = Appointment.objects.get(id=pk, patient=request.user)
        except (Appointment.DoesNotExist, TherapistProfile.DoesNotExist):
            return Response({'error': 'Not found.'}, status=404)
        serializer = AppointmentSerializer(appt, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Audit Log ──────────────────────────────────────────────────────────────────

class AuditLogView(APIView):
    """GET /api/v1/therapists/audit-log/"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .models import AuditLog
        if request.user.role not in ('therapist', 'admin'):
            return Response({'error': 'Forbidden'}, status=403)
        logs = AuditLog.objects.filter(therapist=request.user).select_related('patient')[:100]
        data = [
            {
                'id': str(log.id),
                'action': log.get_action_display(),
                'action_code': log.action,
                'patient_name': (log.patient.name or log.patient.email) if log.patient else None,
                'detail': log.detail,
                'created_at': log.created_at.isoformat(),
            }
            for log in logs
        ]
        return Response(data)
