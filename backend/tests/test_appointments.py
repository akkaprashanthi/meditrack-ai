from fastapi.testclient import TestClient

from tests.conftest import client


def test_appointment_retrieval():
    response = client.get('/api/appointments')
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 20


def test_appointment_filtering():
    response = client.get('/api/appointments', params={'status': 'No-Show'})
    assert response.status_code == 200
    payload = response.json()
    assert all(item['status'] == 'No-Show' for item in payload)


def test_no_show_identification():
    response = client.get('/api/appointments', params={'status': 'No-Show'})
    assert response.status_code == 200
    assert any(item['status'] == 'No-Show' for item in response.json())


def test_invalid_appointment_id():
    response = client.get('/api/appointments/99999')
    assert response.status_code == 404
    assert 'not found' in response.json()['detail'].lower()


def test_appointment_sorting_by_patient_name_and_date():
    ascending = client.get('/api/appointments', params={'sort_by': 'patient_name', 'sort_desc': False})
    descending = client.get('/api/appointments', params={'sort_by': 'patient_name', 'sort_desc': True})
    assert ascending.status_code == descending.status_code == 200
    ascending_payload = ascending.json()
    descending_payload = descending.json()
    names = [item['patient_name'] for item in ascending_payload]
    descending_names = [item['patient_name'] for item in descending_payload]
    assert names == sorted(names)
    assert descending_names == sorted(descending_names, reverse=True)
    assert [item['id'] for item in ascending_payload] == [item['id'] for item in reversed(descending_payload)]

    dated = client.get('/api/appointments', params={'sort_by': 'appointment_date', 'sort_desc': False})
    assert dated.status_code == 200
    dates = [item['appointment_date'] for item in dated.json()]
    assert dates == sorted(dates)
