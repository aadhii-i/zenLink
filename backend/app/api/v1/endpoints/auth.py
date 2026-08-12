"""
Authentication endpoints: register, login, refresh, profile.

register/login/refresh carry a stricter rate limit than the app-wide
default (brute-force / mass-registration protection) — see
core/rate_limit.py. slowapi's decorator requires the route function to
accept `request: Request` so it can key the limit by client IP.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.deps import get_auth_service, get_current_user
from app.core.config import settings
from app.core.rate_limit import limiter
from app.models.user import User
from app.schemas.token import RefreshRequest, TokenResponse
from app.schemas.user import UserCreate, UserLogin, UserRead, UserUpdate
from app.services.auth_service import AuthError, AuthService

router = APIRouter()

_AUTH_LIMIT = f"{settings.AUTH_RATE_LIMIT_PER_MINUTE}/minute"


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
)
@limiter.limit(_AUTH_LIMIT)
async def register(
    request: Request,
    payload: UserCreate,
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    try:
        return await auth_service.register(payload)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.post("/login", response_model=TokenResponse, summary="Log in and receive JWT tokens")
@limiter.limit(_AUTH_LIMIT)
async def login(
    request: Request,
    payload: UserLogin,
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        user = await auth_service.authenticate(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return auth_service.issue_tokens(user)


@router.post(
    "/refresh", response_model=TokenResponse, summary="Exchange a refresh token for a new pair"
)
@limiter.limit(_AUTH_LIMIT)
async def refresh(
    request: Request,
    payload: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    try:
        return await auth_service.refresh_access_token(payload.refresh_token)
    except AuthError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


@router.get("/me", response_model=UserRead, summary="Get the current user's profile")
async def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user


@router.patch("/me", response_model=UserRead, summary="Update the current user's profile")
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    return await auth_service.update_profile(current_user, payload)
