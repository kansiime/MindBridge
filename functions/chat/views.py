import json

from django.db.models import Count
from django.http import StreamingHttpResponse
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsAdmin, IsOwnerTherapistOrAdmin

from .models import ChatSession, CrisisFlag, MoodEntry
from .serializers import (
    ChatSessionCreateSerializer,
    ChatSessionDetailSerializer,
    ChatSessionSerializer,
    CrisisFlagSerializer,
    MoodEntrySerializer,
)
from .services import ChatService, detect_crisis


class ChatSessionListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/chat/sessions/   — list user sessions
    POST /api/v1/chat/sessions/   — create new session
    """

    filterset_fields = ['module_id', 'mood_label', 'crisis_flag']
    ordering_fields = ['created_at', 'updated_at']
    search_fields = ['title', 'summary']

    def get_serializer_class(self):
        return ChatSessionCreateSerializer if self.request.method == 'POST' else ChatSessionSerializer

    def get_queryset(self):
        qs = ChatSession.objects.annotate(message_count=Count('messages'))
        user = self.request.user
        if user.role == 'admin':
            return qs.all()
        if user.role == 'therapist':
            from users.models import TherapistPatient
            patient_ids = TherapistPatient.objects.filter(
                therapist=user,
            ).values_list('patient_id', flat=True)
            return qs.filter(user_id__in=patient_ids)
        return qs.filter(user=user)


class ChatSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/chat/sessions/<id>/  — session + messages
    PATCH  /api/v1/chat/sessions/<id>/  — end session
    DELETE /api/v1/chat/sessions/<id>/  — delete
    """

    serializer_class = ChatSessionDetailSerializer
    permission_classes = [IsOwnerTherapistOrAdmin]

    def get_queryset(self):
        return ChatSession.objects.prefetch_related('messages')

    def partial_update(self, request, *args, **kwargs):
        session = self.get_object()
        if 'end' in request.data or request.data.get('ended_at'):
            session.ended_at = timezone.now()
            from .tasks import summarise_session_task
            summarise_session_task.delay(str(session.id))
        session.save()
        return Response(ChatSessionSerializer(session).data)


class ChatMessageView(APIView):
    """
    POST /api/v1/chat/sessions/<session_id>/messages/
    Streams SSE response from Claude.
    """

    def post(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Session not found.'}, status=404)

        user_content = request.data.get('content', '').strip()
        use_rag = request.data.get('use_rag', False)

        if not user_content:
            return Response({'error': 'content is required.'}, status=400)

        from .models import Message
        Message.objects.create(session=session, role='user', content=user_content)

        crisis = detect_crisis(user_content)
        if crisis['is_crisis']:
            CrisisFlag.objects.create(
                user=request.user,
                session=session,
                severity=crisis['severity'],
                trigger_text=user_content[:500],
            )
            session.crisis_flag = True
            session.save(update_fields=['crisis_flag'])

        history = list(session.messages.values('role', 'content').order_by('created_at'))

        def event_stream():
            service = ChatService()
            full_response = ''
            try:
                for chunk in service.stream(history, session.module_id, use_rag=use_rag):
                    full_response += chunk
                    yield f'data: {json.dumps({"text": chunk})}\n\n'

                from .models import Message as Msg
                Msg.objects.create(session=session, role='assistant', content=full_response)

                msg_count = session.messages.count()
                if msg_count > 0 and msg_count % 10 == 0:
                    from .tasks import summarise_session_task
                    summarise_session_task.delay(str(session.id))

                yield 'data: [DONE]\n\n'
            except Exception as e:
                yield f'data: {json.dumps({"error": str(e)})}\n\n'

        response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        response['Access-Control-Allow-Origin'] = '*'
        return response


class MoodEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/chat/moods/  — mood history
    POST /api/v1/chat/moods/  — log mood
    """

    serializer_class = MoodEntrySerializer
    filterset_fields = ['mood', 'source']
    ordering_fields = ['created_at']

    def get_queryset(self):
        if self.request.user.role == 'admin':
            return MoodEntry.objects.all()
        return MoodEntry.objects.filter(user=self.request.user)


class CrisisFlagListView(generics.ListAPIView):
    """GET /api/v1/chat/crisis/  — admin/therapist only"""

    serializer_class = CrisisFlagSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return CrisisFlag.objects.select_related('user', 'session').filter(resolved=False)


class CrisisFlagResolveView(APIView):
    """PATCH /api/v1/chat/crisis/<id>/resolve/"""

    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            flag = CrisisFlag.objects.get(id=pk)
        except CrisisFlag.DoesNotExist:
            return Response({'error': 'Not found.'}, status=404)
        flag.resolved = True
        flag.resolved_by = request.user
        flag.resolved_at = timezone.now()
        flag.save()
        return Response(CrisisFlagSerializer(flag).data)


from .models import SafetyPlan, PHQAssessment
from .serializers import SafetyPlanSerializer, PHQAssessmentSerializer


class SafetyPlanView(APIView):
    """GET/PUT /api/v1/chat/safety-plan/"""

    def get(self, request):
        try:
            plan = request.user.safety_plan
        except SafetyPlan.DoesNotExist:
            return Response({})
        return Response(SafetyPlanSerializer(plan).data)

    def put(self, request):
        try:
            plan = request.user.safety_plan
            serializer = SafetyPlanSerializer(plan, data=request.data, partial=True)
        except SafetyPlan.DoesNotExist:
            serializer = SafetyPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data)


class PHQAssessmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chat/assessments/"""

    serializer_class = PHQAssessmentSerializer

    def get_queryset(self):
        return PHQAssessment.objects.filter(user=self.request.user)


class UserOutcomesView(APIView):
    """GET /api/v1/chat/outcomes/ — aggregated mood + session data for charts"""

    def get(self, request):
        from django.db.models.functions import TruncDate
        moods = (
            MoodEntry.objects
            .filter(user=request.user)
            .order_by('-created_at')[:30]
            .values('mood', 'score', 'created_at')
        )
        sessions = (
            ChatSession.objects
            .filter(user=request.user)
            .order_by('-created_at')[:20]
            .values('id', 'module_id', 'summary', 'mood_score', 'crisis_flag', 'created_at', 'ended_at')
        )
        return Response({
            'moods': list(moods),
            'sessions': list(sessions),
        })


# ── Gratitude Entries ─────────────────────────────────────────────────────────

from .models import GratitudeEntry, SessionFeedback
from .serializers import GratitudeEntrySerializer, SessionFeedbackSerializer


class GratitudeEntryListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/v1/chat/gratitude/"""
    serializer_class = GratitudeEntrySerializer

    def get_queryset(self):
        return GratitudeEntry.objects.filter(user=self.request.user)


class SessionFeedbackView(APIView):
    """POST /api/v1/chat/sessions/<session_id>/feedback/"""

    def post(self, request, session_id):
        try:
            session = ChatSession.objects.get(id=session_id, user=request.user)
        except ChatSession.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)
        if hasattr(session, 'feedback'):
            return Response({'error': 'Feedback already submitted'}, status=400)
        serializer = SessionFeedbackSerializer(data={**request.data, 'session': str(session.id)})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)


class UserOutcomesDetailView(APIView):
    """GET /api/v1/chat/outcomes/ — enhanced with streak + gratitude count"""

    def get(self, request):
        from django.db.models import Avg, Max
        moods = list(
            MoodEntry.objects
            .filter(user=request.user)
            .order_by('-created_at')[:30]
            .values('mood', 'score', 'note', 'created_at')
        )
        sessions = list(
            ChatSession.objects
            .filter(user=request.user)
            .order_by('-created_at')[:20]
            .values('id', 'module_id', 'summary', 'mood_score', 'crisis_flag', 'created_at', 'ended_at')
        )
        agg = MoodEntry.objects.filter(user=request.user).aggregate(
            avg_mood=Avg('score'), max_mood=Max('score')
        )
        gratitude_count = GratitudeEntry.objects.filter(user=request.user).count()

        # Streak: consecutive days with a mood entry
        from datetime import date, timedelta
        streak = 0
        today = date.today()
        day = today
        mood_dates = set(
            MoodEntry.objects.filter(user=request.user)
            .values_list('created_at__date', flat=True)
            .distinct()
        )
        while day in mood_dates:
            streak += 1
            day -= timedelta(days=1)

        return Response({
            'moods': moods,
            'sessions': sessions,
            'avg_mood': float(agg['avg_mood']) if agg['avg_mood'] else None,
            'max_mood': agg['max_mood'],
            'mood_count': len(moods),
            'gratitude_count': gratitude_count,
            'streak_days': streak,
        })


class WarmHandoffView(APIView):
    """GET /api/v1/chat/handoff/<patient_id>/ — AI session context for therapist"""

    def get(self, request, patient_id):
        if request.user.role not in ('therapist', 'admin'):
            return Response({'error': 'Forbidden'}, status=403)
        from .models import CrisisFlag
        recent = ChatSession.objects.filter(user_id=patient_id).order_by('-created_at').first()
        crisis = CrisisFlag.objects.filter(user_id=patient_id, resolved=False).first()
        moods = list(
            MoodEntry.objects.filter(user_id=patient_id).order_by('-created_at')[:7]
            .values('score', 'note', 'created_at')
        )
        phq = PHQAssessment.objects.filter(user_id=patient_id).order_by('-created_at').first()
        return Response({
            'last_session': {
                'module': recent.module_id if recent else None,
                'summary': recent.summary if recent else None,
                'created_at': recent.created_at if recent else None,
                'crisis_flag': recent.crisis_flag if recent else False,
            } if recent else None,
            'active_crisis': {
                'message': crisis.message if crisis else None,
                'created_at': crisis.created_at if crisis else None,
            } if crisis else None,
            'recent_moods': moods,
            'latest_phq': {
                'type': phq.type,
                'total_score': phq.total_score,
                'severity': phq.severity,
                'created_at': phq.created_at,
            } if phq else None,
        })
