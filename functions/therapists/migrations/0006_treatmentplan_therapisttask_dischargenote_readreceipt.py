from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('therapists', '0005_auditlog'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='directmessage',
            name='read_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='TreatmentPlan',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('goals', models.JSONField(default=list)),
                ('interventions', models.JSONField(default=list)),
                ('strengths', models.TextField(blank=True)),
                ('review_date', models.DateField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='treatment_plans', to='users.user')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='treatment_plans', to='therapists.therapistprofile')),
            ],
            options={'db_table': 'treatment_plans', 'unique_together': {('therapist', 'patient')}},
        ),
        migrations.CreateModel(
            name='TherapistTask',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('due_date', models.DateField(blank=True, null=True)),
                ('completed', models.BooleanField(default=False)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tasks', to='users.user')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assigned_tasks', to='therapists.therapistprofile')),
            ],
            options={'db_table': 'therapist_tasks', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='DischargeNote',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('presenting_problem', models.TextField(blank=True)),
                ('treatment_provided', models.TextField(blank=True)),
                ('outcome', models.TextField(blank=True)),
                ('recommendations', models.TextField(blank=True)),
                ('discharge_date', models.DateField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='discharge_notes', to='users.user')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='discharge_notes', to='therapists.therapistprofile')),
            ],
            options={'db_table': 'discharge_notes', 'ordering': ['-discharge_date']},
        ),
    ]
