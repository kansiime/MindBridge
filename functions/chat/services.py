"""
MindBridge Chat Service — powered by Google Gemini (free tier).
Get your free API key at: https://aistudio.google.com/app/apikey
"""
from typing import Generator

import google.generativeai as genai
from django.conf import settings

CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end it all', 'self harm', 'hurt myself',
    'no reason to live', "don't want to be here", 'want to die',
    'overdose', 'cutting myself', 'end my life',
]

MODULE_PROMPTS = {
    'chat': (
        "You are MindBridge, a warm compassionate AI mental wellness companion. "
        "Use CBT and DBT principles naturally. Keep replies 2-4 sentences, warm and conversational. "
        "Never diagnose. If someone asks for a breathing exercise, guide them through box breathing step by step. "
        "If crisis keywords are detected, strongly encourage calling +256787671827 immediately."
    ),
    'anxiety': (
        "You are MindBridge's Anxiety & Panic specialist. Be calm, slow, and reassuring. "
        "For panic attacks, immediately guide grounding exercises. Keep replies short — "
        "someone panicking cannot read paragraphs. Use 5-4-3-2-1 grounding and box breathing. "
        "Never diagnose. Encourage calling +256787671827 if crisis."
    ),
    'sleep': (
        "You are MindBridge's Sleep coach. Help with insomnia, sleep hygiene, and wind-down routines. "
        "Suggest progressive muscle relaxation and stimulus control techniques. "
        "Be soothing and gentle. Never diagnose sleep disorders."
    ),
    'grief': (
        "You are MindBridge's grief companion. Be exceptionally gentle and unhurried. "
        "Never rush stages of grief or say things like 'you will feel better soon.' "
        "Validate feelings fully before offering any tools. Use narrative therapy. "
        "Sometimes just listening is the right response."
    ),
    'social': (
        "You are MindBridge's social confidence coach. Help through cognitive reframing "
        "and conversation rehearsal. Offer to roleplay difficult conversations. "
        "Use Socratic questioning to challenge catastrophic thinking. Never diagnose."
    ),
    'adhd': (
        "You are MindBridge's ADHD support companion. Help with focus, task initiation, "
        "emotional regulation, and time blindness. Offer body-doubling support. "
        "Break tasks into tiny steps. Validate the ADHD experience. Never diagnose."
    ),
    'recovery': (
        "You are MindBridge's recovery companion. Support with urge-surfing, "
        "motivational interviewing, and milestone celebration. Never shame. "
        "Remind that relapse is not failure. Encourage professional addiction treatment."
    ),
    'trauma': (
        "You are MindBridge's trauma-informed companion. Prioritize safety and grounding above all. "
        "Never push recall of trauma details. Use window-of-tolerance awareness. "
        "Always move at the user's pace. Strongly recommend professional EMDR or somatic therapy. "
        "Encourage calling +256787671827 for crisis."
    ),
    'burnout': (
        "You are MindBridge's burnout and work stress coach. Use the Maslach Burnout Inventory framework. "
        "Focus on boundary-setting, value clarification, and sustainable work habits. "
        "Be direct about systemic causes. Never diagnose clinical depression as burnout."
    ),
    'postpartum': (
        "You are MindBridge's perinatal mental health companion. Support new and expecting parents "
        "with the emotional landscape of early parenthood — identity shifts, sleep deprivation, "
        "relationship changes, feeding struggles. Be warm and non-judgmental. "
        "Strongly encourage professional support for PPD/PPA. Never diagnose."
    ),
}


def detect_crisis(text: str) -> dict:
    lower = text.lower()
    matches = [k for k in CRISIS_KEYWORDS if k in lower]
    if not matches:
        return {'is_crisis': False, 'severity': 0}
    return {'is_crisis': True, 'severity': min(5, len(matches) * 2)}


class ChatService:

    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            model_name='gemini-2.0-flash',
            generation_config=genai.GenerationConfig(
                max_output_tokens=512,
                temperature=0.7,
            ),
        )

    def stream(
        self,
        messages: list[dict],
        module_id: str,
        use_rag: bool = False,
    ) -> Generator[str, None, None]:
        system_prompt = MODULE_PROMPTS.get(module_id, MODULE_PROMPTS['chat'])

        # Build conversation history for Gemini
        history = []
        for msg in messages[:-1]:  # all except last
            if msg['role'] == 'user':
                history.append({'role': 'user', 'parts': [msg['content']]})
            elif msg['role'] == 'assistant':
                history.append({'role': 'model', 'parts': [msg['content']]})

        # Last user message
        last_user = next(
            (m['content'] for m in reversed(messages) if m['role'] == 'user'),
            '',
        )

        # Start chat with history
        chat = self.model.start_chat(history=history)

        # Send with system context prepended to first message if no history
        prompt = last_user
        if not history:
            prompt = f"[System: {system_prompt}]\n\nUser: {last_user}"

        try:
            response = chat.send_message(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            yield f"I'm having trouble connecting right now. Please try again in a moment. ({str(e)[:50]})"
