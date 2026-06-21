from django.contrib import admin
from .models import TherapistProfile, TherapistApplication, PatientAssignment, HandoffEvent


@admin.register(TherapistProfile)
class TherapistProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'status', 'specializations', 'active_patient_count', 'rating', 'is_available']
    list_filter = ['status', 'is_available']
    search_fields = ['user__name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']


@admin.register(TherapistApplication)
class TherapistApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'status', 'years_experience', 'created_at']
    list_filter = ['status']
    search_fields = ['full_name', 'email']
    readonly_fields = ['created_at', 'reviewed_at']


@admin.register(PatientAssignment)
class PatientAssignmentAdmin(admin.ModelAdmin):
    list_display = ['therapist', 'patient', 'status', 'module_id', 'assigned_at']
    list_filter = ['status']


@admin.register(HandoffEvent)
class HandoffEventAdmin(admin.ModelAdmin):
    list_display = ['patient', 'therapist', 'reason', 'accepted', 'created_at']
    list_filter = ['reason', 'accepted']
