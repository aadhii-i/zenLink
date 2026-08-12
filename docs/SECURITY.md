# Security

This documents what's actually implemented and verified — not just declared
in the original spec — plus known, deliberately-accepted risks with the
reasoning behind each. Update this file whenever `npm audit`/dependency
versions change; a stale security doc is worse than none.

## Implemented

### Rate limiting (Phase 6)
Redis-backed (`slowapi`/`limits`), keyed by client IP, so limits hold across
every app process/worker rather than resetting per-process:
- App-wide default: `RATE_LIMIT_PER_MINUTE` (default 60/min)
- `POST /api/v1/auth/register`, `/login`, `/refresh`: stricter
  `AUTH_RATE_LIMIT_PER_MINUTE` (default 5/min) — brute-force / mass-account
  protection
- `GET /api/v1/health` is exempt (polled frequently by Docker healthchecks)
- **Known tradeoff**: `limits`' Redis storage backend uses synchronous
  redis-py internally, not this app's async client, so each check makes a
  brief blocking call. Standard, widely-used pattern for FastAPI; no
  equally mature fully-async alternative exists. Sub-millisecond against a
  local Redis — not a concern at this scale.

### CORS
Explicit origin whitelist (`BACKEND_CORS_ORIGINS`) — never `"*"` with
credentials enabled, which browsers reject anyway and which would defeat
the point of the whitelist.

### Security headers
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
restricting geolocation/microphone/camera — applied to every response via
`SecurityHeadersMiddleware`. No `Content-Security-Policy`: this API also
serves Swagger UI (`/docs`) and ReDoc (`/redoc`), which load CDN assets by
default, and a strict global CSP would break them for marginal benefit on
a JSON API that doesn't render user content as HTML anywhere.

### SQL injection — verified, not assumed
Audited (`grep` for raw string interpolation into `.execute()`/`text()`):
every query goes through SQLAlchemy's ORM/Core query builder with
parameter binding. The only `text()` usage in the codebase is a static
literal (`SELECT 1` in the health check) with zero user input. The `sort_by`
list-query parameter is whitelisted against a fixed dict of real ORM
columns (`url_service.py::SORT_COLUMNS`) rather than ever being
interpolated into a query.

### XSS — verified, not assumed
Audited (`grep -r dangerouslySetInnerHTML`): zero occurrences anywhere in
the frontend. Every piece of user-controlled data (URLs, names, referrer
strings) is rendered through React's default JSX text interpolation, which
auto-escapes. Backend responses are JSON only — nothing renders raw HTML
server-side.

### Input sanitization
- `full_name`: whitespace-trimmed, control characters rejected
  (`core/sanitize.py`)
- `custom_alias`: regex-restricted to `[a-zA-Z0-9_-]+` — control
  characters, path separators, and HTML-special characters are already
  impossible
- `original_url`: restricted to `http`/`https` schemes only, enforced
  explicitly (`schemas/url.py::_validate_scheme`) rather than relying
  solely on Pydantic's `HttpUrl` default behavior — blocks `javascript:`,
  `data:`, `file:`, etc. from ever being stored as a redirect target

### Auth
- Passwords: bcrypt via the `bcrypt` library directly (not passlib — see
  `core/security.py` for why), never logged or returned in any response
- JWTs: separate `access`/`refresh` token types, enforced on every
  protected route (an access token can't be used to refresh; a refresh
  token can't authenticate a request)
- Refresh tokens are single-use: each one's `jti` is denylisted in Redis
  immediately after being exchanged, with a TTL matching its own remaining
  lifetime (`core/token_denylist.py`) — a replayed/stolen refresh token
  only works once
- Every URL CRUD/analytics endpoint enforces ownership server-side
  (`get_owned_url`/`_resolve_url_ids`) and returns 404 — not 403 — for
  another user's resource, so existence isn't leaked either way

## Known, accepted risks

### `react-router-dom` — CVE-2025-68470 (open redirect), moderate
**Not fixed. Investigated and deliberately left as-is — documented here
rather than silently ignored.**

Every version of `react-router-dom` (through its final release, 7.18.2) is
covered by one of two advisories once combined (open redirect via
backslash in `<Link>`/`useNavigate`, later superseded by an RSC-mode CSRF
advisory). The only genuinely fixed versions live under the renamed,
unified `react-router` package (v8.2.1+) — and every real published
version at or above that (8.3.0 is the first) requires **React ≥19.2.7**.

I attempted the migration (`react-router` v8 + updating all 10 import
sites from `react-router-dom` to `react-router`) and hit the React 19 peer
dependency wall via `npm install`. Forcing that additional React 18→19
upgrade blind — with no running browser available in this environment to
actually click through login/register/dashboard/analytics and catch
runtime-only breakage — was a worse outcome than staying on a verified,
working v6 setup with a known, narrow-scope advisory. `npm run build` and
`npm run lint` passing doesn't prove a React major-version migration is
safe; it only proves the code parses and type-shapes match.

**Why the practical risk is narrow in this specific codebase**: exploiting
the open redirect requires an attacker-controlled, backslash-prefixed path
reaching `<Link to={...}>` or `useNavigate()`. Every navigation target in
this app is either a static string or `location.state?.from?.pathname`
(React Router's own internal state from `ProtectedRoute`'s redirect) — never
a raw query parameter or other directly attacker-suppliable string.

**Real fix path**: upgrade React to 19, then `react-router-dom` →
`react-router` v8.3.0+, with actual browser testing (not just build/lint)
covering every page before merging. Worth doing as a dedicated, tested
migration — not a drive-by fix during a rate-limiting phase.

### Dev-tooling vulnerabilities (esbuild, vite, vitest, @vitest/mocker, vite-node)
**Not fixed — accepted, low practical risk.** All five are build/test-only
dependencies; none are ever shipped to a browser or a production server.
The specific advisories (esbuild's dev server accepting cross-origin
requests; a Vitest UI server file-read issue) require either running the
Vite dev server on an untrusted network while visiting malicious sites in
the same browser, or exposing Vitest's UI server (never done in this
project — `npm run test` runs headless via `vitest run`). Fixing requires
`vite@8.x` (from the currently-pinned `^5.4.11`), a major version jump
with its own migration risk, for a threat model that doesn't apply to how
this project is actually built/tested/deployed. Re-evaluate the pinned
`vite`/`vitest` versions the next time either is touched for an unrelated
reason.

## Not implemented (explicitly out of scope)
- **Geo-IP / country in analytics** — spec marks it optional; would need a
  bundled GeoIP database or a per-click network call. See
  `models/url.py::URLClick` docstring.
- **CSP** — see Security headers above.
- **Access-token revocation / server-side logout** — only refresh tokens
  are denylistable right now (see Auth above). There's no `/auth/logout`
  endpoint; the frontend just discards its local tokens. Adding real
  server-side session termination would need a logout endpoint that also
  denylists the current access token's `jti`.
