from rest_framework import serializers

from .models import ChatSession, Message, MoodEntry, CrisisFlag


class MessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = ['id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):

    message_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            'id', 'module_id', 'title', 'mood_label', 'mood_score',
            'summary', 'tags', 'crisis_flag', 'ended_at', 'created_at', 'message_count',
        ]
        read_only_fields = ['id', 'crisis_flag', 'summary', 'created_at']


class ChatSessionCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = ChatSession
        fields = ['module_id', 'mood_label']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class ChatSessionDetailSerializer(serializers.ModelSerializer):

    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = ChatSession
        fields = [
            'id', 'module_id', 'title', 'mood_label', 'mood_score',
            'summary', 'tags', 'crisis_flag', 'ended_at', 'created_at', 'messages',
        ]


class MoodEntrySerializer(serializers.ModelSerializer):

    class Meta:
        model = MoodEntry
        fields = ['id', 'mood', 'score', 'note', 'source', 'session', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class CrisisFlagSerializer(serializers.ModelSerializer):

    class Meta:
        model = CrisisFlag
        fields = ['id', 'session', 'severity', 'trigger_text', 'resolved', 'resolved_at', 'created_at']
        read_only_fields = ['id', 'created_at']
