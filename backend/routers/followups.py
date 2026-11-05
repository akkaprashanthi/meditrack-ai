from __future__ import annotations

from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, FollowUp, RecommendationCompletion
from schemas import FollowUpOut, RecommendationCompletionOut
from services.cache_service import invalidate_appointment_cache

router = APIRouter(prefix="/api", tags=["followups"])


class FollowUpRequest(BaseModel):
    appointment_id: int
    action: str
    notes: str | None = None


@router.get("/followups")
def list_followups(
    patient_search: str | None = Query(default=None, min_length=1),
    patient_id: str | None = Query(default=None, min_length=1),
    appointment_id: int | None = Query(default=None, ge=1),
    action: str | None = Query(default=None, min_length=1),
    status: str | None = Query(default=None, min_length=1),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="start_date must be on or before end_date")

    query = db.query(FollowUp)
    if patient_search:
        search_pattern = f"%{patient_search.strip()}%"
        query = query.filter(or_(FollowUp.patient_id.ilike(search_pattern), Appointment.patient_name.ilike(search_pattern)))
        query = query.join(Appointment, FollowUp.appointment_id == Appointment.id)
    if patient_id:
        query = query.filter(FollowUp.patient_id == patient_id.strip())
    if appointment_id is not None:
        query = query.filter(FollowUp.appointment_id == appointment_id)
    if action:
        query = query.filter(FollowUp.action == action)
    if status:
        query = query.filter(FollowUp.status == status)
    if start_date:
        query = query.filter(FollowUp.follow_up_date >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(FollowUp.follow_up_date < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

    followups = query.order_by(FollowUp.follow_up_date.desc(), FollowUp.id.desc()).all()
    return [FollowUpOut.model_validate(item).model_dump(mode="json") for item in followups]


@router.get("/recommendation-completions", response_model=list[RecommendationCompletionOut])
def list_recommendation_completions(
    patient_search: str | None = Query(default=None, min_length=1),
    appointment_id: int | None = Query(default=None, ge=1),
    category: str | None = Query(default=None, min_length=1),
    action: str | None = Query(default=None, min_length=1),
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="start_date must be on or before end_date")

    query = db.query(RecommendationCompletion)
    if patient_search:
        search_pattern = f"%{patient_search.strip()}%"
        query = query.join(Appointment, RecommendationCompletion.appointment_id == Appointment.id)
        query = query.filter(or_(Appointment.patient_id.ilike(search_pattern), Appointment.patient_name.ilike(search_pattern)))
    if appointment_id is not None:
        query = query.filter(RecommendationCompletion.appointment_id == appointment_id)
    if category:
        query = query.filter(RecommendationCompletion.category == category)
    if action:
        query = query.filter(RecommendationCompletion.action_taken == action)
    if start_date:
        query = query.filter(RecommendationCompletion.completed_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(RecommendationCompletion.completed_at < datetime.combine(end_date + timedelta(days=1), datetime.min.time()))

    completions = query.order_by(RecommendationCompletion.completed_at.desc(), RecommendationCompletion.id.desc()).all()
    return completions


@router.post("/followups")
def create_followup(payload: FollowUpRequest, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=http_status.HTTP_404_NOT_FOUND, detail=f"Appointment {payload.appointment_id} not found")

    followup = FollowUp(
        appointment_id=appointment.id,
        patient_id=appointment.patient_id,
        action=payload.action,
        notes=payload.notes,
        follow_up_date=datetime.utcnow(),
        status="Completed",
    )

    db.add(followup)
    appointment.follow_up_status = "Completed"
    appointment.follow_up_action = payload.action
    appointment.follow_up_notes = payload.notes
    appointment.followed_up_at = datetime.utcnow()
    db.commit()
    db.refresh(followup)

    invalidate_appointment_cache(appointment.id)
    return {"message": "Follow-up saved successfully", "followup": FollowUpOut.model_validate(followup).model_dump(mode="json")}


@router.patch("/appointments/{appointment_id}/follow-up")
def patch_followup_status(appointment_id: int, payload: FollowUpRequest, db: Session = Depends(get_db)):
    if payload.appointment_id != appointment_id:
        raise HTTPException(status_code=http_status.HTTP_400_BAD_REQUEST, detail="Appointment ID in URL and request body must match")
    return create_followup(payload, db)
