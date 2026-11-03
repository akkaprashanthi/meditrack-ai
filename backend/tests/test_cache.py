from services.cache_service import cache_service, invalidate_appointment_cache
from tests.conftest import client


def test_cache_hits_and_invalidation():
    cache_service.cache.clear()
    cache_service.hits = 0
    cache_service.misses = 0

    key = 'demo:test:key'
    cache_service.set(key, {'value': 42})
    assert cache_service.get(key) == {'value': 42}
    assert cache_service.hits >= 1

    invalidate_appointment_cache()
    assert cache_service.get(key) is None


def test_api_error_handling():
    response = client.get('/api/recommendations/99999999')
    assert response.status_code == 404
