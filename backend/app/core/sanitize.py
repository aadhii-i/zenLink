"""
Shared input-sanitization helpers for Pydantic field validators.

Note on scope: this app is a JSON API consumed by a React frontend that
renders all user-controlled text via JSX interpolation (never
dangerouslySetInnerHTML — verified, not assumed), so stored-XSS via HTML/
script tags in free-text fields isn't actually exploitable in this
architecture the way it would be for a server that renders HTML directly.
What's still worth enforcing at the boundary regardless: no raw control
characters (which can corrupt logs, terminals, or downstream exports) and
no leading/trailing whitespace noise.
"""
import re

_CONTROL_CHAR_PATTERN = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def sanitize_text(value: str) -> str:
    """Strip surrounding whitespace and reject embedded control characters."""
    cleaned = value.strip()
    if _CONTROL_CHAR_PATTERN.search(cleaned):
        raise ValueError("Input contains invalid control characters.")
    return cleaned
