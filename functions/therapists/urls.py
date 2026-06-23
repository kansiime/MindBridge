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

    # Therapist self-service profile
    path('profile/', views.TherapistProfileUpdateView.as_view(), name='therapist_profile_update'),

    # Connection requests & direct messaging
    path('connections/', views.ConnectionRequestListCreateView.as_view(), name='connections'),
    path('connections/<uuid:pk>/respond/', views.ConnectionRequestRespondView.as_view(), name='connection_respond'),
    path('connections/<uuid:pk>/messages/', views.DirectMessageListCreateView.as_view(), name='direct_messages'),

    # Clinical notes, risk, outcomes, appointments
    path('notes/', views.ClinicalNoteListCreateView.as_view(), name='clinical_notes'),
    path('notes/<uuid:pk>/', views.ClinicalNoteDetailView.as_view(), name='clinical_note_detail'),
    path('risk-flags/', views.TherapistRiskFlagsView.as_view(), name='risk_flags'),
    path('risk-flags/<uuid:pk>/resolve/', views.TherapistRiskFlagsView.as_view(), name='risk_flag_resolve'),
    path('outcomes/<uuid:patient_id>/', views.PatientOutcomesView.as_view(), name='patient_outcomes'),
    path('appointments/', views.AppointmentListCreateView.as_view(), name='appointments'),
    path('appointments/<uuid:pk>/', views.AppointmentUpdateView.as_view(), name='appointment_update'),

    # Admin
    path('admin/applications/', views.AdminApplicationListView.as_view(), name='admin_applications'),
    path('admin/applications/<uuid:pk>/review/', views.AdminApplicationReviewView.as_view(), name='admin_review'),

    # Audit log
    path('audit-log/', views.AuditLogView.as_view(), name='audit_log'),
]
