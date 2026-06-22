"""
Therapist matching algorithm.
Finds the best available therapist for a given module/specialization.
"""
from .models import TherapistProfile

# Map chat modules to therapist specializations
MODULE_TO_SPEC = {
    'anxiety': 'anxiety',
    'trauma': 'trauma',
    'grief': 'grief',
    'burnout': 'burnout',
    'adhd': 'adhd',
    'recovery': 'recovery',
    'sleep': 'sleep',
    'postpartum': 'postpartum',
    'social': 'social',
    'chat': 'general',
}

# Distress keywords that trigger handoff (beyond crisis)
DISTRESS_PHRASES = [
    'i give up', 'nothing helps', 'i cant do this anymore',
    'i feel hopeless', 'what is the point', 'nobody cares',
    'i am worthless', 'i hate myself', 'i feel so alone',
    'i cannot cope', 'i am broken', 'i feel empty',
]


def score_distress(text: str) -> int:
    """Score message for distress level 0-10."""
    lower = text.lower()
    score = 0
    for phrase in DISTRESS_PHRASES:
        if phrase in lower:
            score += 2
    negative_words = ['hopeless', 'worthless', 'alone', 'empty', 'broken', 'tired', 'exhausted']
    for word in negative_words:
        if word in lower:
            score += 1
    return min(score, 10)


def should_trigger_handoff(messages: list, current_text: str) -> dict:
    """
    Analyse session to decide if therapist handoff should trigger.
    Returns: {trigger: bool, reason: str, severity: int}
    """
    # 1. User explicitly asks for human help
    human_keywords = [
        'i want to talk to someone', 'i need a real person',
        'can i speak to a therapist', 'i need human help',
        'connect me to a therapist', 'speak to someone',
    ]
    lower = current_text.lower()
    for kw in human_keywords:
        if kw in lower:
            return {'trigger': True, 'reason': 'user_request', 'severity': 3}

    # 2. High distress in current message
    score = score_distress(current_text)
    if score >= 6:
        return {'trigger': True, 'reason': 'distress', 'severity': score}

    # 3. Repeated hopelessness across session (3+ distress messages)
    user_msgs = [m for m in messages if m.get('role') == 'user']
    high_distress_count = sum(1 for m in user_msgs if score_distress(m.get('content', '')) >= 4)
    if high_distress_count >= 3:
        return {'trigger': True, 'reason': 'repeated_hopelessness', 'severity': 5}

    # 4. Long session with no improvement (20+ user messages)
    if len(user_msgs) >= 20:
        return {'trigger': True, 'reason': 'distress', 'severity': 4}

    return {'trigger': False, 'reason': '', 'severity': 0}


def find_available_therapist(module_id: str):
    """
    Find the best available therapist for a given module.

    Algorithm:
    1. Filter: status=approved, is_available=True
    2. Filter: currently within working hours
    3. Filter: active_patient_count < max_patients
    4. Prefer: specialization matches module
    5. Sort: by least busy (fewest active patients) then by rating
    """
    spec = MODULE_TO_SPEC.get(module_id, 'general')

    approved = TherapistProfile.objects.filter(
        status=TherapistProfile.Status.APPROVED,
        is_available=True,
    ).select_related('user')

    # Filter by availability (working hours + capacity)
    available = [t for t in approved if t.is_currently_available()]

    # Fall back to any approved therapist under capacity if none are in working hours
    if not available:
        available = [t for t in approved if t.active_patient_count < t.max_patients]

    if not available:
        return None

    # Split: specialization match vs general
    specialized = [t for t in available if spec in (t.specializations or [])]
    general = [t for t in available if t not in specialized]

    # Sort each group by fewest active patients, then highest rating
    def sort_key(t):
        return (t.active_patient_count, -float(t.rating))

    specialized.sort(key=sort_key)
    general.sort(key=sort_key)

    # Return best specialized match, fall back to general
    candidates = specialized + general
    return candidates[0] if candidates else None


def build_whatsapp_message(patient_name: str, module_id: str) -> str:
    """Build pre-filled WhatsApp message for patient → therapist."""
    module_labels = {
        'chat': 'Daily Check-In',
        'anxiety': 'Anxiety & Panic',
        'sleep': 'Sleep & Insomnia',
        'grief': 'Grief & Loss',
        'social': 'Social Anxiety',
        'adhd': 'ADHD Support',
        'recovery': 'Addiction & Recovery',
        'trauma': 'Trauma & PTSD',
        'burnout': 'Burnout & Stress',
        'postpartum': 'Postpartum Wellness',
    }
    label = module_labels.get(module_id, module_id.title())
    return (
        f"Hi, my name is {patient_name}. "
        f"I've been using MindBridge and I need some support. "
        f"I was working through the {label} module. "
        f"Could you please help me?"
    )
