from django.urls import path
from . import views

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
]
