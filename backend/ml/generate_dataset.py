from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


def generate_synthetic_dataset(n_records: int = 1500, random_seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_seed)

    departments = ["Cardiology", "Dermatology", "Neurology", "Orthopedics", "Pediatrics", "Primary Care"]
    appointment_types = ["Consultation", "Follow-up", "Procedure", "New Patient"]

    data = {
        "previous_appointments": rng.integers(0, 15, size=n_records),
        "previous_no_shows": rng.integers(0, 5, size=n_records),
        "previous_cancellations": rng.integers(0, 4, size=n_records),
        "days_since_last_visit": rng.integers(1, 180, size=n_records),
        "appointment_hour": rng.integers(8, 18, size=n_records),
        "appointment_day": rng.integers(0, 7, size=n_records),
        "appointment_type": rng.choice(appointment_types, size=n_records),
        "department": rng.choice(departments, size=n_records),
        "reminder_sent": rng.binomial(1, 0.72, size=n_records).astype(bool),
        "booking_lead_days": rng.integers(1, 45, size=n_records),
    }

    df = pd.DataFrame(data)

    risk = (
        0.10
        + 0.05 * df["previous_no_shows"]
        + 0.04 * df["previous_cancellations"]
        + 0.002 * df["days_since_last_visit"]
        + 0.02 * (df["appointment_hour"] >= 16)
        + 0.03 * (df["appointment_day"].isin([5, 6]))
        + 0.04 * (~df["reminder_sent"]).astype(int)
        + 0.08 * (df["appointment_type"] == "Follow-up")
        + 0.03 * (df["department"].isin(["Orthopedics", "Primary Care"]))
        + 0.05 * (df["booking_lead_days"] <= 3)
    )

    df["no_show"] = (rng.random(n_records) < risk / 2.8).astype(int)
    df["no_show"] = np.clip(df["no_show"], 0, 1).astype(int)

    df["previous_appointments"] = df["previous_appointments"].clip(lower=0)
    df["previous_no_shows"] = df["previous_no_shows"].clip(lower=0)
    df["previous_cancellations"] = df["previous_cancellations"].clip(lower=0)
    df["days_since_last_visit"] = df["days_since_last_visit"].clip(lower=1)
    df["booking_lead_days"] = df["booking_lead_days"].clip(lower=1)

    return df


if __name__ == "__main__":
    output_path = Path(__file__).resolve().parent / "artifacts" / "synthetic_dataset.csv"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    dataset = generate_synthetic_dataset()
    dataset.to_csv(output_path, index=False)
    print(f"Saved synthetic dataset to {output_path}")
