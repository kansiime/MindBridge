import uuid
from django.db import models
from users.models import User


class TherapistProfile(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending Review'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        SUSPENDED = 'suspended', 'Suspended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='therapist_profile')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    title = models.CharField(max_length=50, blank=True)
    bio = models.TextField()
    credentials = models.TextField()
    years_experience = models.PositiveSmallIntegerField(default=0)
    specializations = models.JSONField(default=list)
    whatsapp_number = models.CharField(max_length=20)
    phone_number = models.CharField(max_length=20, blank=True)
    photo_url = models.URLField(blank=True)
    working_hours = models.JSONField(default=dict)
    timezone = models.CharField(max_length=50, default='Africa/Kampala')
    max_patients = models.PositiveSmallIntegerField(default=10)
    is_available = models.BooleanField(default=True)
    total_sessions = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='approved_therapists',
    )

    class Meta:
        db_table = 'therapist_profiles'
        ordering = ['-rating', 'years_experience']

    def __str__(self):
        return f'{self.title} {self.user.name} ({self.status})'

    @property
    def full_name(self):
        return f'{self.title} {self.user.name}'.strip()

    @property
    def active_patient_count(self):
        return self.patient_assignments.filter(status='active').count()

    def is_currently_available(self):
        if not self.is_available or self.status != self.Status.APPROVED:
            return False
        if self.active_patient_count >= self.max_patients:
            return False
        try:
            import pytz
            from datetime import datetime
            tz = pytz.timezone(self.timezone)
            now = datetime.now(tz)
            day = now.strftime('%a').lower()
            hours = self.working_hours.get(day)
            if not hours:
                return False
            start = datetime.strptime(hours['start'], '%H:%M').time()
            end = datetime.strptime(hours['end'], '%H:%M').time()
            return start <= now.time() <= end
        except Exception:
            return self.is_available


class TherapistApplication(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=150)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    whatsapp_number = models.CharField(max_length=20)
    title = models.CharField(max_length=50, blank=True)
    credentials = models.TextField()
    bio = models.TextField()
    years_experience = models.PositiveSmallIntegerField(default=0)
    specializations = models.JSONField(default=list)
    motivation = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')],
        default='pending',
    )
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    review_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'therapist_applications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.full_name} ({self.status})'


class PatientAssignment(models.Model):

    class Status(models.TextChoices):
        ACTIVE = 'active', 'Active'
        COMPLETED = 'completed', 'Completed'
        DECLINED = 'declined', 'Declined'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE, related_name='patient_assignments')
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='therapist_assignments')
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    module_id = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'patient_assignments'
        ordering = ['-assigned_at']

    def __str__(self):
        return f'{self.therapist.full_name} → {self.patient.email}'


class HandoffEvent(models.Model):

    class Reason(models.TextChoices):
        CRISIS = 'crisis', 'Crisis Keywords'
        DISTRESS = 'distress', 'High Distress'
        USER_REQUEST = 'user_request', 'User Requested'
        REPEATED_HOPELESSNESS = 'repeated_hopelessness', 'Repeated Hopelessness'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='handoff_events')
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True)
    reason = models.CharField(max_length=30, choices=Reason.choices)
    trigger_text = models.TextField(blank=True)
    accepted = models.BooleanField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'handoff_events'
        ordering = ['-created_at']


class ConnectionRequest(models.Model):

    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACCEPTED = 'accepted', 'Accepted'
        DECLINED = 'declined', 'Declined'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='connection_requests_sent')
    therapist = models.ForeignKey(TherapistProfile, on_delete=models.CASCADE, related_name='connection_requests')
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'connection_requests'
        ordering = ['-created_at']
        unique_together = [['patient', 'therapist']]

    def __str__(self):
        return f'{self.patient.email} → {self.therapist.full_name} ({self.status})'


class DirectMessage(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    connection = models.ForeignKey(ConnectionRequest, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='direct_messages_sent')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'direct_messages'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.sender.email}: {self.content[:40]}'
