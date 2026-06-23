from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('therapists', '0003_connectionrequest_directmessage'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClinicalNote',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('session_date', models.DateField()),
                ('subjective', models.TextField(blank=True)),
                ('objective', models.TextField(blank=True)),
                ('assessment', models.TextField(blank=True)),
                ('plan', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='clinical_notes', to='users.user')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='clinical_notes', to='therapists.therapistprofile')),
            ],
            options={'db_table': 'clinical_notes', 'ordering': ['-session_date']},
        ),
        migrations.CreateModel(
            name='Appointment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('appointment_type', models.CharField(choices=[('video', 'Video Call'), ('phone', 'Phone Call'), ('inapp', 'In-App Chat')], default='inapp', max_length=20)),
                ('scheduled_at', models.DateTimeField()),
                ('duration_minutes', models.PositiveSmallIntegerField(default=50)),
                ('status', models.CharField(choices=[('scheduled', 'Scheduled'), ('completed', 'Completed'), ('cancelled', 'Cancelled'), ('no_show', 'No Show')], default='scheduled', max_length=20)),
                ('patient_notes', models.TextField(blank=True)),
                ('therapist_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appointments', to='users.user')),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appointments', to='therapists.therapistprofile')),
            ],
            options={'db_table': 'appointments', 'ordering': ['scheduled_at']},
        ),
    ]
