"""
Exceptions shared by url_service and redirect_service — both express
"no such URL" / "not usable right now" for the same underlying resource,
just from different endpoints (CRUD vs redirect). Consolidated here so the
two services don't drift with slightly different messages/status codes.
"""
from app.core.exceptions import AppError


class URLNotFoundError(AppError):
    def __init__(self, message: str = "Short URL not found."):
        super().__init__(message, status_code=404)


class URLGoneError(AppError):
    def __init__(self, message: str = "This short URL is no longer active."):
        super().__init__(message, status_code=410)


class AliasTakenError(AppError):
    def __init__(self, message: str = "This alias is already taken."):
        super().__init__(message, status_code=409)


class AliasReservedError(AppError):
    def __init__(self, alias: str):
        super().__init__(
            f"'{alias}' is a reserved word and can't be used as an alias.", status_code=422
        )


class ShortCodeGenerationError(AppError):
    def __init__(self):
        super().__init__(
            "Could not generate a unique short code. Please try again.", status_code=500
        )
