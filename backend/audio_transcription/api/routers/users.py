from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from audio_transcription.api.deps import get_db
from audio_transcription.api.schemas import UserCreate, UserRead
from audio_transcription.db.models.user import User

router = APIRouter(prefix="/users", tags=["users"])


@router.post("", response_model=UserRead, status_code=201)
def create_user(body: UserCreate, session: Session = Depends(get_db)) -> User:
    raw = (body.email or "").strip().lower()
    user = User(email=raw or None)
    session.add(user)
    try:
        session.flush()
    except IntegrityError as e:
        session.rollback()
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        ) from e
    session.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserRead)
def get_user(user_id: uuid.UUID, session: Session = Depends(get_db)) -> User:
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user
