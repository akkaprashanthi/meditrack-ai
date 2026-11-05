from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[str] = mapped_column(String, nullable=False, index=True)
    patient_name: Mapped[str] = mapped_column(String, nullable=False)
    appointment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    appointment_time: Mapped[str] = mapped_column(String, nullable=False)
    doctor_name: Mapped[str] = mapped_column(String, nullable=False)
    department: Mapped[str] = mapped_column(String, nullable=False)
    appointment_type: Mapped[str] = mapped_column(String, nullable=False)
    previous_visits: Mapped[int] = mapped_column(Integer, default=0)
    previous_no_shows: Mapped[int] = mapped_column(Integer, default=0)
    previous_cancellations: Mapped[int] = mapped_column(Integer, default=0)
    days_since_last_visit: Mapped[int] = mapped_column(Integer, default=0)
    appointment_hour: Mapped[int] = mapped_column(Integer, default=9)
    appointment_day: Mapped[int] = mapped_column(Integer, default=0)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    booking_lead_days: Mapped[int] = mapped_column(Integer, default=7)
    status: Mapped[str] = mapped_column(String, default="Scheduled")
    follow_up_status: Mapped[str] = mapped_column(String, default="Pending")
    follow_up_action: Mapped[str | None] = mapped_column(String, nullable=True)
    follow_up_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    followed_up_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    followups: Mapped[list["FollowUp"]] = relationship("FollowUp", back_populates="appointment")


class FollowUp(Base):
    __tablename__ = "followups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    patient_id: Mapped[str] = mapped_column(String, nullable=False)
    action: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String, default="Completed")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    appointment: Mapped[Appointment] = relationship("Appointment", back_populates="followups")


class RecommendationCompletion(Base):
    __tablename__ = "recommendation_completions"
    __table_args__ = (
        UniqueConstraint("appointment_id", "category", name="uq_recommendation_completion_appointment_category"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    appointment_id: Mapped[int] = mapped_column(ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String, nullable=False)
    action_taken: Mapped[str] = mapped_column(String, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String, default="Completed", nullable=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
