from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, FollowUp
from schemas import FollowUpOut
from services.cache_service import invalidate_appointment_cache

router = APIRouter(prefix="/api", tags=["followups"])


class FollowUpRequest(BaseModel):
    appointment_id: int
    action: str
    notes: str | None = None


@router.get("/followups")
def list_followups(db: Session = Depends(get_db)):
    followups = db.query(FollowUp).order_by(FollowUp.follow_up_date.desc()).all()
    return [FollowUpOut.model_validate(item).model_dump(mode="json") for item in followups]


@router.post("/followups")
def create_followup(payload: FollowUpRequest, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {payload.appointment_id} not found")

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
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Appointment ID in URL and request body must match")
    return create_followup(payload, db)
