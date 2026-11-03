from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import Appointment
from services.cache_service import cache_service

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/overview")
def get_overview(db: Session = Depends(get_db)):
    cache_key = "analytics:overview"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    total = db.query(Appointment).count()
    completed = db.query(Appointment).filter(Appointment.status == "Completed").count()
    no_show = db.query(Appointment).filter(Appointment.status == "No-Show").count()
    pending = db.query(Appointment).filter(Appointment.follow_up_status == "Pending").count()
    payload = {
        "total_appointments": total,
        "completed_appointments": completed,
        "no_show_appointments": no_show,
        "pending_followups": pending,
        "no_show_rate": round((no_show / total) * 100, 2) if total else 0,
    }
    cache_service.set(cache_key, payload)
    return payload


@router.get("/weekly-trends")
def get_weekly_trends(db: Session = Depends(get_db)):
    cache_key = "analytics:weekly"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    today = datetime.utcnow().date()
    rows = []
    for offset in range(7):
        day = today - timedelta(days=6 - offset)
        count = (
            db.query(Appointment)
            .filter(func.date(Appointment.appointment_date) == day.isoformat())
            .filter(Appointment.status == "No-Show")
            .count()
        )
        rows.append({"date": day.strftime("%Y-%m-%d"), "no_show_count": count})
    cache_service.set(cache_key, rows)
    return rows


@router.get("/department-stats")
def get_department_stats(db: Session = Depends(get_db)):
    cache_key = "analytics:departments"
    cached = cache_service.get(cache_key)
    if cached is not None:
        return cached

    departments = db.query(Appointment.department).distinct().all()
    result = []
    for (department,) in departments:
        appointments_count = db.query(Appointment).filter(Appointment.department == department).count()
        no_shows = db.query(Appointment).filter(Appointment.department == department, Appointment.status == "No-Show").count()
        result.append(
            {
                "department": department,
                "appointments": appointments_count,
                "no_show_rate": round((no_shows / appointments_count) * 100, 2) if appointments_count else 0,
                "no_shows": no_shows,
            }
        )
    cache_service.set(cache_key, result)
    return result
