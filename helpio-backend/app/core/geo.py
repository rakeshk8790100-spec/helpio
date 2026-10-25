"""Distances and masked labels shared by job matching and provider search (privacy before hire)."""
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_M = 6_371_000
METRES_PER_DEGREE = 111_320


def distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle (haversine) distance in metres."""
    dlat, dlng = radians(lat2 - lat1), radians(lng2 - lng1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(a))


def approx_km(metres: float) -> float:
    """Round to the nearest 0.5 km (at least 0.5) so nobody can pinpoint the other side."""
    return max(0.5, round(metres / 500) / 2)


def bounding_box(latitude: float, longitude: float, radius_m: float) -> tuple[float, float, float, float]:
    """(min_lat, max_lat, min_lng, max_lng) around a point: a cheap SQL pre-filter before exact distances."""
    dlat = radius_m / METRES_PER_DEGREE
    dlng = radius_m / (METRES_PER_DEGREE * max(cos(radians(latitude)), 0.01))
    return latitude - dlat, latitude + dlat, longitude - dlng, longitude + dlng


def short_name(name: str | None, fallback: str) -> str:
    """"Asha Kumar" → "Asha K."; used for both sides before hire."""
    parts = (name or "").split()
    if not parts:
        return fallback
    return f"{parts[0]} {parts[-1][0].upper()}." if len(parts) > 1 else parts[0]
