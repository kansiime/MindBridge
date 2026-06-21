from rest_framework import serializers
from .models import TherapistProfile, TherapistApplication, PatientAssignment


class TherapistProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    active_patient_count = serializers.ReadOnlyField()
    is_currently_available = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = TherapistProfile
        fields = [
            'id', 'full_name', 'title', 'bio', 'credentials',
            'years_experience', 'specializations', 'whatsapp_number',
            'phone_number', 'photo_url', 'working_hours', 'timezone',
            'is_available', 'is_currently_available', 'rating',
            'total_sessions', 'active_patient_count', 'email',
        ]

    def get_is_currently_available(self, obj):
        return obj.is_currently_available()

    def get_email(self, obj):
        return obj.user.email


class TherapistApplicationSerializer(serializers.ModelSerializer):

    class Meta:
        model = TherapistApplication
        fields = [
            'id', 'full_name', 'email', 'phone', 'whatsapp_number',
            'title', 'credentials', 'bio', 'years_experience',
            'specializations', 'motivation', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'status', 'created_at']


class PatientAssignmentSerializer(serializers.ModelSerializer):
    therapist = TherapistProfileSerializer(read_only=True)
    patient_email = serializers.SerializerMethodField()

    class Meta:
        model = PatientAssignment
        fields = ['id', 'therapist', 'patient_email', 'status', 'module_id', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']

    def get_patient_email(self, obj):
        return obj.patient.email
