import joblib
import pytest

from ml.generate_dataset import generate_synthetic_dataset
from ml.train_model import DATASET_PATH, MODEL_PATH, train_and_save_model
from services.ml_service import MLService, ml_service
from tests.conftest import client


@pytest.fixture(scope="module")
def trained_model():
    if not DATASET_PATH.exists():
        DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
        generate_synthetic_dataset().to_csv(DATASET_PATH, index=False)
    train_and_save_model(DATASET_PATH, MODEL_PATH)
    ml_service.model = None
    return MLService(MODEL_PATH)


def test_ml_model_loads_and_returns_valid_prediction(trained_model):
    features = {
        "previous_no_shows": 2,
        "previous_cancellations": 1,
        "days_since_last_visit": 24,
        "appointment_hour": 10,
        "appointment_day": 2,
        "appointment_type": "Follow-up",
        "department": "Cardiology",
        "reminder_sent": True,
        "booking_lead_days": 8,
    }
    prediction = trained_model.predict(features)

    assert trained_model.model is not None
    assert set(prediction) == {"prediction", "probability", "threshold"}
    assert prediction["prediction"] in (0, 1)
    assert 0.0 <= prediction["probability"] <= 1.0
    assert 0.0 <= prediction["threshold"] <= 1.0


def test_saved_threshold_is_used_for_prediction(trained_model):
    saved_threshold = joblib.load(MODEL_PATH).threshold
    prediction = trained_model.predict(
        {
            "previous_no_shows": 3,
            "previous_cancellations": 2,
            "days_since_last_visit": 90,
            "appointment_hour": 16,
            "appointment_day": 6,
            "appointment_type": "Follow-up",
            "department": "Primary Care",
            "reminder_sent": False,
            "booking_lead_days": 2,
        }
    )

    assert prediction["threshold"] == saved_threshold
    assert prediction["prediction"] == int(prediction["probability"] >= saved_threshold)


def test_invalid_model_input_has_meaningful_error(trained_model):
    with pytest.raises(ValueError, match="Missing required model feature"):
        trained_model.predict({"appointment_day": 2})


def test_recommendation_generation_for_no_show():
    response = client.get('/api/appointments', params={'status': 'No-Show'})
    no_show_appointment = response.json()[0]
    rec_response = client.post(f"/api/recommendations/{no_show_appointment['id']}/generate")
    assert rec_response.status_code == 200
    recommendation_payload = rec_response.json()
    assert 0.0 <= recommendation_payload['predicted_no_show_probability'] <= 1.0
    assert len(recommendation_payload['recommendations']) >= 3


def test_at_least_three_actionable_recommendations():
    response = client.get('/api/appointments', params={'status': 'No-Show'})
    no_show_appointment = response.json()[0]
    rec_response = client.get(f"/api/recommendations/{no_show_appointment['id']}")
    assert rec_response.status_code == 200
    recommendations = rec_response.json()['recommendations']
    assert len(recommendations) >= 3
    assert all(item['title'].strip() and item['suggested_action'].strip() for item in recommendations)
