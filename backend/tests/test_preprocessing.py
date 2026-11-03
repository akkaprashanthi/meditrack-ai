import numpy as np
import pandas as pd

from services.preprocessing import build_preprocessing_pipeline, validate_preprocessing


def test_missing_value_preprocessing():
    frame = pd.DataFrame({
        'previous_appointments': [1, np.nan, 3],
        'previous_no_shows': [0, 1, np.nan],
        'previous_cancellations': [0, 0, 1],
        'days_since_last_visit': [10, np.nan, 40],
        'appointment_hour': [9, 10, np.nan],
        'appointment_day': [1, 2, 3],
        'appointment_type': ['Consultation', 'Follow-up', 'Procedure'],
        'department': ['Cardiology', 'Neurology', 'Pediatrics'],
        'reminder_sent': [True, False, True],
        'booking_lead_days': [14, np.nan, 7],
    })
    cleaned = validate_preprocessing(frame)
    assert not cleaned.isnull().values.any()


def test_numerical_normalization():
    frame = pd.DataFrame({
        'previous_appointments': [1, 3, 7],
        'previous_no_shows': [0, 1, 2],
        'previous_cancellations': [0, 1, 1],
        'days_since_last_visit': [10, 25, 60],
        'appointment_hour': [9, 11, 15],
        'appointment_day': [1, 3, 5],
        'appointment_type': ['Consultation', 'Follow-up', 'Procedure'],
        'department': ['Cardiology', 'Orthopedics', 'Primary Care'],
        'reminder_sent': [True, False, True],
        'booking_lead_days': [14, 8, 3],
    })
    transformed = build_preprocessing_pipeline().fit_transform(frame)
    assert np.isfinite(transformed).all()
