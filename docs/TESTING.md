# Testing

## Backend (pytest)

Requires a **real PostgreSQL and Redis** — not SQLite or a fake Redis. The
models use Postgres-specific UUID columns, and the app talks to Redis
directly for caching, rate limiting, and the refresh-token denylist,
so a faked backend wouldn't actually exercise that code.

```bash
# 1. Start just the datastores (no need to run the app itself)
docker-compose up -d db redis

# 2. Install test dependencies
cd backend
pip install -r requirements-dev.txt

# 3. Create the test database (separate from the dev one — tests never
#    touch shortlink_dev's data)
docker exec -it shortlink_db psql -U shortlink -c "CREATE DATABASE shortlink_test;"

# 4. Run the suite
pytest -v
```

`tests/conftest.py` creates all tables in `<POSTGRES_DB>_test` once per test
session and truncates every table between tests — no migrations are run
against the test database (it's built directly from the current
`Base.metadata`, not through Alembic, so schema drift between models and
migrations wouldn't be caught here — that's what `alembic upgrade head`
running in CI/deployment is for).

Redis tests use **DB 15** (`redis_client` fixture), flushed before and
after each test — isolated from dev data on DB 0 without needing a second
Redis instance.

### What's covered
- `test_health.py` — the app can actually reach both Postgres and Redis
- `test_auth.py` — register/login, weak-password rejection, duplicate
  email, profile get/update (including the partial-update fix from Phase
  6), refresh token rotation **and single-use enforcement** (the denylist),
  access/refresh token type-checking, and the auth-endpoint rate limit
- `test_urls.py` — random-code and custom-alias creation, alias
  collision/reserved-word rejection, non-http scheme rejection, list
  pagination/search, **cross-user ownership isolation** (404, not 403, for
  someone else's URL), update, delete, stats
- `test_redirect.py` — 404/410 handling, a redirect actually recording a
  click (background task), and — a real regression test — that updating a
  URL invalidates its Redis cache entry rather than continuing to redirect
  to the old destination

### A note on how these were verified
I don't have a running PostgreSQL/Redis or `pip` available in the sandbox
this project was built in, so this suite has been written carefully and
syntax-checked (`python -m py_compile`) but **not executed**. Run it for
real before relying on it — that's the whole point of writing it down
rather than leaving it as a claim.

## Frontend (Vitest + React Testing Library)

These **were** actually run, not just written — this sandbox has Node.

```bash
cd frontend
npm install
npm test        # vitest run
```

Covers `NotFound` (basic render), `ProtectedRoute` (loading/redirect/
authenticated states, with `useAuth` mocked), `Navbar` (auth-aware
rendering, with `useAuth`/`useTheme` mocked), and `Register` (the
client-side password-requirement checklist and confirm-password mismatch
logic). Hooks are mocked with `vi.mock` rather than exercising the real
`AuthProvider` network flow — these are component/unit tests, not
end-to-end integration tests against a live API.

`npm run lint` (ESLint, `--max-warnings 0`) and `npm run build` are also
part of the verification loop for every change in this project — both are
zero-warning/zero-error as of the last commit.
