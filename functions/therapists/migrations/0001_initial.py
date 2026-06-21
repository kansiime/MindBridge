from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TherapistApplication',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('full_name', models.CharField(max_length=150)),
                ('email', models.EmailField(unique=True)),
                ('phone', models.CharField(max_length=20)),
                ('whatsapp_number', models.CharField(max_length=20)),
                ('title', models.CharField(blank=True, max_length=50)),
                ('credentials', models.TextField()),
                ('bio', models.TextField()),
                ('years_experience', models.PositiveSmallIntegerField(default=0)),
                ('specializations', models.JSONField(default=list)),
                ('motivation', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('review_notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='users.user')),
            ],
            options={'db_table': 'therapist_applications', 'ordering': ['-created_at']},
        ),
        migrations.CreateModel(
            name='TherapistProfile',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected'), ('suspended', 'Suspended')], default='pending', max_length=20)),
                ('title', models.CharField(blank=True, max_length=50)),
                ('bio', models.TextField()),
                ('credentials', models.TextField()),
                ('years_experience', models.PositiveSmallIntegerField(default=0)),
                ('specializations', models.JSONField(default=list)),
                ('whatsapp_number', models.CharField(max_length=20)),
                ('phone_number', models.CharField(blank=True, max_length=20)),
                ('photo_url', models.URLField(blank=True)),
                ('working_hours', models.JSONField(default=dict)),
                ('timezone', models.CharField(default='Africa/Kampala', max_length=50)),
                ('max_patients', models.PositiveSmallIntegerField(default=10)),
                ('is_available', models.BooleanField(default=True)),
                ('total_sessions', models.PositiveIntegerField(default=0)),
                ('rating', models.DecimalField(decimal_places=2, default=5.0, max_digits=3)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='approved_therapists', to='users.user')),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='therapist_profile', to='users.user')),
            ],
            options={'db_table': 'therapist_profiles', 'ordering': ['-rating', 'years_experience']},
        ),
        migrations.CreateModel(
            name='PatientAssignment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('completed', 'Completed'), ('declined', 'Declined')], default='active', max_length=20)),
                ('module_id', models.CharField(blank=True, max_length=20)),
                ('notes', models.TextField(blank=True)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('ended_at', models.DateTimeField(blank=True, null=True)),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='patient_assignments', to='therapists.therapistprofile')),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='therapist_assignments', to='users.user')),
            ],
            options={'db_table': 'patient_assignments', 'ordering': ['-assigned_at']},
        ),
        migrations.CreateModel(
            name='HandoffEvent',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('session_id', models.CharField(blank=True, max_length=100)),
                ('reason', models.CharField(choices=[('crisis', 'Crisis Keywords'), ('distress', 'High Distress'), ('user_request', 'User Requested'), ('repeated_hopelessness', 'Repeated Hopelessness')], max_length=30)),
                ('trigger_text', models.TextField(blank=True)),
                ('accepted', models.BooleanField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='handoff_events', to='users.user')),
                ('therapist', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='therapists.therapistprofile')),
            ],
            options={'db_table': 'handoff_events', 'ordering': ['-created_at']},
        ),
    ]
