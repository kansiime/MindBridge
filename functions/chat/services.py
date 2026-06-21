"""
MindBridge Chat Service — powered by Groq (free, unlimited, ultra-fast).
Get your free API key at: https://console.groq.com
Uses: llama-3.3-70b-versatile — state-of-the-art, medically aware.
"""
from typing import Generator

from groq import Groq
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
        "Never diagnose. If someone asks for a breathing exercise, guide them through box breathing "
        "step by step. If crisis keywords are detected, strongly encourage calling +256787671827."
    ),
    'anxiety': (
        "You are MindBridge's Anxiety & Panic specialist. Be calm, slow, and reassuring. "
        "For panic attacks, immediately guide grounding exercises. Keep replies short — "
        "someone panicking cannot read paragraphs. Use 5-4-3-2-1 grounding and box breathing. "
        "Never diagnose. Encourage calling +256787671827 if in crisis."
    ),
    'sleep': (
        "You are MindBridge's Sleep coach. Help with insomnia, sleep hygiene, and wind-down routines. "
        "Suggest progressive muscle relaxation and stimulus control techniques. "
        "Be soothing and gentle. Never diagnose sleep disorders."
    ),
    'grief': (
        "You are MindBridge's grief companion. Be exceptionally gentle and unhurried. "
        "Never rush stages of grief or say 'you will feel better soon.' "
        "Validate feelings fully before offering any tools. Use narrative therapy. "
        "Sometimes just listening is the right response. Never diagnose."
    ),
    'social': (
        "You are MindBridge's social confidence coach. Help through cognitive reframing "
        "and conversation rehearsal. Offer to roleplay difficult conversations. "
        "Use Socratic questioning to challenge catastrophic thinking. Never diagnose."
    ),
    'adhd': (
        "You are MindBridge's ADHD support companion. Help with focus, task initiation, "
        "emotional regulation, and time blindness. Offer body-doubling support. "
        "Break tasks into tiny steps. Validate the ADHD experience. Never diagnose ADHD."
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
        "You are MindBridge's burnout and work stress coach. Use the Maslach Burnout Inventory "
        "framework. Focus on boundary-setting, value clarification, and sustainable work habits. "
        "Be direct about systemic causes. Never diagnose clinical depression as burnout."
    ),
    'postpartum': (
        "You are MindBridge's perinatal mental health companion. Support new and expecting parents "
        "with identity shifts, sleep deprivation, relationship changes, and feeding struggles. "
        "Be warm and non-judgmental. Strongly encourage professional support for PPD/PPA. "
        "Never diagnose."
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
        self.client = Groq(api_key=settings.GROQ_API_KEY)

    def stream(
        self,
        messages: list[dict],
        module_id: str,
        use_rag: bool = False,
    ) -> Generator[str, None, None]:

        system_prompt = MODULE_PROMPTS.get(module_id, MODULE_PROMPTS['chat'])

        # Build messages for Groq (OpenAI-compatible format)
        groq_messages = [{'role': 'system', 'content': system_prompt}]

        for msg in messages:
            role = msg.get('role', '')
            content = msg.get('content', '')
            if role in ('user', 'assistant') and content:
                groq_messages.append({'role': role, 'content': content})

        try:
            stream = self.client.chat.completions.create(
                model='llama-3.3-70b-versatile',
                messages=groq_messages,
                max_tokens=512,
                temperature=0.7,
                stream=True,
            )
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content

        except Exception as e:
            yield f"I'm having a moment of difficulty. Please try again. ({str(e)[:60]})"
