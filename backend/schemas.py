from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class AppointmentBase(BaseModel):
    patient_id: str
    patient_name: str
    appointment_date: datetime
    appointment_time: str
    doctor_name: str
    department: str
    appointment_type: str
    previous_visits: int = 0
    previous_no_shows: int = 0
    previous_cancellations: int = 0
    days_since_last_visit: int = 0
    appointment_hour: int = 9
    appointment_day: int = 0
    reminder_sent: bool = False
    booking_lead_days: int = 7
    status: str = "Scheduled"
    follow_up_status: str = "Pending"
    follow_up_action: str | None = None
    follow_up_notes: str | None = None
    followed_up_at: datetime | None = None


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentOut(AppointmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


class FollowUpBase(BaseModel):
    appointment_id: int
    patient_id: str
    action: str
    notes: str | None = None
    status: str = "Completed"


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpOut(FollowUpBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    follow_up_date: datetime
    created_at: datetime


class RecommendationItem(BaseModel):
    title: str
    description: str
    reason: str
    priority: Literal["High", "Medium", "Low"]
    suggested_action: str
    category: str


class RecommendationResponse(BaseModel):
    appointment_id: int
    patient_name: str
    predicted_no_show_probability: float
    follow_up_priority: str
    ai_insight: str
    recommendations: list[RecommendationItem]


class CacheStatsResponse(BaseModel):
    ttl_seconds: int
    hits: int
    misses: int
    size: int
    keys: list[str]


class MetricsResponse(BaseModel):
    model_path: str
    accuracy: float | None = None
    precision: float | None = None
    recall: float | None = None
    f1: float | None = None
    roc_auc: float | None = None
    status: str
    message: str | None = None


class DashboardOverview(BaseModel):
    total_appointments: int
    completed_appointments: int
    no_show_appointments: int
    pending_followups: int
    no_show_rate: float
    appointments_today: int
    upcoming_appointments: int


class AnalyticsSummary(BaseModel):
    total_appointments: int
    completed_appointments: int
    no_show_appointments: int
    pending_followups: int
    no_show_rate: float


class DepartmentStat(BaseModel):
    department: str
    appointments: int
    no_show_rate: float
    no_shows: int


class WeeklyTrendEntry(BaseModel):
    date: str
    no_show_count: int


class AppointmentFilterQuery(BaseModel):
    status: str | None = None
    department: str | None = None
    patient_name: str | None = None
    patient_id: str | None = None
    date: str | None = None
    sort_by: str | None = None
    sort_desc: bool = False


class PredictionInput(BaseModel):
    previous_appointments: int = 2
    previous_no_shows: int = 0
    previous_cancellations: int = 0
    days_since_last_visit: int = 30
    appointment_hour: int = 10
    appointment_day: int = 1
    appointment_type: str = "Consultation"
    department: str = "Cardiology"
    reminder_sent: bool = True
    booking_lead_days: int = 12


class PredictionResult(BaseModel):
    prediction: int
    probability: float
    threshold: float
