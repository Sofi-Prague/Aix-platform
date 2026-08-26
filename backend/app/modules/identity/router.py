"""
Identity & Access

Owns public registration, authentication, session identity, and the current
user endpoint. Public registration deliberately controls tenant and role
assignment on the server: every newly registered user receives a new tenant
and the default ``author`` role.

Full role-based permissions are not implemented in this module yet; endpoint
access elsewhere is currently based on authentication and tenant ownership.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.auth import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.core.db import get_db
from app.core.models import User
from app.modules.identity.schemas import (
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserOut,
)

router = APIRouter(
    prefix="/identity",
    tags=["identity"],
)

bearer_scheme = HTTPBearer()


@router.get("/ping")
def ping():
    return {
        "module": "identity",
        "status": "ok",
    }


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: UserCreate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with that email already exists",
        )

    # Public registration must not allow the client to choose a tenant or
    # privilege level. Each registration creates a separate tenant and starts
    # with the default author role.
    user = User(
        tenant_id=uuid.uuid4(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="author",
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.email == payload.email)
        .first()
    )

    if (
        not user
        or not verify_password(
            payload.password,
            user.hashed_password,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    token = create_access_token(
        data={
            "sub": str(user.id),
            "role": user.role,
            "tenant_id": str(user.tenant_id),
        }
    )

    return TokenResponse(
        access_token=token,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_access_token(
        credentials.credentials
    )

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    subject = payload.get("sub")

    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = (
        db.query(User)
        .filter(User.id == subject)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return user


@router.get(
    "/me",
    response_model=UserOut,
)
def read_current_user(
    current_user: User = Depends(
        get_current_user
    ),
):
    return current_user
