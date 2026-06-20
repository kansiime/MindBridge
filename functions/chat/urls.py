from django.urls import path

from . import views

urlpatterns = [
    path('sessions/', views.ChatSessionListCreateView.as_view(), name='session_list'),
    path('sessions/<uuid:pk>/', views.ChatSessionDetailView.as_view(), name='session_detail'),
    path(
        'sessions/<uuid:session_id>/messages/',
        views.ChatMessageView.as_view(),
        name='chat_message',
    ),
    path('moods/', views.MoodEntryListCreateView.as_view(), name='mood_list'),
    path('crisis/', views.CrisisFlagListView.as_view(), name='crisis_list'),
    path('crisis/<uuid:pk>/resolve/', views.CrisisFlagResolveView.as_view(), name='crisis_resolve'),
]
