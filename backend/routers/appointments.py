from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment
from schemas import AppointmentOut
from services.cache_service import cache_service

router = APIRouter(prefix="/api/appointments", tags=["appointments"])


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
    payload = [_serialize_appointment(item) for item in appointments]
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
    pending = db.query(Appointment).filter(Appointment.follow_up_status == "Pending").count()
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
