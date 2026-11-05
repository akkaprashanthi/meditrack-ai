import joblib
import pytest
from datetime import date

from ml.generate_dataset import generate_synthetic_dataset
from ml.train_model import DATASET_PATH, MODEL_PATH, train_and_save_model
from services.ml_service import MLService, ml_service
from tests.conftest import client


def _save_test_recommendation_completion(category='patient_outreach', action='Phone Call'):
    appointment = client.get('/api/appointments', params={'status': 'No-Show'}).json()[0]
    response = client.post(
        f"/api/recommendations/{appointment['id']}/completions",
        json={'category': category, 'action_taken': action, 'notes': 'Filter test completion'},
    )
    assert response.status_code == 200
    return appointment, response.json()


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


def test_recommendation_completion_is_persisted_and_idempotent():
    no_show_response = client.get('/api/appointments', params={'status': 'No-Show'})
    appointment = no_show_response.json()[0]
    pending_followups_before = client.get('/api/appointments/stats').json()['pending_followups']
    recommendation_response = client.get(f"/api/recommendations/{appointment['id']}")
    recommendation = recommendation_response.json()['recommendations'][0]
    assert recommendation['completion_status'] == 'Pending'

    payload = {
        'category': recommendation['category'],
        'action_taken': 'Phone Call',
        'notes': 'Reached patient and offered a new appointment.',
    }
    first_response = client.post(f"/api/recommendations/{appointment['id']}/completions", json=payload)
    assert first_response.status_code == 200
    first_completion = first_response.json()
    assert first_completion['appointment_id'] == appointment['id']
    assert first_completion['status'] == 'Completed'
    assert first_completion['action_taken'] == payload['action_taken']
    assert first_completion['notes'] == payload['notes']
    assert first_completion['completed_at']

    updated_payload = {**payload, 'action_taken': 'SMS', 'notes': 'Sent a rescheduling message.'}
    second_response = client.post(f"/api/recommendations/{appointment['id']}/completions", json=updated_payload)
    assert second_response.status_code == 200
    second_completion = second_response.json()
    assert second_completion['id'] == first_completion['id']
    assert second_completion['action_taken'] == updated_payload['action_taken']
    assert second_completion['notes'] == updated_payload['notes']

    refreshed_recommendations = client.get(f"/api/recommendations/{appointment['id']}").json()
    refreshed_item = next(
        item for item in refreshed_recommendations['recommendations']
        if item['category'] == recommendation['category']
    )
    assert refreshed_item['completion_status'] == 'Completed'
    assert refreshed_item['action_taken'] == updated_payload['action_taken']
    assert refreshed_item['completion_notes'] == updated_payload['notes']
    assert refreshed_item['completed_at']

    completion_list = client.get('/api/recommendation-completions')
    assert completion_list.status_code == 200
    matching = [item for item in completion_list.json() if item['appointment_id'] == appointment['id'] and item['category'] == recommendation['category']]
    assert len(matching) == 1
    assert matching[0]['id'] == first_completion['id']
    assert matching[0]['action_taken'] == updated_payload['action_taken']
    assert matching[0]['notes'] == updated_payload['notes']

    appointment_after_completion = client.get(f"/api/appointments/{appointment['id']}").json()
    assert appointment_after_completion['status'] == 'No-Show'
    assert appointment_after_completion['follow_up_status'] == appointment['follow_up_status']
    assert client.get('/api/appointments/stats').json()['pending_followups'] == pending_followups_before


def test_recommendation_completion_rejects_unknown_category():
    appointment = client.get('/api/appointments', params={'status': 'No-Show'}).json()[0]
    response = client.post(
        f"/api/recommendations/{appointment['id']}/completions",
        json={'category': 'unknown', 'action_taken': 'Phone Call', 'notes': None},
    )
    assert response.status_code == 400


def test_appointment_recommendation_progress_updates_from_persisted_completions():
    completed_appointment_ids = {
        item['appointment_id']
        for item in client.get('/api/recommendation-completions').json()
    }
    appointment = next(
        item for item in client.get('/api/appointments', params={'status': 'No-Show'}).json()
        if item['id'] not in completed_appointment_ids
    )
    appointment_id = appointment['id']

    initial_list = client.get('/api/appointments', params={'status': 'No-Show'}).json()
    initial_progress = next(item for item in initial_list if item['id'] == appointment_id)
    assert initial_progress['recommendation_completion_count'] == 0
    assert initial_progress['recommendation_completion_total'] == 3
    assert initial_progress['recommendation_progress_status'] == 'Pending'

    recommendation_items = client.get(f'/api/recommendations/{appointment_id}').json()['recommendations']
    for completed_count, recommendation in enumerate(recommendation_items, start=1):
        response = client.post(
            f'/api/recommendations/{appointment_id}/completions',
            json={
                'category': recommendation['category'],
                'action_taken': 'Phone Call',
                'notes': f'Completed recommendation {completed_count}',
            },
        )
        assert response.status_code == 200

        progress_list = client.get('/api/appointments', params={'status': 'No-Show'}).json()
        progress = next(item for item in progress_list if item['id'] == appointment_id)
        assert progress['recommendation_completion_count'] == completed_count
        assert progress['recommendation_completion_total'] == 3
        expected_status = 'Completed' if completed_count == 3 else 'In Progress'
        assert progress['recommendation_progress_status'] == expected_status
        assert progress['status'] == 'No-Show'

    assert client.get(f'/api/appointments/{appointment_id}').json()['status'] == 'No-Show'


def test_recommendation_completion_search_matches_appointment_patient_id_and_name():
    appointment, completion = _save_test_recommendation_completion(category='patient_outreach', action='Phone Call')

    by_id = client.get('/api/recommendation-completions', params={'patient_search': appointment['patient_id']})
    by_name = client.get('/api/recommendation-completions', params={'patient_search': appointment['patient_name']})

    assert by_id.status_code == by_name.status_code == 200
    assert completion['id'] in {item['id'] for item in by_id.json()}
    assert completion['id'] in {item['id'] for item in by_name.json()}


def test_recommendation_completion_filters_by_appointment_category_and_action():
    appointment, completion = _save_test_recommendation_completion(category='rescheduling', action='SMS')

    by_appointment = client.get('/api/recommendation-completions', params={'appointment_id': appointment['id']})
    by_category = client.get('/api/recommendation-completions', params={'category': 'rescheduling'})
    by_action = client.get('/api/recommendation-completions', params={'action': 'SMS'})

    assert completion['id'] in {item['id'] for item in by_appointment.json()}
    assert all(item['appointment_id'] == appointment['id'] for item in by_appointment.json())
    assert completion['id'] in {item['id'] for item in by_category.json()}
    assert all(item['category'] == 'rescheduling' for item in by_category.json())
    assert completion['id'] in {item['id'] for item in by_action.json()}
    assert all(item['action_taken'] == 'SMS' for item in by_action.json())


def test_recommendation_completion_date_range_is_inclusive_and_filters_combine():
    appointment, completion = _save_test_recommendation_completion(category='follow_up_reminder', action='Email')
    completion_day = date.fromisoformat(completion['completed_at'][:10]).isoformat()

    by_date = client.get(
        '/api/recommendation-completions',
        params={'start_date': completion_day, 'end_date': completion_day},
    )
    combined = client.get(
        '/api/recommendation-completions',
        params={
            'patient_search': appointment['patient_id'],
            'appointment_id': appointment['id'],
            'category': 'follow_up_reminder',
            'action': 'Email',
            'start_date': completion_day,
            'end_date': completion_day,
        },
    )

    assert completion['id'] in {item['id'] for item in by_date.json()}
    assert [item['id'] for item in combined.json()] == [completion['id']]


def test_recommendation_completion_empty_unfiltered_response_and_date_validation():
    unfiltered = client.get('/api/recommendation-completions')
    empty = client.get('/api/recommendation-completions', params={'patient_search': 'no-such-patient-xyz'})
    reversed_range = client.get(
        '/api/recommendation-completions',
        params={'start_date': '2026-11-06', 'end_date': '2026-11-05'},
    )
    invalid_date = client.get('/api/recommendation-completions', params={'start_date': 'not-a-date'})

    assert unfiltered.status_code == 200
    assert isinstance(unfiltered.json(), list)
    if unfiltered.json():
        assert {'id', 'appointment_id', 'category', 'action_taken', 'status', 'completed_at'} <= set(unfiltered.json()[0])
        assert unfiltered.json() == sorted(
            unfiltered.json(),
            key=lambda item: (item['completed_at'], item['id']),
            reverse=True,
        )
    assert empty.status_code == 200
    assert empty.json() == []
    assert reversed_range.status_code == 400
    assert invalid_date.status_code == 422
