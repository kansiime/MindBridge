from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin, IsTherapistOrAdmin
from .matching import find_available_therapist, build_whatsapp_message, should_trigger_handoff
from .models import TherapistProfile, TherapistApplication, PatientAssignment, HandoffEvent
from .serializers import (
    TherapistProfileSerializer, TherapistApplicationSerializer,
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
                # Set a temporary password — therapist must reset on first login
                temp_password = secrets.token_urlsafe(12)
                user.set_password(temp_password)
                user.role = 'therapist'
                user.save()

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

        return Response({'status': app.status, 'notes': notes})
