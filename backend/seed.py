from __future__ import annotations

from datetime import date, datetime, timedelta
from random import Random

from database import SessionLocal, init_db
from models import Appointment


def seed_database() -> int:
    init_db()
    db = SessionLocal()
    try:
        appointment_count = db.query(Appointment).count()
        if appointment_count > 0:
            return appointment_count

        rng = Random(42)
        patient_names = [
            "Emily Carter",
            "Lucas Nguyen",
            "Priya Patel",
            "Daniel Brooks",
            "Maya Lopez",
            "Noah Adams",
            "Sophia Reed",
            "Ethan Turner",
            "Ava Morgan",
            "Mason Hall",
            "Olivia Scott",
            "James Foster",
            "Chloe Ramirez",
            "Benjamin Diaz",
            "Zoe Murphy",
            "Liam Price",
            "Isabella Bell",
            "Henry Ross",
            "Grace Stewart",
            "Jack Cooper",
            "Ella Rivera",
            "Samuel Ward",
            "Amelia Cook",
            "David Hughes",
            "Harper Flores",
            "Leo Bailey",
            "Scarlett Price",
            "Gabriel Hughes",
            "Lily Sanders",
            "Owen Mills",
        ]

        departments = [
            "Cardiology",
            "Dermatology",
            "Neurology",
            "Orthopedics",
            "Pediatrics",
            "Primary Care",
        ]
        doctors = {
            "Cardiology": ["Dr. Lee", "Dr. Johnson", "Dr. Chen"],
            "Dermatology": ["Dr. Patel", "Dr. Brown", "Dr. Singh"],
            "Neurology": ["Dr. Wright", "Dr. Green", "Dr. Rivera"],
            "Orthopedics": ["Dr. Allen", "Dr. Foster", "Dr. Davis"],
            "Pediatrics": ["Dr. Baker", "Dr. Kim", "Dr. Young"],
            "Primary Care": ["Dr. Hall", "Dr. Bennett", "Dr. Scott"],
        }
        types = ["Consultation", "Follow-up", "Procedure", "New Patient"]
        statuses = ["Scheduled", "Completed", "No-Show", "Cancelled"]

        records = []
        for index in range(1, 31):
            dept = departments[(index - 1) % len(departments)]
            patient_name = patient_names[(index - 1) % len(patient_names)]
            patient_id = f"PT-{(index + 120):04d}"
            status = statuses[(index + 1) % len(statuses)]
            appointment_date = date.today() + timedelta(days=((index * 2) % 9) - 2)
            hour = 9 + ((index * 2) % 8)
            minute = "00" if index % 2 == 0 else "30"
            appointment_time = f"{hour:02d}:{minute}"
            record = Appointment(
                patient_id=patient_id,
                patient_name=patient_name,
                appointment_date=datetime.combine(appointment_date, datetime.min.time()),
                appointment_time=appointment_time,
                doctor_name=doctors[dept][index % len(doctors[dept])],
                department=dept,
                appointment_type=types[index % len(types)],
                previous_visits=(index % 6) + 1,
                previous_no_shows=(index % 3),
                previous_cancellations=(index % 2),
                days_since_last_visit=(index % 30) + 2,
                appointment_hour=hour,
                appointment_day=(index + 1) % 7,
                reminder_sent=(index % 2 == 0),
                booking_lead_days=(index % 14) + 3,
                status=status,
                follow_up_status="Pending" if status == "No-Show" else ("Completed" if status == "Completed" else "Not Required"),
                follow_up_action=None if status != "No-Show" else "Phone Call",
                follow_up_notes=None if status != "No-Show" else "Patient missed a previous visit and needs outreach.",
                followed_up_at=None,
            )
            records.append(record)

        db.add_all(records)
        db.commit()
        return len(records)
    finally:
        db.close()
