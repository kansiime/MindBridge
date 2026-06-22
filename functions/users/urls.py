from django.urls import path
from . import views
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os


@csrf_exempt
def create_admin(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST only'}, status=405)
    try:
        data = json.loads(request.body)
        secret = data.get('secret', '')
        if secret != os.getenv('ADMIN_SETUP_SECRET', 'mindbridge-setup-2026'):
            return JsonResponse({'error': 'Invalid secret'}, status=403)
        from users.models import User
        email = data.get('email', 'admin@mindbridge.ug')
        password = data.get('password', 'MindBridge@2026')
        name = data.get('name', 'MindBridge Admin')
        user, created = User.objects.get_or_create(
            email=email, defaults={'name': name},
        )
        user.role = 'admin'
        user.is_staff = True
        user.is_superuser = True
        user.set_password(password)
        user.save()
        return JsonResponse({
            'created': created, 'email': user.email, 'role': user.role,
            'message': 'Admin ready! Delete this endpoint after use.',
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', views.RefreshTokenView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('admin/users/', views.AdminUserListView.as_view(), name='admin_users'),
    path('admin/users/<uuid:id>/', views.AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/stats/', views.AdminStatsView.as_view(), name='admin_stats'),
    path('therapist/patients/', views.TherapistPatientListView.as_view(), name='therapist_patients'),
    path('create-admin/', create_admin, name='create_admin'),
]
