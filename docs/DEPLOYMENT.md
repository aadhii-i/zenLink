# Deployment

## Local / self-hosted (docker-compose.prod.yml)

The most direct path if you have a VPS or any Docker host.

```bash
cp .env.example .env
```

Fill in `.env` with **real values** — `docker-compose.prod.yml` has no
`localhost` fallbacks for the values that must be real in production
(unlike `docker-compose.yml`, the dev file). At minimum:

| Variable | Must be set to |
| --- | --- |
| `SECRET_KEY` | A long random string — `python -c "import secrets; print(secrets.token_urlsafe(64))"` |
| `POSTGRES_PASSWORD` | A real password, not `change-me` |
| `BASE_URL` | Your backend's public URL (e.g. `https://api.yourdomain.com`) — this is what short links resolve to |
| `BACKEND_CORS_ORIGINS` | Your frontend's public URL — the backend will reject requests from any other origin |
| `VITE_API_URL` | Your backend's public URL + `/api/v1` — baked into the frontend bundle at **build** time (see below), can't be changed at runtime after the image is built |

Then:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This runs `alembic upgrade head` automatically before starting the
backend (see the `command:` override in that file) — the schema is always
current on deploy, no manual migration step.

### What this does and doesn't include
- ✅ Multi-stage builds: the backend production image has no compiler
  toolchain (only the already-compiled Python packages), runs as a
  non-root user; the frontend is a static build served by nginx, not the
  Vite dev server
- ✅ Postgres/Redis ports are **not** exposed to the host — only reachable
  from other containers on the compose network
- ❌ **No HTTPS/TLS termination and no reverse proxy bundled.** Put
  something in front — Caddy, nginx with certbot, Traefik, or your cloud
  provider's load balancer — that terminates TLS and forwards to the
  `frontend` (port 80) and `backend` (port 8000) containers. This is
  deliberately left out rather than bundled half-configured: certificate
  provisioning is environment-specific (a real domain, DNS pointed at the
  host, ACME challenge reachability) in a way a generic compose file can't
  responsibly assume.
- ❌ **No automated Postgres backups.** At minimum, cron a
  `pg_dump` of the `postgres_data` volume (or your managed Postgres
  provider's snapshot feature if you're not self-hosting the database).

### VITE_API_URL is a build-time value, not a runtime one
Vite inlines `import.meta.env.VITE_*` variables into the JavaScript bundle
when it builds — there's no "restart the container with a new env var" for
the frontend the way there is for the backend. If your backend's public
URL changes, rebuild the frontend image:
```bash
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Managed platforms (Railway / Render / Fly.io / a VPS)

The three services map cleanly onto separate managed deployments if you'd
rather not run Docker Compose yourself:

- **Backend**: any platform that runs a Dockerfile — point it at
  `docker/backend.Dockerfile`, target `production`. Needs the same env vars
  as above, plus a managed PostgreSQL and Redis add-on (most platforms
  offer both). The image's own `CMD` already runs `alembic upgrade head`
  before starting the server, so a bare single-container deploy (Render,
  Railway, Fly.io) migrates itself — no separate release/pre-deploy command
  needed. (If you scale the backend to multiple replicas, migrations run
  once per instance on boot; harmless for this project's additive
  migrations so far, but worth moving to a dedicated one-off release
  command instead if that ever changes.)
- **Frontend**: any static host (Vercel, Netlify, Cloudflare Pages) can
  build straight from `frontend/` with `npm run build` → publish `dist/`,
  no need for the nginx image at all in that case — just set `VITE_API_URL`
  as a build-time environment variable on the platform. If you do want the
  Docker route, `docker/frontend.Dockerfile`'s `production` target works
  the same way here.
- **Database/Cache**: any managed PostgreSQL 16+ and Redis 7+ work. Most
  platforms — Render included — hand you a single connection string rather
  than separate host/port/user/password values. Set that directly as a
  `DATABASE_URL` / `REDIS_URL` environment variable; the app prefers those
  over the discrete `POSTGRES_HOST`/`REDIS_HOST` fields when they're
  present (see `app/core/config.py`), and normalizes `postgres://` /
  `postgresql://` to the `postgresql+asyncpg://` scheme SQLAlchemy's async
  engine requires. Don't try to reverse-engineer host/port/user/password
  out of the connection string into the discrete vars instead — leaving
  `POSTGRES_HOST`/`REDIS_HOST` at their docker-compose defaults (`db`/
  `redis`) is fine and expected once `DATABASE_URL`/`REDIS_URL` are set,
  since those defaults are then simply unused.

## Pre-deployment checklist
- [ ] `SECRET_KEY` is a real random value, not the `.env.example` placeholder
- [ ] `POSTGRES_PASSWORD` is a real password
- [ ] `BASE_URL` and `BACKEND_CORS_ORIGINS` point at the real public URLs
- [ ] `VITE_API_URL` is correct **before** the frontend image is built
- [ ] `ENVIRONMENT=production` and `DEBUG=false` (already the default in
      `docker-compose.prod.yml`) — `DEBUG=true` echoes SQL statements to
      logs, which you don't want in production
- [ ] Something in front of the backend/frontend terminates TLS
- [ ] A backup strategy exists for the Postgres volume
- [ ] `GET /api/v1/health` returns `{"status": "ok", ...}` after deploy —
      it checks Postgres and Redis connectivity for real, not just that the
      process is running
