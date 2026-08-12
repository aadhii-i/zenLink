"""
Aggregates every v1 endpoint router into a single `api_router`, mounted
once in app/main.py. New feature routers (auth, urls, analytics, ...) get
registered here as they're built in later phases.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import analytics, auth, health, urls

api_router = APIRouter()

api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(urls.router, prefix="/urls", tags=["URLs"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
