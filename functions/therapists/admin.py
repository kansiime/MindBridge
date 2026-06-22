import secrets
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.contrib import messages
from .models import TherapistProfile, TherapistApplication, PatientAssignment, HandoffEvent


@admin.register(TherapistApplication)
class TherapistApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone', 'status', 'specializations', 'created_at', 'approve_action']
    list_filter = ['status']
    search_fields = ['full_name', 'email']
    readonly_fields = ['created_at', 'reviewed_at', 'credentials_display']
    actions = ['approve_selected']

    def credentials_display(self, obj):
        return obj.credentials
    credentials_display.short_description = 'Credentials'

    def approve_action(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a class="button" style="background:#7C3AED;color:white;'
                'padding:4px 12px;border-radius:4px;text-decoration:none" '
                'href="/admin/therapists/therapistapplication/{}/approve/"'
                '>Approve</a>',
                obj.id
            )
        elif obj.status == 'approved':
            return format_html('<span style="color:#10B981;font-weight:bold">✓ Approved</span>')
        return format_html('<span style="color:#EF4444">✗ Rejected</span>')
    approve_action.short_description = 'Action'

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        custom = [
            path('<uuid:pk>/approve/', self.admin_site.admin_view(self.approve_view), name='approve_therapist'),
        ]
        return custom + urls

    def approve_view(self, request, pk):
        from django.shortcuts import redirect
        from users.models import User
        try:
            app = TherapistApplication.objects.get(id=pk)
            if app.status == 'approved':
                messages.warning(request, f'{app.full_name} is already approved.')
                return redirect('/admin/therapists/therapistapplication/')

            # Create user account
            temp_password = f'MB{secrets.token_urlsafe(8)}'
            user, created = User.objects.get_or_create(
                email=app.email,
                defaults={'name': app.full_name, 'role': 'therapist', 'is_active': True},
            )
            if created:
                user.set_password(temp_password)
                user.role = 'therapist'
                user.save()
            else:
                temp_password = '[user already exists — reset password manually]'

            # Create therapist profile
            from .models import TherapistProfile
            TherapistProfile.objects.get_or_create(
                user=user,
                defaults={
                    'bio': app.bio,
                    'credentials': app.credentials,
                    'years_experience': app.years_experience,
                    'specializations': app.specializations,
                    'whatsapp_number': app.whatsapp_number,
                    'phone_number': app.phone,
                    'title': app.title,
                    'status': TherapistProfile.Status.APPROVED,
                    'approved_by': request.user,
                    'approved_at': timezone.now(),
                    'working_hours': {
                        'mon': {'start': '09:00', 'end': '17:00'},
                        'tue': {'start': '09:00', 'end': '17:00'},
                        'wed': {'start': '09:00', 'end': '17:00'},
                        'thu': {'start': '09:00', 'end': '17:00'},
                        'fri': {'start': '09:00', 'end': '17:00'},
                    },
                },
            )

            # Update application status
            app.status = 'approved'
            app.reviewed_by = request.user
            app.reviewed_at = timezone.now()
            app.review_notes = f'Approved by {request.user.email}'
            app.save()

            # Show credentials prominently
            messages.success(
                request,
                format_html(
                    '<div style="font-size:15px;line-height:2">'
                    '<strong style="color:#10B981">✓ {name} approved!</strong><br>'
                    '<strong>Login URL:</strong> mindbridge-frontend-18an.onrender.com<br>'
                    '<strong>Email:</strong> {email}<br>'
                    '<strong>Temporary Password:</strong> '
                    '<code style="background:#1E1B4B;color:#2DD4BF;'
                    'padding:4px 10px;border-radius:4px">{pwd}</code><br>'
                    '<strong>WhatsApp:</strong> {wa}<br><br>'
                    '<span style="color:#F97316">⚠ Share these credentials with the therapist via WhatsApp or phone. '
                    'They should change their password after first login.</span>'
                    '</div>',
                    name=app.full_name,
                    email=app.email,
                    pwd=temp_password,
                    wa=app.whatsapp_number,
                )
            )

        except TherapistApplication.DoesNotExist:
            messages.error(request, 'Application not found.')

        return redirect('/admin/therapists/therapistapplication/')

    def approve_selected(self, request, queryset):
        for app in queryset.filter(status='pending'):
            self.approve_view(request, app.id)
    approve_selected.short_description = 'Approve selected applications'


@admin.register(TherapistProfile)
class TherapistProfileAdmin(admin.ModelAdmin):
    list_display = [
        'full_name',
        'status',
        'specializations',
        'active_patient_count',
        'rating',
        'is_available',
        'whatsapp_number']
    list_filter = ['status', 'is_available']
    search_fields = ['user__name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'approved_at', 'active_patient_count']

    def reset_password(self, request, queryset):
        for profile in queryset:
            new_pwd = f'MB{secrets.token_urlsafe(8)}'
            profile.user.set_password(new_pwd)
            profile.user.save()
            messages.success(
                request,
                format_html(
                    'Password reset for <strong>{}</strong>: '
                    '<code style="background:#1E1B4B;color:#2DD4BF;padding:2px 8px;border-radius:4px">{}</code>',
                    profile.full_name, new_pwd
                )
            )
    reset_password.short_description = 'Reset password (shows new password)'

    actions = ['reset_password']


@admin.register(PatientAssignment)
class PatientAssignmentAdmin(admin.ModelAdmin):
    list_display = ['therapist', 'patient', 'status', 'module_id', 'assigned_at']
    list_filter = ['status']


@admin.register(HandoffEvent)
class HandoffEventAdmin(admin.ModelAdmin):
    list_display = ['patient', 'therapist', 'reason', 'accepted', 'created_at']
    list_filter = ['reason', 'accepted']
