from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment, FollowUp, RecommendationCompletion
from schemas import AppointmentOut
from services.cache_service import cache_service

router = APIRouter(prefix="/api/appointments", tags=["appointments"])
RECOMMENDATION_TOTAL = 3


def _serialize_appointment(appointment: Appointment) -> dict:
    return AppointmentOut.model_validate(appointment).model_dump(mode="json")


@router.get("")
def list_appointments(
    status: str | None = Query(default=None),
    department: str | None = Query(default=None),
    patient_name: str | None = Query(default=None),
    patient_id: str | None = Query(default=None),
    date: str | None = Query(default=None),
    sort_by: str | None = Query(default="appointment_date"),
    sort_desc: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    cache_key = f"appointments:list:{status or 'all'}:{department or 'all'}:{patient_name or 'all'}:{patient_id or 'all'}:{date or 'all'}:{sort_by or 'date'}:{sort_desc}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    query = db.query(Appointment)
    if status:
        query = query.filter(Appointment.status == status)
    if department:
        query = query.filter(Appointment.department == department)
    if patient_name:
        query = query.filter(Appointment.patient_name.ilike(f"%{patient_name}%"))
    if patient_id:
        query = query.filter(Appointment.patient_id.ilike(f"%{patient_id}%"))
    if date:
        query = query.filter(func.date(Appointment.appointment_date) == date)

    if sort_by == "appointment_date":
        ordering = Appointment.appointment_date.desc() if sort_desc else Appointment.appointment_date.asc()
    elif sort_by == "patient_name":
        ordering = Appointment.patient_name.desc() if sort_desc else Appointment.patient_name.asc()
    elif sort_by == "status":
        ordering = Appointment.status.desc() if sort_desc else Appointment.status.asc()
    else:
        ordering = Appointment.id.desc() if sort_desc else Appointment.id.asc()

    query = query.order_by(ordering)

    appointments = query.all()
    completion_counts = dict(
        db.query(
            RecommendationCompletion.appointment_id,
            func.count(RecommendationCompletion.id),
        )
        .filter(
            RecommendationCompletion.status == "Completed",
            RecommendationCompletion.appointment_id.in_([item.id for item in appointments]),
        )
        .group_by(RecommendationCompletion.appointment_id)
        .all()
    ) if appointments else {}

    latest_followups = {}
    if appointments:
        ranked_followups = db.query(
            FollowUp.id.label("follow_up_id"),
            func.row_number().over(
                partition_by=FollowUp.appointment_id,
                order_by=(FollowUp.follow_up_date.desc(), FollowUp.id.desc()),
            ).label("row_number"),
        ).filter(
            FollowUp.appointment_id.in_([item.id for item in appointments])
        ).subquery()
        latest_followups = {
            followup.appointment_id: followup
            for followup in db.query(FollowUp)
            .join(ranked_followups, FollowUp.id == ranked_followups.c.follow_up_id)
            .filter(ranked_followups.c.row_number == 1)
            .all()
        }

    payload = []
    for appointment in appointments:
        item = _serialize_appointment(appointment)
        latest_followup = latest_followups.get(appointment.id)
        item.update(
            {
                "follow_up_recorded": latest_followup is not None,
                "latest_follow_up_action": latest_followup.action if latest_followup else None,
                "latest_follow_up_notes": latest_followup.notes if latest_followup else None,
                "latest_follow_up_date": latest_followup.follow_up_date.isoformat() if latest_followup else None,
                "latest_follow_up_status": latest_followup.status if latest_followup else None,
            }
        )
        if appointment.status == "No-Show":
            completed_count = completion_counts.get(appointment.id, 0)
            item.update(
                {
                    "recommendation_completion_count": completed_count,
                    "recommendation_completion_total": RECOMMENDATION_TOTAL,
                    "recommendation_progress_status": (
                        "Completed" if completed_count >= RECOMMENDATION_TOTAL
                        else "In Progress" if completed_count > 0
                        else "Pending"
                    ),
                }
            )
        payload.append(item)
    cache_service.set(cache_key, payload)
    return payload


@router.get("/today")
def get_todays_appointments(db: Session = Depends(get_db)):
    today_date = datetime.utcnow().date()
    appointments = (
        db.query(Appointment)
        .filter(func.date(Appointment.appointment_date) == today_date.isoformat())
        .order_by(Appointment.appointment_date.asc())
        .all()
    )
    return {"count": len(appointments), "appointments": [_serialize_appointment(item) for item in appointments]}


@router.get("/stats")
def get_appointment_stats(db: Session = Depends(get_db)):
    cache_key = "appointments:stats"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    total = db.query(Appointment).count()
    completed = db.query(Appointment).filter(Appointment.status == "Completed").count()
    no_show = db.query(Appointment).filter(Appointment.status == "No-Show").count()
    pending = (
        db.query(Appointment)
        .filter(
            Appointment.status == "No-Show",
            Appointment.follow_up_status == "Pending",
        )
        .count()
    )
    no_show_rate = round((no_show / total) * 100, 2) if total else 0
    total_today = db.query(Appointment).filter(func.date(Appointment.appointment_date) == datetime.utcnow().date().isoformat()).count()
    upcoming = db.query(Appointment).filter(Appointment.status == "Scheduled").count()
    payload = {
        "total_appointments": total,
        "completed_appointments": completed,
        "no_show_appointments": no_show,
        "pending_followups": pending,
        "no_show_rate": no_show_rate,
        "appointments_today": total_today,
        "upcoming_appointments": upcoming,
    }
    cache_service.set(cache_key, payload)
    return payload


@router.get("/{appointment_id}")
def get_appointment(appointment_id: int, db: Session = Depends(get_db)):
    cache_key = f"appointments:detail:{appointment_id}"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Appointment {appointment_id} not found")

    payload = _serialize_appointment(appointment)
    cache_service.set(cache_key, payload)
    return payload
