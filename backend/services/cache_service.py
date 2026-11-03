import os
from threading import Lock

from cachetools import TTLCache


class CacheService:
    def __init__(self, ttl_seconds: int = 60):
        self.ttl_seconds = ttl_seconds
        self.cache = TTLCache(maxsize=256, ttl=ttl_seconds)
        self.lock = Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key):
        with self.lock:
            if key in self.cache:
                self.hits += 1
                return self.cache[key]
            self.misses += 1
            return None

    def set(self, key, value):
        with self.lock:
            self.cache[key] = value

    def invalidate(self, key=None, prefix=None):
        with self.lock:
            if key is not None:
                self.cache.pop(key, None)
                return
            if prefix:
                keys_to_delete = [k for k in self.cache.keys() if str(k).startswith(prefix)]
                for item_key in keys_to_delete:
                    self.cache.pop(item_key, None)
                return
            self.cache.clear()

    def stats(self):
        with self.lock:
            return {
                "ttl_seconds": self.ttl_seconds,
                "hits": self.hits,
                "misses": self.misses,
                "size": len(self.cache),
                "keys": list(self.cache.keys()),
            }


cache_service = CacheService(ttl_seconds=int(os.getenv("CACHE_TTL", "60")))


def invalidate_appointment_cache(appointment_id: int | None = None):
    if appointment_id is not None:
        cache_service.invalidate(prefix=f"appointments:detail:{appointment_id}")
        cache_service.invalidate(prefix="appointments:list")
        cache_service.invalidate(prefix="appointments:stats")
        cache_service.invalidate(prefix="analytics:")
    else:
        cache_service.invalidate()
