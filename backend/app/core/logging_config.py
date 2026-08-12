"""
Structured logging setup, applied once at app startup (see app/main.py).
"""
import logging
import sys

from app.core.config import settings

LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"


def configure_logging() -> None:
    """Configure the root logger. Idempotent — safe to call more than once."""
    root_logger = logging.getLogger()
    root_logger.setLevel(settings.LOG_LEVEL.upper())

    # Avoid duplicate handlers if configure_logging() runs more than once
    # (e.g. under a test suite that imports the app multiple times).
    if root_logger.handlers:
        return

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter(LOG_FORMAT))
    root_logger.addHandler(handler)

    # Quiet down noisy third-party loggers unless we're debugging.
    if not settings.DEBUG:
        logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
        logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Module-scoped logger factory — use `logger = get_logger(__name__)`."""
    return logging.getLogger(name)
