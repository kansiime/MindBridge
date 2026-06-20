from django.contrib import admin

from .models import ChatSession, Message, MoodEntry, CrisisFlag


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ['user', 'module_id', 'mood_label', 'crisis_flag', 'created_at']
    list_filter = ['module_id', 'crisis_flag', 'mood_label']
    search_fields = ['user__email', 'summary']
    ordering = ['-created_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['session', 'role', 'created_at']
    list_filter = ['role']


@admin.register(MoodEntry)
class MoodEntryAdmin(admin.ModelAdmin):
    list_display = ['user', 'mood', 'score', 'source', 'created_at']
    list_filter = ['mood', 'source']


@admin.register(CrisisFlag)
class CrisisFlagAdmin(admin.ModelAdmin):
    list_display = ['user', 'severity', 'resolved', 'created_at']
    list_filter = ['resolved', 'severity']
