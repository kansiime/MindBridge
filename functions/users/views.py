from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .models import User, TherapistPatient
from .permissions import IsAdmin, IsTherapistOrAdmin
from .serializers import (
    AdminUserSerializer,
    ChangePasswordSerializer,
    RegisterSerializer,
    TherapistPatientSerializer,
    UserProfileUpdateSerializer,
    UserSerializer,
)


class RegisterView(generics.CreateAPIView):
    """POST /api/v1/auth/register/"""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                },
            },
            status=201,
        )


class LoginView(TokenObtainPairView):
    """POST /api/v1/auth/login/"""


class RefreshTokenView(TokenRefreshView):
    """POST /api/v1/auth/token/refresh/"""


class LogoutView(APIView):
    """POST /api/v1/auth/logout/"""

    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh')).blacklist()
            return Response({'detail': 'Logged out.'})
        except Exception:
            return Response({'error': 'Invalid token.'}, status=400)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/me/"""

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return UserProfileUpdateSerializer
        return UserSerializer

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/v1/auth/change-password/"""

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated.'})


class AdminUserListView(generics.ListAPIView):
    """GET /api/v1/auth/admin/users/"""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all().order_by('-created_at')
    filterset_fields = ['role', 'is_active']
    search_fields = ['email', 'name']


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/v1/auth/admin/users/<id>/"""

    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    queryset = User.objects.all()
    lookup_field = 'id'


class AdminStatsView(APIView):
    """GET /api/v1/auth/admin/stats/"""

    permission_classes = [IsAdmin]

    def get(self, request):
        from chat.models import ChatSession, CrisisFlag

        today = timezone.now() - timedelta(days=1)
        top_mod = (
            ChatSession.objects
            .values('module_id')
            .annotate(c=Count('id'))
            .order_by('-c')
            .first()
        )
        return Response({
            'total_users': User.objects.filter(role='user').count(),
            'active_today': (
                ChatSession.objects
                .filter(created_at__gte=today)
                .values('user')
                .distinct()
                .count()
            ),
            'sessions_today': ChatSession.objects.filter(created_at__gte=today).count(),
            'crisis_flags_today': CrisisFlag.objects.filter(created_at__gte=today).count(),
            'top_module': top_mod['module_id'] if top_mod else None,
            'unresolved_crisis': CrisisFlag.objects.filter(resolved=False).count(),
        })


class TherapistPatientListView(generics.ListCreateAPIView):
    """GET/POST /api/v1/auth/therapist/patients/"""

    serializer_class = TherapistPatientSerializer
    permission_classes = [IsTherapistOrAdmin]

    def get_queryset(self):
        return (
            TherapistPatient.objects
            .filter(therapist=self.request.user)
            .select_related('patient')
        )


class DataExportView(APIView):
    """GET /api/v1/auth/export/ — GDPR data export"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from chat.models import ChatSession, MoodEntry, PHQAssessment, SafetyPlan
        user = request.user

        sessions = list(
            ChatSession.objects.filter(user=user)
            .values('id', 'module_id', 'summary', 'mood_score', 'crisis_flag', 'created_at', 'ended_at')
        )
        moods = list(
            MoodEntry.objects.filter(user=user)
            .values('score', 'note', 'created_at')
        )
        assessments = list(
            PHQAssessment.objects.filter(user=user)
            .values('type', 'responses', 'total_score', 'severity', 'created_at')
        )
        try:
            sp = SafetyPlan.objects.get(user=user)
            safety_plan = {
                'warning_signs': sp.warning_signs,
                'coping_strategies': sp.coping_strategies,
                'reasons_to_live': sp.reasons_to_live,
                'support_contacts': sp.support_contacts,
                'professional_contacts': sp.professional_contacts,
                'crisis_number': sp.crisis_number,
                'environment_safety': sp.environment_safety,
                'updated_at': str(sp.updated_at),
            }
        except SafetyPlan.DoesNotExist:
            safety_plan = None

        # Make datetimes JSON-serializable
        def serialize(obj):
            import datetime
            if isinstance(obj, (datetime.datetime, datetime.date)):
                return obj.isoformat()
            return str(obj)

        import json
        export = {
            'user': {
                'email': user.email,
                'name': user.name,
                'role': user.role,
                'timezone': user.timezone,
                'created_at': str(user.created_at),
            },
            'sessions': sessions,
            'moods': moods,
            'assessments': assessments,
            'safety_plan': safety_plan,
            'exported_at': str(timezone.now()),
        }
        from django.http import HttpResponse
        content = json.dumps(export, default=serialize, indent=2)
        response = HttpResponse(content, content_type='application/json')
        response['Content-Disposition'] = 'attachment; filename="mindbridge-export.json"'
        return response


class AccountDeleteView(APIView):
    """DELETE /api/v1/auth/delete-account/"""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        user = request.user
        # Soft delete: anonymise and deactivate
        import uuid
        user.is_active = False
        user.email = f'deleted_{uuid.uuid4().hex[:8]}@deleted.invalid'
        user.name = 'Deleted User'
        user.save()
        return Response({'detail': 'Account deleted.'}, status=204)
