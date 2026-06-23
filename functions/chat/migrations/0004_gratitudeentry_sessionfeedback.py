from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0003_safetyplan_phqassessment'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='GratitudeEntry',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('items', models.JSONField(default=list)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='gratitude_entries', to='users.user')),
            ],
            options={'db_table': 'gratitude_entries', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='SessionFeedback',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('rating', models.PositiveSmallIntegerField()),
                ('comment', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='feedback', to='chat.chatsession')),
            ],
            options={'db_table': 'session_feedback'},
        ),
    ]
