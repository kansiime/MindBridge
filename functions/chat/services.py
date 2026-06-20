import anthropic
from django.conf import settings
from typing import Generator

CRISIS_KEYWORDS = [
    'suicide', 'kill myself', 'end it all', 'self harm', 'hurt myself',
    'no reason to live', "don't want to be here", 'want to die',
    'overdose', 'cutting myself', 'end my life',
]

MODULE_PROMPTS = {
    'chat': (
        "You are MindBridge, a warm AI mental wellness companion. "
        "Use CBT/DBT principles naturally. Keep replies 2-4 sentences. "
        "Never diagnose. If user requests a breathing exercise respond ONLY with JSON: "
        '{"type":"breathing","name":"Box Breathing",'
        '"steps":[{"label":"Inhale","seconds":4},{"label":"Hold","seconds":4},'
        '{"label":"Exhale","seconds":4},{"label":"Hold","seconds":4}],"rounds":4}. '
        "If crisis keywords detected, urge calling 988 immediately."
    ),
    'anxiety': (
        "You are MindBridge's Anxiety & Panic specialist. Be calm, slow, reassuring. "
        "For panic attacks, immediately guide grounding. Keep replies short. "
        "Use 5-4-3-2-1 grounding, box breathing, cognitive defusion. "
        "Never diagnose. Urge 988 if crisis."
    ),
    'sleep': (
        "You are MindBridge's Sleep coach. Help with insomnia, sleep hygiene, "
        "wind-down routines. Suggest progressive muscle relaxation and stimulus control. "
        "Be soothing and gentle. Never diagnose sleep disorders."
    ),
    'grief': (
        "You are MindBridge's grief companion. Be exceptionally gentle and unhurried. "
        "Never rush stages of grief. Validate fully before offering tools. "
        "Use narrative therapy and meaning-making. Never diagnose."
    ),
    'social': (
        "You are MindBridge's social confidence coach. Help through cognitive reframing "
        "and conversation rehearsal. Offer to roleplay difficult conversations. "
        "Use Socratic questioning to challenge catastrophic thinking. Never diagnose."
    ),
    'adhd': (
        "You are MindBridge's ADHD support companion. Help with focus, task initiation, "
        "emotional regulation, time blindness. Offer body-doubling. "
        "Break tasks into tiny steps. Use Pomodoro adapted for ADHD. Never diagnose ADHD."
    ),
    'recovery': (
        "You are MindBridge's recovery companion. Support with urge-surfing, "
        "motivational interviewing, milestone celebration. Never shame. "
        "Connect to AA/NA when human community is needed. Never diagnose."
    ),
    'trauma': (
        "You are MindBridge's trauma-informed companion. Prioritize safety and grounding. "
        "Never push recall of trauma details. Use window-of-tolerance awareness and grounding. "
        "Always move at user's pace. Strongly recommend professional therapy. Urge 988 for crisis."
    ),
    'burnout': (
        "You are MindBridge's burnout and work stress coach. "
        "Use Maslach Burnout Inventory framework. Focus on boundary-setting, "
        "value clarification, sustainable work habits. Never diagnose clinical depression."
    ),
    'postpartum': (
        "You are MindBridge's perinatal mental health companion. "
        "Support new and expecting parents with the emotional landscape of early parenthood. "
        "Screen gently using Edinburgh Postnatal Depression Scale questions. "
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
        self.client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def stream(
        self,
        messages: list[dict],
        module_id: str,
        use_rag: bool = False,
    ) -> Generator[str, None, None]:
        system_prompt = MODULE_PROMPTS.get(module_id, MODULE_PROMPTS['chat'])

        if use_rag and settings.ENABLE_RAG:
            last_user = next(
                (m['content'] for m in reversed(messages) if m['role'] == 'user'),
                '',
            )
            context = self._get_rag_context(last_user, module_id)
            if context:
                system_prompt += f'\n\nRelevant evidence-based knowledge:\n{context}'

        formatted = [
            {'role': m['role'], 'content': m['content']}
            for m in messages
            if m['role'] in ('user', 'assistant')
        ]

        with self.client.messages.stream(
            model='claude-sonnet-4-20250514',
            max_tokens=1024,
            system=system_prompt,
            messages=formatted,
        ) as stream:
            for text in stream.text_stream:
                yield text

    def _get_rag_context(self, query: str, module_id: str) -> str:
        try:
            from .rag import search_knowledge
            chunks = search_knowledge(query, module_id, k=4)
            return '\n\n'.join(c['content'] for c in chunks)
        except Exception:
            return ''
