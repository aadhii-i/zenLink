"""
Importing every model module here ensures each one registers its table on
Base.metadata — required both for Alembic autogenerate and for SQLAlchemy
to resolve relationships between models declared in different files.
"""
from app.models.url import URL, URLClick
from app.models.user import User

__all__ = ["URL", "URLClick", "User"]
