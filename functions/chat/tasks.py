import anthropic
from celery import shared_task
from django.conf import settings


@shared_task(bind=True, max_retries=3)
def summarise_session_task(self, session_id: str):
    """Auto-summarise a session after every 10 messages."""
    try:
        from .models import ChatSession, Message

        session = ChatSession.objects.get(id=session_id)
        messages = list(
            Message.objects.filter(session=session)
            .exclude(role='system')
            .order_by('created_at')
            .values('role', 'content')
        )
        if len(messages) < 3:
            return

        transcript = '\n'.join(
            f'{"User" if m["role"] == "user" else "MindBridge"}: {m["content"]}'
            for m in messages
        )

        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        result = client.messages.create(
            model='claude-sonnet-4-20250514',
            max_tokens=300,
            messages=[{
                'role': 'user',
                'content': (
                    'Summarise this mental health support session in 2-3 sentences. '
                    'Focus on: main concern, techniques used, end state. '
                    f'Be clinical but compassionate.\n\n{transcript}'
                ),
            }],
        )
        session.summary = result.content[0].text
        session.save(update_fields=['summary'])
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=2)
def ingest_knowledge_task(self, chunks: list):
    """Background task to ingest knowledge chunks into pgvector."""
    try:
        from .rag import ingest_knowledge
        return ingest_knowledge(chunks)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
