from datetime import date

from services.cache_service import cache_service
from tests.conftest import client


def _create_followup(action='Phone Call', notes='Filter test outreach'):
    appointment = client.get('/api/appointments').json()[0]
    response = client.post(
        '/api/followups',
        json={'appointment_id': appointment['id'], 'action': action, 'notes': notes},
    )
    assert response.status_code == 200
    return appointment, response.json()['followup']


def test_followup_database_updates():
    appointments_response = client.get('/api/appointments', params={'status': 'No-Show'})
    appointment = appointments_response.json()[0]

    before_stats = client.get('/api/appointments/stats').json()
    cache_service.cache.clear()

    followup_payload = {
        'appointment_id': appointment['id'],
        'action': 'Phone Call',
        'notes': 'Patient rescheduled for next week',
    }

    post_response = client.post('/api/followups', json=followup_payload)
    assert post_response.status_code == 200

    updated_appointment = client.get(f"/api/appointments/{appointment['id']}").json()
    assert updated_appointment['status'] == 'No-Show'
    assert updated_appointment['follow_up_status'] == 'Completed'
    assert updated_appointment['follow_up_action'] == 'Phone Call'
    assert updated_appointment['follow_up_notes'] == 'Patient rescheduled for next week'

    followups_response = client.get('/api/followups')
    assert followups_response.status_code == 200
    assert any(item['appointment_id'] == appointment['id'] and item['action'] == 'Phone Call' for item in followups_response.json())

    after_stats = client.get('/api/appointments/stats').json()
    assert after_stats['no_show_appointments'] == before_stats['no_show_appointments']
    assert after_stats['pending_followups'] <= before_stats['pending_followups']

    list_key = 'appointments:list:No-Show:all:all:all:all:appointment_date'
    cache_service.set(list_key, [{'appointment_id': appointment['id']}])
    client.post('/api/followups', json={'appointment_id': appointment['id'], 'action': 'SMS', 'notes': 'Second follow-up saved'})
    assert cache_service.get(list_key) is None


def test_dashboard_pending_followups_decreases_after_completed_followup_with_warm_cache():
    cache_service.invalidate()
    appointment = next(
        item for item in client.get('/api/appointments', params={'status': 'No-Show'}).json()
        if item['follow_up_status'] == 'Pending'
    )

    before_stats = client.get('/api/appointments/stats').json()
    assert before_stats['pending_followups'] > 0
    original_status = appointment['status']

    post_response = client.post(
        '/api/followups',
        json={
            'appointment_id': appointment['id'],
            'action': 'Phone Call',
            'notes': 'Completed the outstanding outreach.',
        },
    )
    assert post_response.status_code == 200

    after_stats = client.get('/api/appointments/stats').json()
    updated_appointment = client.get(f"/api/appointments/{appointment['id']}").json()
    assert after_stats['pending_followups'] == before_stats['pending_followups'] - 1
    assert updated_appointment['follow_up_status'] == 'Completed'
    assert updated_appointment['status'] == original_status == 'No-Show'


def test_appointment_list_exposes_latest_followup_without_changing_status_or_recommendation_progress():
    all_appointments = client.get('/api/appointments').json()
    existing_followup_ids = {item['appointment_id'] for item in client.get('/api/followups').json()}
    appointment = next(item for item in all_appointments if item['id'] not in existing_followup_ids)
    appointment_id = appointment['id']

    no_followup = next(item for item in client.get('/api/appointments').json() if item['id'] == appointment_id)
    assert no_followup['follow_up_recorded'] is False
    assert no_followup['latest_follow_up_action'] is None
    assert no_followup['latest_follow_up_notes'] is None
    assert no_followup['latest_follow_up_date'] is None
    assert no_followup['latest_follow_up_status'] is None
    original_status = no_followup['status']
    original_progress = (
        no_followup.get('recommendation_completion_count'),
        no_followup.get('recommendation_completion_total'),
        no_followup.get('recommendation_progress_status'),
    )

    first_response = client.post(
        '/api/followups',
        json={'appointment_id': appointment_id, 'action': 'Phone Call', 'notes': 'First outreach note'},
    )
    assert first_response.status_code == 200
    after_one = next(item for item in client.get('/api/appointments').json() if item['id'] == appointment_id)
    assert after_one['follow_up_recorded'] is True
    assert after_one['latest_follow_up_action'] == 'Phone Call'
    assert after_one['latest_follow_up_notes'] == 'First outreach note'
    assert after_one['latest_follow_up_date'] == first_response.json()['followup']['follow_up_date']
    assert after_one['latest_follow_up_status'] == 'Completed'

    second_response = client.post(
        '/api/followups',
        json={'appointment_id': appointment_id, 'action': 'SMS', 'notes': 'Latest outreach note'},
    )
    assert second_response.status_code == 200
    after_multiple = next(item for item in client.get('/api/appointments').json() if item['id'] == appointment_id)
    assert after_multiple['latest_follow_up_action'] == 'SMS'
    assert after_multiple['latest_follow_up_notes'] == 'Latest outreach note'
    assert after_multiple['latest_follow_up_date'] == second_response.json()['followup']['follow_up_date']
    assert after_multiple['latest_follow_up_status'] == 'Completed'
    assert after_multiple['status'] == original_status
    assert (
        after_multiple.get('recommendation_completion_count'),
        after_multiple.get('recommendation_completion_total'),
        after_multiple.get('recommendation_progress_status'),
    ) == original_progress


def test_followup_patient_search_matches_id_and_name():
    appointment, followup = _create_followup(notes='Patient search case')

    by_id = client.get('/api/followups', params={'patient_search': appointment['patient_id']})
    by_name = client.get('/api/followups', params={'patient_search': appointment['patient_name']})

    assert by_id.status_code == by_name.status_code == 200
    assert followup['id'] in {item['id'] for item in by_id.json()}
    assert followup['id'] in {item['id'] for item in by_name.json()}
    assert all(appointment['patient_id'].lower() in item['patient_id'].lower() for item in by_id.json())


def test_followup_filters_by_appointment_action_and_status():
    appointment, followup = _create_followup(action='Other', notes='Exact action filter')

    by_appointment = client.get('/api/followups', params={'appointment_id': appointment['id']})
    by_action = client.get('/api/followups', params={'action': 'Other'})
    by_status = client.get('/api/followups', params={'status': 'Completed'})

    assert followup['id'] in {item['id'] for item in by_appointment.json()}
    assert all(item['appointment_id'] == appointment['id'] for item in by_appointment.json())
    assert followup['id'] in {item['id'] for item in by_action.json()}
    assert all(item['action'] == 'Other' for item in by_action.json())
    assert followup['id'] in {item['id'] for item in by_status.json()}
    assert all(item['status'] == 'Completed' for item in by_status.json())


def test_followup_date_range_and_combined_filters_are_inclusive_and_composable():
    appointment, followup = _create_followup(action='Rescheduled', notes='Combined filter case')
    followup_day = date.fromisoformat(followup['follow_up_date'][:10]).isoformat()

    by_date = client.get('/api/followups', params={'start_date': followup_day, 'end_date': followup_day})
    combined = client.get(
        '/api/followups',
        params={
            'patient_search': appointment['patient_id'],
            'appointment_id': appointment['id'],
            'action': 'Rescheduled',
            'status': 'Completed',
            'start_date': followup_day,
            'end_date': followup_day,
        },
    )

    assert followup['id'] in {item['id'] for item in by_date.json()}
    assert [item['id'] for item in combined.json()] == [followup['id']]


def test_followup_empty_results_unfiltered_behavior_and_newest_first_order():
    appointment, older = _create_followup(action='Email', notes='Older follow-up')
    _, newer = _create_followup(action='SMS', notes='Newer follow-up')

    unfiltered = client.get('/api/followups')
    empty = client.get('/api/followups', params={'patient_search': 'no-such-patient-id-xyz'})

    assert unfiltered.status_code == 200
    assert isinstance(unfiltered.json(), list)
    assert older['id'] in {item['id'] for item in unfiltered.json()}
    assert newer['id'] in {item['id'] for item in unfiltered.json()}
    assert unfiltered.json() == sorted(
        unfiltered.json(),
        key=lambda item: (item['follow_up_date'], item['id']),
        reverse=True,
    )
    assert empty.status_code == 200
    assert empty.json() == []


def test_followup_date_range_validation():
    reversed_range = client.get('/api/followups', params={'start_date': '2026-11-06', 'end_date': '2026-11-05'})
    invalid_date = client.get('/api/followups', params={'start_date': 'not-a-date'})

    assert reversed_range.status_code == 400
    assert 'start_date' in reversed_range.json()['detail']
    assert invalid_date.status_code == 422
