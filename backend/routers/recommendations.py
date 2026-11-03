from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment
from services.ml_service import ml_service
from services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


@router.get("/{appointment_id}")
def get_recommendations_for_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")

    features = {
        "previous_appointments": appointment.previous_visits,
        "previous_no_shows": appointment.previous_no_shows,
        "previous_cancellations": appointment.previous_cancellations,
        "days_since_last_visit": appointment.days_since_last_visit,
        "appointment_hour": appointment.appointment_hour,
        "appointment_day": appointment.appointment_day,
        "appointment_type": appointment.appointment_type,
        "department": appointment.department,
        "reminder_sent": appointment.reminder_sent,
        "booking_lead_days": appointment.booking_lead_days,
    }

    prediction = ml_service.predict(features)
    probability = prediction["probability"]
    return generate_recommendations(appointment, probability)


@router.post("/{appointment_id}/generate")
def generate_recommendation_for_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")

    if appointment.status != "No-Show":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI recommendations are intended for no-show appointments only")

    return get_recommendations_for_appointment(appointment_id, db)
