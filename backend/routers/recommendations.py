from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, RecommendationCompletion
from schemas import RecommendationCompletionOut, RecommendationCompletionRequest
from services.cache_service import invalidate_appointment_cache
from services.ml_service import ml_service
from services.recommendation_service import generate_recommendations

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])


def get_recommendations_for_appointment(appointment_id: int, db: Session):
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
    response = generate_recommendations(appointment, probability)
    completions = {
        item.category: item
        for item in db.query(RecommendationCompletion).filter(
            RecommendationCompletion.appointment_id == appointment_id
        )
    }
    for recommendation in response["recommendations"]:
        completion = completions.get(recommendation["category"])
        recommendation.update(
            {
                "completion_status": completion.status if completion else "Pending",
                "action_taken": completion.action_taken if completion else None,
                "completion_notes": completion.notes if completion else None,
                "completed_at": completion.completed_at if completion else None,
            }
        )
    return response


@router.get("/{appointment_id}")
def recommendations_for_appointment(appointment_id: int, db: Session = Depends(get_db)):
    return get_recommendations_for_appointment(appointment_id, db)


@router.post("/{appointment_id}/completions", response_model=RecommendationCompletionOut)
def complete_recommendation(
    appointment_id: int,
    payload: RecommendationCompletionRequest,
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")
    if appointment.status != "No-Show":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Recommendations are available for no-show appointments only")

    valid_categories = {
        item["category"]
        for item in get_recommendations_for_appointment(appointment_id, db)["recommendations"]
    }
    if payload.category not in valid_categories:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown recommendation category")

    completion = db.query(RecommendationCompletion).filter_by(
        appointment_id=appointment_id,
        category=payload.category,
    ).first()
    if completion is None:
        completion = RecommendationCompletion(
            appointment_id=appointment_id,
            category=payload.category,
            action_taken=payload.action_taken,
            notes=payload.notes,
            status="Completed",
            completed_at=datetime.utcnow(),
        )
        db.add(completion)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            completion = db.query(RecommendationCompletion).filter_by(
                appointment_id=appointment_id,
                category=payload.category,
            ).one()
            completion.action_taken = payload.action_taken
            completion.notes = payload.notes
            completion.status = "Completed"
            completion.completed_at = datetime.utcnow()
            db.commit()
    else:
        completion.action_taken = payload.action_taken
        completion.notes = payload.notes
        completion.status = "Completed"
        completion.completed_at = datetime.utcnow()
        db.commit()

    db.refresh(completion)
    invalidate_appointment_cache(appointment_id)
    return completion


@router.post("/{appointment_id}/generate")
def generate_recommendation_for_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")

    if appointment.status != "No-Show":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="AI recommendations are intended for no-show appointments only")

    return get_recommendations_for_appointment(appointment_id, db)
