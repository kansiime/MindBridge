import secrets
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.contrib import messages
from .models import TherapistProfile, TherapistApplication, PatientAssignment, HandoffEvent


def do_approve(request, app):
    from users.models import User

    if app.status == 'approved':
        messages.warning(request, app.full_name + ' is already approved.')
        return

    temp_password = 'MB' + secrets.token_urlsafe(8)

    user, created = User.objects.get_or_create(
        email=app.email,
        defaults={'name': app.full_name, 'role': 'therapist', 'is_active': True},
    )
    if created:
        user.set_password(temp_password)
        user.role = 'therapist'
        user.save()
    else:
        temp_password = '[user exists - use Reset Password action]'

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

    app.status = 'approved'
    app.reviewed_by = request.user
    app.reviewed_at = timezone.now()
    app.review_notes = 'Approved by ' + request.user.email
    app.save()

    messages.success(
        request,
        'APPROVED: ' + app.full_name
        + ' | Email: ' + app.email
        + ' | Password: ' + temp_password
        + ' | WhatsApp: ' + app.whatsapp_number
        + ' | Share these with the therapist.',
    )


@admin.register(TherapistApplication)
class TherapistApplicationAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone', 'status', 'created_at', 'action_btn']
    list_filter = ['status']
    search_fields = ['full_name', 'email']
    readonly_fields = ['created_at', 'reviewed_at']

    def action_btn(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a href="/admin/therapists/therapistapplication/{}/approve/"'
                ' style="background:#7C3AED;color:#fff;padding:4px 12px;'
                'border-radius:4px;text-decoration:none;font-weight:bold">Approve</a>',
                obj.id,
            )
        if obj.status == 'approved':
            return format_html('<b style="color:green">Approved</b>')
        return format_html('<b style="color:red">Rejected</b>')

    action_btn.short_description = 'Action'
    action_btn.allow_tags = True

    def get_urls(self):
        from django.urls import path
        urls = super().get_urls()
        return [
            path(
                '<uuid:pk>/approve/',
                self.admin_site.admin_view(self.approve_view),
                name='approve_therapist',
            ),
        ] + urls

    def approve_view(self, request, pk):
        from django.shortcuts import redirect
        try:
            app = TherapistApplication.objects.get(id=pk)
            do_approve(request, app)
        except TherapistApplication.DoesNotExist:
            messages.error(request, 'Application not found.')
        except Exception as e:
            messages.error(request, 'Error approving: ' + str(e))
        return redirect('/admin/therapists/therapistapplication/')

    def approve_selected(self, request, queryset):
        for app in queryset.filter(status='pending'):
            do_approve(request, app)

    approve_selected.short_description = 'Approve selected'
    actions = ['approve_selected']


@admin.register(TherapistProfile)
class TherapistProfileAdmin(admin.ModelAdmin):
    list_display = ['therapist_name', 'therapist_email', 'status', 'rating', 'is_available', 'whatsapp_number']
    list_filter = ['status', 'is_available']
    search_fields = ['user__name', 'user__email']
    readonly_fields = ['created_at', 'updated_at', 'approved_at']
    actions = ['reset_password']

    def therapist_name(self, obj):
        return obj.user.name or obj.user.email
    therapist_name.short_description = 'Name'

    def therapist_email(self, obj):
        return obj.user.email
    therapist_email.short_description = 'Email'

    def reset_password(self, request, queryset):
        for profile in queryset:
            new_pwd = 'MB' + secrets.token_urlsafe(8)
            profile.user.set_password(new_pwd)
            profile.user.save()
            messages.success(
                request,
                'Password reset for ' + (profile.user.name or profile.user.email)
                + ': ' + new_pwd
                + ' | WhatsApp: ' + profile.whatsapp_number,
            )

    reset_password.short_description = 'Reset password (shows new password in message)'


@admin.register(PatientAssignment)
class PatientAssignmentAdmin(admin.ModelAdmin):
    list_display = ['therapist', 'patient', 'status', 'module_id', 'assigned_at']
    list_filter = ['status']


@admin.register(HandoffEvent)
class HandoffEventAdmin(admin.ModelAdmin):
    list_display = ['patient', 'therapist', 'reason', 'accepted', 'created_at']
    list_filter = ['reason', 'accepted']
