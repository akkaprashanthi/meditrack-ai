from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

NUMERIC_FEATURES = [
    "previous_appointments",
    "previous_no_shows",
    "previous_cancellations",
    "days_since_last_visit",
    "appointment_hour",
    "appointment_day",
    "booking_lead_days",
]

MODEL_NUMERIC_FEATURES = [
    "previous_no_shows",
    "previous_cancellations",
    "days_since_last_visit",
    "appointment_hour",
    "appointment_day",
    "booking_lead_days",
]

CATEGORICAL_FEATURES = [
    "appointment_type",
    "department",
    "reminder_sent",
]


def build_preprocessing_pipeline() -> ColumnTransformer:
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numerical", numeric_transformer, MODEL_NUMERIC_FEATURES),
            ("categorical", categorical_transformer, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
    )
    return preprocessor


def prepare_features_for_model(data: dict | pd.DataFrame):
    if isinstance(data, dict):
        row = pd.DataFrame([data])
    elif isinstance(data, pd.DataFrame):
        row = data.copy()
    else:
        raise ValueError("Features must be a mapping or pandas DataFrame.")

    required_features = MODEL_NUMERIC_FEATURES + CATEGORICAL_FEATURES
    missing_features = [column for column in required_features if column not in row.columns]
    if missing_features:
        raise ValueError(f"Missing required model feature(s): {', '.join(missing_features)}")

    if "reminder_sent" in row.columns:
        row["reminder_sent"] = row["reminder_sent"].astype(bool)

    row["appointment_day"] = row["appointment_day"].fillna(0)
    row["appointment_hour"] = row["appointment_hour"].fillna(9)
    return row


def validate_preprocessing(data: pd.DataFrame) -> pd.DataFrame:
    for column in NUMERIC_FEATURES + ["appointment_type", "department", "reminder_sent"]:
        if column not in data.columns:
            raise ValueError(f"Missing required feature: {column}")

    numeric_columns = list(NUMERIC_FEATURES)
    for column in numeric_columns:
        data[column] = pd.to_numeric(data[column], errors="coerce")
        median_value = data[column].median()
        if pd.notna(median_value):
            data[column] = data[column].fillna(median_value)

    data["appointment_day"] = data["appointment_day"].fillna(0)
    data["appointment_hour"] = data["appointment_hour"].fillna(9)
    data["appointment_type"] = data["appointment_type"].fillna("Unknown")
    data["department"] = data["department"].fillna("Unknown")
    data["reminder_sent"] = data["reminder_sent"].astype(bool)
    return data
