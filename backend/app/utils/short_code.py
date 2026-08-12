"""
Base62 short-code generation.
"""
import secrets

# 0-9, A-Z, a-z — URL-safe, case-sensitive, no padding/separator characters.
_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def generate_short_code(length: int) -> str:
    """Cryptographically random Base62 string of the given length."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))
