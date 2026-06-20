from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User, TherapistPatient


class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model = User
        fields = ['email', 'name', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            'id', 'email', 'name', 'avatar_url', 'role',
            'is_active', 'onboarded', 'timezone', 'created_at',
        ]
        read_only_fields = ['id', 'role', 'created_at']


class UserProfileUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = ['name', 'avatar_url', 'timezone', 'onboarded']


class AdminUserSerializer(serializers.ModelSerializer):
    """Full user data for admin."""

    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'role', 'is_active', 'onboarded', 'created_at', 'updated_at']

    def update(self, instance, validated_data):
        instance.role = validated_data.get('role', instance.role)
        instance.is_active = validated_data.get('is_active', instance.is_active)
        instance.save()
        return instance


class TherapistPatientSerializer(serializers.ModelSerializer):

    patient = UserSerializer(read_only=True)
    patient_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = TherapistPatient
        fields = ['id', 'patient', 'patient_id', 'notes', 'assigned_at']
        read_only_fields = ['id', 'assigned_at']

    def create(self, validated_data):
        validated_data['therapist'] = self.context['request'].user
        return super().create(validated_data)


class ChangePasswordSerializer(serializers.Serializer):

    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value
