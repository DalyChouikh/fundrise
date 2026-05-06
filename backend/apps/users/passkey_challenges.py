from django.core.cache import cache


def store_challenge(key: str, challenge: bytes, ttl: int = 60) -> None:
    """Store a WebAuthn challenge under key with a short TTL."""
    cache.set(key, challenge, timeout=ttl)


def pop_challenge(key: str) -> bytes | None:
    """Retrieve and immediately delete a challenge (single-use).

    Uses cache.add as a lightweight mutex to prevent two concurrent requests
    from consuming the same challenge (replay attack protection).
    """
    lock_key = f"{key}:lock"
    if not cache.add(lock_key, 1, timeout=5):
        return None
    try:
        value = cache.get(key)
        if value is not None:
            cache.delete(key)
        return value
    finally:
        cache.delete(lock_key)
