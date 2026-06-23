from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('therapists', '0004_clinicalnote_appointment'),
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(choices=[('view_patient','Viewed patient data'),('view_session','Viewed session'),('view_moods','Viewed mood data'),('create_note','Created clinical note'),('update_note','Updated clinical note'),('resolve_flag','Resolved risk flag'),('view_outcomes','Viewed patient outcomes')], max_length=50)),
                ('detail', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('therapist', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='audit_logs', to='users.user')),
                ('patient', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='access_logs', to='users.user')),
            ],
            options={'db_table': 'audit_logs', 'ordering': ['-created_at']},
        ),
    ]
