"""Normalize DATABASE_URL for SQLAlchemy + psycopg v3."""

from __future__ import annotations


def normalize_database_url(url: str) -> str:
    u = url.strip()
    if u.startswith("postgresql://") and not u.startswith("postgresql+"):
        return "postgresql+psycopg://" + u.removeprefix("postgresql://")
    return u
