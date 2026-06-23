from rest_framework import serializers
from .models import TherapistProfile, TherapistApplication, PatientAssignment, ConnectionRequest, DirectMessage, ClinicalNote, Appointment


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


class DirectMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = DirectMessage
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'is_mine', 'content', 'created_at']
        read_only_fields = ['id', 'sender', 'created_at']

    def get_sender_name(self, obj):
        return obj.sender.name or obj.sender.email.split('@')[0]

    def get_sender_role(self, obj):
        return obj.sender.role

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return bool(request and obj.sender_id == request.user.id)


class ConnectionRequestSerializer(serializers.ModelSerializer):
    therapist = TherapistProfileSerializer(read_only=True)
    therapist_id = serializers.UUIDField(write_only=True)
    patient_name = serializers.SerializerMethodField()
    patient_email = serializers.SerializerMethodField()
    messages = DirectMessageSerializer(many=True, read_only=True)

    class Meta:
        model = ConnectionRequest
        fields = [
            'id', 'therapist', 'therapist_id', 'patient_name', 'patient_email',
            'message', 'status', 'created_at', 'responded_at', 'messages',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'responded_at']

    def get_patient_name(self, obj):
        return obj.patient.name or obj.patient.email.split('@')[0]

    def get_patient_email(self, obj):
        return obj.patient.email

    def create(self, validated_data):
        therapist_id = validated_data.pop('therapist_id')
        therapist = TherapistProfile.objects.get(id=therapist_id)
        return ConnectionRequest.objects.create(therapist=therapist, **validated_data)


class ClinicalNoteSerializer(serializers.ModelSerializer):
    therapist_name = serializers.SerializerMethodField()

    class Meta:
        model = ClinicalNote
        fields = [
            'id', 'patient', 'therapist_name', 'session_date',
            'subjective', 'objective', 'assessment', 'plan',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_therapist_name(self, obj):
        return obj.therapist.full_name


class AppointmentSerializer(serializers.ModelSerializer):
    therapist_name = serializers.SerializerMethodField()
    patient_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            'id', 'therapist', 'patient', 'therapist_name', 'patient_name',
            'appointment_type', 'scheduled_at', 'duration_minutes', 'status',
            'patient_notes', 'therapist_notes', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_therapist_name(self, obj):
        return obj.therapist.full_name

    def get_patient_name(self, obj):
        return obj.patient.name or obj.patient.email
