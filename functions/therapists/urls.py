from django.urls import path
from . import views

urlpatterns = [
    # Public
    path('', views.TherapistDirectoryView.as_view(), name='therapist_list'),
    path('apply/', views.ApplyAsTherapistView.as_view(), name='therapist_apply'),
    path('available/', views.FindAvailableTherapistView.as_view(), name='therapist_available'),
    path('check-handoff/', views.CheckHandoffView.as_view(), name='check_handoff'),
    path('portal/', views.TherapistPortalView.as_view(), name='therapist_portal'),
    path('<uuid:pk>/', views.TherapistDetailView.as_view(), name='therapist_detail'),

    # Connection requests & direct messaging
    path('connections/', views.ConnectionRequestListCreateView.as_view(), name='connections'),
    path('connections/<uuid:pk>/respond/', views.ConnectionRequestRespondView.as_view(), name='connection_respond'),
    path('connections/<uuid:pk>/messages/', views.DirectMessageListCreateView.as_view(), name='direct_messages'),

    # Admin
    path('admin/applications/', views.AdminApplicationListView.as_view(), name='admin_applications'),
    path('admin/applications/<uuid:pk>/review/', views.AdminApplicationReviewView.as_view(), name='admin_review'),
]
