from services.cache_service import cache_service
from tests.conftest import client


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
