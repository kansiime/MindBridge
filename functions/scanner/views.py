import json

import anthropic
from django.conf import settings
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import MoodEntry

SCAN_SYSTEM = (
    "You are a compassionate facial mood analysis AI for MindBridge. "
    "Respond ONLY with valid JSON — no extra text, no markdown. "
    '{"mood":"happy","confidence":85,"observations":["relaxed brow","slight smile"],'
    '"message":"Warm one-sentence reflection","suggestedModule":"chat"} '
    "mood: happy|sad|angry|anxious|tired|neutral|stressed|overwhelmed "
    "confidence: 0-100 "
    "observations: 2-4 brief facial cues "
    "suggestedModule: chat|anxiety|sleep|grief|social|adhd|recovery|trauma|burnout|postpartum"
)


class MoodScanView(APIView):
    """
    POST /api/v1/scanner/scan/
    Body: { "image_base64": "<base64 jpeg>" }
    Returns mood analysis from Claude Vision.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.ENABLE_FACE_SCAN:
            return Response(
                {'error': 'Face scan is disabled.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        image_b64 = request.data.get('image_base64', '').strip()
        if not image_b64 or len(image_b64) < 100:
            return Response(
                {'error': 'image_base64 is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            response = client.messages.create(
                model='claude-sonnet-4-20250514',
                max_tokens=500,
                system=SCAN_SYSTEM,
                messages=[{
                    'role': 'user',
                    'content': [
                        {
                            'type': 'image',
                            'source': {
                                'type': 'base64',
                                'media_type': 'image/jpeg',
                                'data': image_b64,
                            },
                        },
                        {
                            'type': 'text',
                            'text': "Analyse this person's mood from their facial expression.",
                        },
                    ],
                }],
            )

            raw = response.content[0].text
            result = json.loads(raw.replace('```json', '').replace('```', '').strip())

            MoodEntry.objects.create(
                user=request.user,
                mood=result['mood'],
                score=result.get('confidence'),
                source=MoodEntry.Source.SCAN,
            )

            return Response(result)

        except json.JSONDecodeError:
            return Response(
                {'error': 'Could not parse AI response. Try a clearer photo.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
