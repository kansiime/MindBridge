from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView


def welcome(request):
    return JsonResponse({
        'name':    'MindBridge API',
        'version': '1.0.0',
        'status':  'live',
        'message': 'Welcome to MindBridge — AI-powered mental wellness companion 🧠',
        'docs':    '/api/v1/docs/',
        'endpoints': {
            'auth':    '/api/v1/auth/',
            'chat':    '/api/v1/chat/',
            'modules': '/api/v1/modules/',
            'scanner': '/api/v1/scanner/',
        },
    })


urlpatterns = [
    path('',           welcome,                                                   name='welcome'),
    path('admin/',     admin.site.urls),
    path('api/v1/auth/',    include('users.urls')),
    path('api/v1/chat/',    include('chat.urls')),
    path('api/v1/modules/', include('modules.urls')),
    path('api/v1/scanner/', include('scanner.urls')),
    path('api/v1/schema/',     SpectacularAPIView.as_view(),                      name='schema'),
    path('api/v1/docs/',       SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/docs/redoc/', SpectacularRedocView.as_view(url_name='schema'),   name='redoc'),
]
