from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin users."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')


class IsTherapistOrAdmin(BasePermission):
    """Therapists and admins."""

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role in ('therapist', 'admin')
        )


class IsOwnerOrAdmin(BasePermission):
    """Object owner or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        owner = getattr(obj, 'user', getattr(obj, 'owner', None))
        return owner == request.user


class IsOwnerTherapistOrAdmin(BasePermission):
    """Object owner, their therapist, or admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        owner = getattr(obj, 'user', None)
        if owner == request.user:
            return True
        if request.user.role == 'therapist':
            from users.models import TherapistPatient
            return TherapistPatient.objects.filter(
                therapist=request.user, patient=owner
            ).exists()
        return False
