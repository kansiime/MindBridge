from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0002_initial'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='SafetyPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('warning_signs', models.JSONField(default=list)),
                ('coping_strategies', models.JSONField(default=list)),
                ('reasons_to_live', models.JSONField(default=list)),
                ('support_contacts', models.JSONField(default=list)),
                ('professional_contacts', models.JSONField(default=list)),
                ('crisis_number', models.CharField(default='+256787671827', max_length=50)),
                ('environment_safety', models.TextField(blank=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='safety_plan', to='users.user')),
            ],
            options={'db_table': 'safety_plans'},
        ),
        migrations.CreateModel(
            name='PHQAssessment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('type', models.CharField(choices=[('phq9', 'PHQ-9 Depression'), ('gad7', 'GAD-7 Anxiety'), ('onboarding', 'Onboarding')], max_length=20)),
                ('responses', models.JSONField(default=dict)),
                ('total_score', models.PositiveSmallIntegerField(default=0)),
                ('severity', models.CharField(blank=True, max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assessments', to='users.user')),
            ],
            options={'db_table': 'phq_assessments', 'ordering': ['-created_at']},
        ),
    ]
