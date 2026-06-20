from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions


MODULE_CONFIG = [
    {
        'id': 'chat',
        'icon': '✦',
        'label': 'Daily Check-In',
        'color': '#7C3AED',
        'tag': 'Core',
        'desc': "Talk through how you're feeling right now",
    },
    {
        'id': 'anxiety',
        'icon': '⚡',
        'label': 'Anxiety & Panic',
        'color': '#F97316',
        'tag': 'Acute',
        'desc': 'Grounding exercises & panic attack support',
    },
    {
        'id': 'sleep',
        'icon': '🌙',
        'label': 'Sleep & Insomnia',
        'color': '#818CF8',
        'tag': 'Daily',
        'desc': 'Wind-down routines & sleep quality tracking',
    },
    {
        'id': 'grief',
        'icon': '🕊',
        'label': 'Grief & Loss',
        'color': '#94A3B8',
        'tag': 'Journey',
        'desc': 'Gentle space to process loss at your pace',
    },
    {
        'id': 'social',
        'icon': '💬',
        'label': 'Social Anxiety',
        'color': '#EC4899',
        'tag': 'Skills',
        'desc': 'Rehearse hard conversations with AI roleplay',
    },
    {
        'id': 'adhd',
        'icon': '🎯',
        'label': 'ADHD Support',
        'color': '#F59E0B',
        'tag': 'Focus',
        'desc': 'Focus sessions, task breakdown & body doubling',
    },
    {
        'id': 'recovery',
        'icon': '🌱',
        'label': 'Addiction & Recovery',
        'color': '#10B981',
        'tag': 'Recovery',
        'desc': 'Daily sobriety check-ins & craving tools',
    },
    {
        'id': 'trauma',
        'icon': '🛡',
        'label': 'Trauma & PTSD',
        'color': '#6366F1',
        'tag': 'Sensitive',
        'desc': 'Grounding-first, safety-aware trauma support',
    },
    {
        'id': 'burnout',
        'icon': '🔥',
        'label': 'Burnout & Stress',
        'color': '#EF4444',
        'tag': 'Work',
        'desc': 'Burnout assessment & boundary-setting tools',
    },
    {
        'id': 'postpartum',
        'icon': '🌸',
        'label': 'Postpartum Wellness',
        'color': '#F0ABFC',
        'tag': 'Perinatal',
        'desc': 'Support for new parents navigating big changes',
    },
]


class ModuleListView(APIView):
    """GET /api/v1/modules/ — list all mental health modules"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'modules': MODULE_CONFIG, 'count': len(MODULE_CONFIG)})


class ModuleDetailView(APIView):
    """GET /api/v1/modules/<module_id>/ — single module config"""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, module_id):
        mod = next((m for m in MODULE_CONFIG if m['id'] == module_id), None)
        if not mod:
            return Response({'error': 'Module not found.'}, status=404)
        return Response(mod)
