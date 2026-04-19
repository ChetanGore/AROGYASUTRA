"""
AryogaSutra — Rule-Based NLP Chatbot

Intent classification via keyword matching.
Dosha-aware response templates with patient context substitution.
"""

import re
import string
from typing import Optional

# ── Intent keyword dictionary ──────────────────────────────────────────────────
INTENTS: dict[str, list[str]] = {
    "remedy": [
        "remedy", "medicine", "treatment", "cure", "herb", "ayurvedic",
        "heal", "healing", "herbal", "natural", "fix", "relief",
    ],
    "yoga": [
        "yoga", "exercise", "pose", "asana", "stretch", "meditation",
        "pranayama", "breathe", "breathing", "workout", "fitness",
    ],
    "nearby_doctors": [
        "doctor", "physician", "clinic", "hospital", "nearby", "find",
        "consult", "specialist", "appointment", "book",
    ],
    "lifestyle": [
        "diet", "food", "lifestyle", "routine", "sleep", "stress",
        "eat", "eating", "nutrition", "habit", "daily", "schedule",
    ],
    "greeting": [
        "hello", "hi", "hey", "namaste", "good morning", "good afternoon",
        "good evening", "greetings", "howdy",
    ],
    "fallback": [],
}

# ── Dosha-specific remedy templates ───────────────────────────────────────────
REMEDY_TEMPLATES: dict[str, str] = {
    "Vata": (
        "For Vata imbalance, warm and grounding remedies work best. "
        "Consider warm sesame oil massage (Abhyanga), ginger tea, and nourishing root vegetables. "
        "{ai_context}"
        "Avoid cold, dry, and raw foods. Maintain a regular daily routine."
    ),
    "Pitta": (
        "For Pitta imbalance, cooling and calming remedies are ideal. "
        "Try coriander and fennel tea, coconut water, and cooling foods like cucumber and mint. "
        "{ai_context}"
        "Avoid spicy, oily, and fermented foods. Stay out of direct heat."
    ),
    "Kapha": (
        "For Kapha imbalance, stimulating and light remedies help. "
        "Ginger and black pepper tea, honey with warm water, and light warm meals are beneficial. "
        "{ai_context}"
        "Avoid heavy, oily, and cold foods. Stay active and avoid daytime sleep."
    ),
    "default": (
        "Based on your Ayurvedic profile, here are some general remedy suggestions: "
        "{ai_context}"
        "Consult an Ayurvedic practitioner for personalised advice."
    ),
}

# ── Dosha-specific yoga templates ─────────────────────────────────────────────
YOGA_TEMPLATES: dict[str, str] = {
    "Vata": (
        "For Vata types, grounding and slow-paced yoga is recommended. "
        "Try Yoga Nidra, Balasana (Child's Pose), Viparita Karani (Legs-up-the-wall), "
        "and Nadi Shodhana pranayama. {ai_context}"
        "Practice in a warm, quiet space and avoid vigorous or fast-paced sequences."
    ),
    "Pitta": (
        "For Pitta types, cooling and calming yoga is best. "
        "Try Shavasana, Moon Salutation, Sitali pranayama (cooling breath), "
        "and gentle forward folds. {ai_context}"
        "Avoid hot yoga and highly competitive or intense practices."
    ),
    "Kapha": (
        "For Kapha types, energising and dynamic yoga is ideal. "
        "Try Surya Namaskar (Sun Salutation), Kapalbhati pranayama, Trikonasana, "
        "and Utkatasana. {ai_context}"
        "Practice in the morning and maintain a brisk pace to stimulate energy."
    ),
    "default": (
        "Yoga and pranayama are excellent for overall wellbeing. "
        "{ai_context}"
        "Start with gentle poses and consult a yoga teacher for a personalised sequence."
    ),
}

# ── Dosha-specific lifestyle templates ────────────────────────────────────────
LIFESTYLE_TEMPLATES: dict[str, str] = {
    "Vata": (
        "For Vata balance, routine and warmth are key. "
        "Wake up and sleep at the same time daily. Eat warm, cooked, oily foods. "
        "Avoid multitasking and overstimulation. {ai_context}"
        "Warm oil self-massage before bathing is highly beneficial."
    ),
    "Pitta": (
        "For Pitta balance, cooling and moderation are essential. "
        "Avoid skipping meals and eat at regular times. Choose cooling foods and avoid alcohol. "
        "Take breaks from work and spend time in nature. {ai_context}"
        "Moonlight walks and swimming are excellent for Pitta types."
    ),
    "Kapha": (
        "For Kapha balance, stimulation and lightness are needed. "
        "Wake up early (before 6 AM) and exercise daily. Eat light, warm, spiced meals. "
        "Avoid oversleeping and heavy foods. {ai_context}"
        "Dry brushing and vigorous exercise help stimulate Kapha energy."
    ),
    "default": (
        "A balanced Ayurvedic lifestyle includes regular sleep, mindful eating, "
        "daily exercise, and stress management. {ai_context}"
        "Consult an Ayurvedic practitioner for a personalised routine."
    ),
}

# ── Greeting templates ────────────────────────────────────────────────────────
GREETING_TEMPLATES: dict[str, str] = {
    "Vata": (
        "Namaste! 🙏 I'm your AryogaSutra health assistant. "
        "Your dominant Dosha is Vata — you are creative, energetic, and quick-thinking. "
        "How can I help you today? Ask me about remedies, yoga, diet, or finding a doctor."
    ),
    "Pitta": (
        "Namaste! 🙏 I'm your AryogaSutra health assistant. "
        "Your dominant Dosha is Pitta — you are focused, driven, and passionate. "
        "How can I help you today? Ask me about remedies, yoga, diet, or finding a doctor."
    ),
    "Kapha": (
        "Namaste! 🙏 I'm your AryogaSutra health assistant. "
        "Your dominant Dosha is Kapha — you are calm, nurturing, and steady. "
        "How can I help you today? Ask me about remedies, yoga, diet, or finding a doctor."
    ),
    "default": (
        "Namaste! 🙏 I'm your AryogaSutra health assistant. "
        "I can help you with Ayurvedic remedies, yoga suggestions, lifestyle tips, "
        "and finding nearby doctors. What would you like to know?"
    ),
}

# ── Nearby doctors template ───────────────────────────────────────────────────
NEARBY_DOCTORS_REPLY = (
    "To find nearby doctors, visit the **Nearby Doctors** page from the navigation menu. "
    "The system will use your location to recommend the most relevant doctors based on "
    "your predicted condition and proximity. You can book an appointment directly from there."
)

# ── Fallback template ─────────────────────────────────────────────────────────
FALLBACK_REPLY = (
    "I'm here to help with your Ayurvedic health journey! "
    "You can ask me about:\n"
    "• **Remedies** — Ayurvedic treatments for your condition\n"
    "• **Yoga** — poses and pranayama suited to your Dosha\n"
    "• **Lifestyle** — diet and daily routine recommendations\n"
    "• **Doctors** — how to find nearby specialists\n\n"
    "What would you like to know?"
)


# ── Intent classification ──────────────────────────────────────────────────────

def _normalise(text: str) -> str:
    """Lowercase and strip punctuation."""
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text


def classify_intent(message: str) -> str:
    """
    Classify the user's message into one of the defined intents.
    Returns the intent name with the highest keyword match count.
    Falls back to 'fallback' if no keywords match.
    """
    normalised = _normalise(message)
    tokens = set(normalised.split())

    scores: dict[str, int] = {}
    for intent, keywords in INTENTS.items():
        if intent == "fallback":
            continue
        score = sum(1 for kw in keywords if kw in normalised or kw in tokens)
        if score > 0:
            scores[intent] = score

    if not scores:
        return "fallback"

    return max(scores, key=lambda k: scores[k])


# ── Response generation ────────────────────────────────────────────────────────

def _build_ai_context(patient_data: dict) -> str:
    """Build a short AI context string from the patient's last prediction."""
    disease = patient_data.get("lastAiDisease") or patient_data.get("last_ai_disease", "")
    remedy = patient_data.get("lastAiRemedy") or patient_data.get("last_ai_remedy", "")
    yoga = patient_data.get("lastAiYoga") or patient_data.get("last_ai_yoga", "")

    parts = []
    if disease:
        parts.append(f"Your last AI prediction was: **{disease}**.")
    if remedy:
        parts.append(f"Suggested remedy: {remedy}.")
    if yoga:
        parts.append(f"Suggested yoga: {yoga}.")

    return " ".join(parts) + " " if parts else ""


def get_reply(message: str, patient_data: dict) -> str:
    """
    Generate a context-aware reply for the given message and patient data.

    Args:
        message: The user's chat message.
        patient_data: Patient record dict from the backend (may be empty).

    Returns:
        A string reply.
    """
    intent = classify_intent(message)
    dosha: str = patient_data.get("dosha", "") or "default"

    # Normalise dosha to known values
    if dosha not in ("Vata", "Pitta", "Kapha"):
        dosha = "default"

    ai_context = _build_ai_context(patient_data)

    if intent == "greeting":
        return GREETING_TEMPLATES.get(dosha, GREETING_TEMPLATES["default"])

    if intent == "nearby_doctors":
        return NEARBY_DOCTORS_REPLY

    if intent == "remedy":
        template = REMEDY_TEMPLATES.get(dosha, REMEDY_TEMPLATES["default"])
        return template.format(ai_context=ai_context)

    if intent == "yoga":
        template = YOGA_TEMPLATES.get(dosha, YOGA_TEMPLATES["default"])
        return template.format(ai_context=ai_context)

    if intent == "lifestyle":
        template = LIFESTYLE_TEMPLATES.get(dosha, LIFESTYLE_TEMPLATES["default"])
        return template.format(ai_context=ai_context)

    # fallback
    return FALLBACK_REPLY
