# syntax=docker/dockerfile:1

# ---------- Base: shared system + Python deps ----------
FROM python:3.11-slim AS base

WORKDIR /app

# build-essential/libpq-dev compile bcrypt/asyncpg's C extensions during
# pip install; the production stage below copies the already-compiled
# result and never needs the compiler toolchain itself.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# ---------- Dev target: hot-reload, source bind-mounted by docker-compose.yml ----------
FROM base AS dev

COPY . .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# ---------- Production target: no reload, no compiler toolchain, non-root ----------
FROM python:3.11-slim AS production

WORKDIR /app

# Only the libpq *runtime* is needed here — libpq-dev/build-essential were
# only for compiling extensions, which already happened in `base`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

COPY . .

RUN useradd --create-home --shell /bin/bash appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Single process by default. Running multiple uvicorn workers means each
# gets its own DB connection pool (db/session.py) — revisit pool sizing in
# core/config.py before scaling workers up rather than just adding
# `--workers N` here.
#
# Runs migrations before starting the server. This matters on any platform
# that deploys this Dockerfile directly rather than through docker-compose
# (e.g. a plain Render/Railway/Fly Docker web service) — there's no
# docker-compose `command:` override to supply the `alembic upgrade head`
# step there, so without it here the schema is never created and every
# DB-touching request 500s while the process itself stays up and "healthy"
# (SQLAlchemy connects lazily; a passing /health only proves connectivity,
# not that the expected tables exist). docker-compose.prod.yml's own
# `command:` override still takes precedence when used, so this doesn't
# double-run anything there.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
