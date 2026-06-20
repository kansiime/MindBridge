from django.urls import path
from . import views

urlpatterns = [
    path('scan/', views.MoodScanView.as_view(), name='mood_scan'),
]
