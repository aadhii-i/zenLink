"""
Shared application-level exceptions.

Services raise AppError (or a subclass) for expected failure conditions
(not found, conflict, gone, ...); the global handler in app/main.py turns
it into a consistent JSON response, so routers don't need a repetitive
try/except around every service call.
"""


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)
