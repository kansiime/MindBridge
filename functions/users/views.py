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
