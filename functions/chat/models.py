import uuid

from django.db import models

from users.models import User


class ChatSession(models.Model):

    class ModuleId(models.TextChoices):
        CHAT = 'chat', 'Daily Check-In'
        ANXIETY = 'anxiety', 'Anxiety & Panic'
        SLEEP = 'sleep', 'Sleep & Insomnia'
        GRIEF = 'grief', 'Grief & Loss'
        SOCIAL = 'social', 'Social Anxiety'
        ADHD = 'adhd', 'ADHD Support'
        RECOVERY = 'recovery', 'Addiction & Recovery'
        TRAUMA = 'trauma', 'Trauma & PTSD'
        BURNOUT = 'burnout', 'Burnout & Stress'
        POSTPARTUM = 'postpartum', 'Postpartum Wellness'

    class MoodLabel(models.TextChoices):
        HAPPY = 'happy', 'Happy'
        SAD = 'sad', 'Sad'
        ANGRY = 'angry', 'Angry'
        ANXIOUS = 'anxious', 'Anxious'
        TIRED = 'tired', 'Tired'
        NEUTRAL = 'neutral', 'Neutral'
        STRESSED = 'stressed', 'Stressed'
        OVERWHELMED = 'overwhelmed', 'Overwhelmed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='chat_sessions')
    module_id = models.CharField(max_length=20, choices=ModuleId.choices)
    title = models.CharField(max_length=200, blank=True)
    mood_label = models.CharField(max_length=20, choices=MoodLabel.choices, blank=True)
    mood_score = models.PositiveSmallIntegerField(null=True, blank=True)
    summary = models.TextField(blank=True)
    tags = models.JSONField(default=list)
    crisis_flag = models.BooleanField(default=False)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['module_id']),
        ]

    def __str__(self):
        return f'{self.user.email} — {self.module_id} ({self.created_at.date()})'


class Message(models.Model):

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [models.Index(fields=['session', 'created_at'])]

    def __str__(self):
        return f'[{self.role}] {self.content[:60]}'


class MoodEntry(models.Model):

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        SCAN = 'scan', 'Face Scan'
        AI_DETECTED = 'ai_detected', 'AI Detected'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='mood_entries')
    mood = models.CharField(max_length=20, choices=ChatSession.MoodLabel.choices)
    score = models.PositiveSmallIntegerField(null=True, blank=True)
    note = models.TextField(blank=True)
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.MANUAL)
    session = models.ForeignKey(ChatSession, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'mood_entries'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['user', '-created_at'])]


class CrisisFlag(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='crisis_flags')
    session = models.ForeignKey(ChatSession, on_delete=models.SET_NULL, null=True, blank=True)
    severity = models.PositiveSmallIntegerField(default=1)
    trigger_text = models.TextField(blank=True)
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='resolved_flags',
    )
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'crisis_flags'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['resolved', '-created_at'])]


class SafetyPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='safety_plan')
    warning_signs = models.JSONField(default=list)
    coping_strategies = models.JSONField(default=list)
    reasons_to_live = models.JSONField(default=list)
    support_contacts = models.JSONField(default=list)
    professional_contacts = models.JSONField(default=list)
    crisis_number = models.CharField(max_length=50, default='+256787671827')
    environment_safety = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'safety_plans'


class PHQAssessment(models.Model):
    class Type(models.TextChoices):
        PHQ9 = 'phq9', 'PHQ-9 Depression'
        GAD7 = 'gad7', 'GAD-7 Anxiety'
        ONBOARDING = 'onboarding', 'Onboarding'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assessments')
    type = models.CharField(max_length=20, choices=Type.choices)
    responses = models.JSONField(default=dict)
    total_score = models.PositiveSmallIntegerField(default=0)
    severity = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'phq_assessments'
        ordering = ['-created_at']
