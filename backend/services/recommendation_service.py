from __future__ import annotations

from typing import Any

from models import Appointment


def get_follow_up_priority(probability: float) -> str:
    if probability >= 0.65:
        return "High"
    if probability >= 0.35:
        return "Medium"
    return "Low"


def generate_recommendations(appointment: Appointment, probability: float) -> dict[str, Any]:
    priority = get_follow_up_priority(probability)
    previous_no_shows = int(appointment.previous_no_shows)
    reminder_status = "sent" if appointment.reminder_sent else "not sent"
    previous_visits = int(appointment.previous_visits)

    recommendations = [
        {
            "title": "Patient outreach",
            "description": "Contact the patient by phone or SMS to confirm whether they still need the appointment and offer a reschedule.",
            "reason": f"The patient has {previous_no_shows} prior no-shows and the model estimates a {probability:.0%} chance of missing again.",
            "priority": priority,
            "suggested_action": "Call or message the patient within 24 hours and offer the next available slot.",
            "category": "patient_outreach",
        },
        {
            "title": "Reschedule with convenience-focused options",
            "description": "Offer an alternative slot during low-demand hours and prioritize a time the patient previously attended.",
            "reason": f"The appointment is {appointment.appointment_type.lower()} in {appointment.department}, and the patient has {previous_visits} prior visits but limited recent retention.",
            "priority": priority,
            "suggested_action": "Book the next slot within 7 days and confirm a reminder before the visit.",
            "category": "rescheduling",
        },
        {
            "title": "Reminder reinforcement",
            "description": "Send an appointment reminder 24 hours before the new visit and provide clear scheduling details.",
            "reason": f"The patient was {reminder_status} for the missed appointment, which historically increases risk of repeat no-shows.",
            "priority": "Medium" if priority == "High" else "Low",
            "suggested_action": "Automate a reminder 24 hours before the next appointment and include the clinic contact details.",
            "category": "follow_up_reminder",
        },
    ]

    ai_insight = (
        f"This recommendation set was generated using the patient's history: {previous_no_shows} prior no-shows, "
        f"{appointment.previous_cancellations} prior cancellations, and a recent risk estimate of {probability:.0%}. "
        f"The model considered appointment type, department, reminder state, and previous scheduling behavior."
    )

    return {
        "appointment_id": appointment.id,
        "patient_name": appointment.patient_name,
        "predicted_no_show_probability": round(float(probability), 4),
        "follow_up_priority": priority,
        "ai_insight": ai_insight,
        "recommendations": recommendations,
    }
