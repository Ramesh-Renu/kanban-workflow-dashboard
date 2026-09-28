# Orion PLG API (Python)

FastAPI + SQLAlchemy + PostgreSQL. It replaces Azure AD sign-in with username/password login and JWTs, and serves the core Orion APIs (users, workspaces, boards, permissions, master data) on the **same paths** the React app already calls.

## Run it (Docker)

```bash
cd backend
cp .env.example .env          # then set JWT_SECRET and ADMIN_PASSWORD
docker compose -p orion-plg up -d --build
```

- API: http://localhost:8000 (interactive docs at http://localhost:8000/docs)
- PostgreSQL: `localhost:5440`, db `kanban`, user `kanban`, password `kanban` (override with `POSTGRES_PASSWORD`)

On start, the API creates the tables, seeds master data and creates the super admin from `ADMIN_*` in `.env`. Running it again is safe.

Then start the UI against it from the repo root:

```bash
npm run start:internal:local   # uses .env.localapi → REACT_APP_PLG_API_BASE_URL=http://localhost:8000
```

## Run it without Docker

Python 3.12+ and a PostgreSQL database are required.

```bash
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
python -m scripts.init_db --admin-username admin --admin-email admin@example.com
uvicorn app.main:app --reload --port 8000
```

## Users

- **Create a login:** `python -m scripts.create_user jdoe jdoe@example.com "John Doe"`, or have an admin call `POST /master/auth/accounts`. In Docker, prefix the command with `docker compose -p orion-plg exec api`.
- **Give them access:** in the UI, go to Settings → Users → Add. The account shows in the user picker, where you set team, designation and user type, and then board and app permissions.
- **Password reset (admin):** `POST /master/auth/reset-password`. **Self-service:** `POST /master/auth/change-password`.

## Auth design

| | |
|---|---|
| Passwords | bcrypt |
| Access token | JWT HS256, 60 min (`ACCESS_TOKEN_MINUTES`), `Authorization: Bearer …` |
| Refresh token | random 64-byte token, 7 days, **stored only as SHA-256**, single-use (rotated on every refresh). Replaying a used token revokes all of that user's sessions |
| Brute force | account locks for 15 min after 5 failed logins |
| Logout | `PUT /master/api/AdManagement/sign-out` revokes the refresh token |

The UI refreshes the access token automatically on a 401 and retries the request once. If the refresh fails, it signs the user out.

## Endpoints implemented

| Area | Paths |
|---|---|
| Auth | `POST /master/auth/login`, `/refresh`, `/logout`, `/change-password`, `/accounts`, `/reset-password`; `PUT /master/api/AdManagement/sign-out` |
| Current user | `GET /master/api/Login/userinfo`, `/userdetail/{id}` |
| Users | `POST /UserManagement/api/UserManagement/get-user-list`, `add-user`, `update_user_type`; board and app permission get/add; `GET /master/api/AdManagement/ad-users` |
| Workspaces | `GET getworkspacewithboards`, `getallworkspace`, `BoardManagement/boards`; `POST addupdateworkspace`, `addupdateboard`; `DELETE deleteworkspaceboard` (soft delete) |
| Masters | `status-type?type=`, teams, designations, countries, roles, apps |

**Anything else** (tasks, orders, dashboards, knowledge base, notifications, …) answers `501` until it is ported. You can instead set `LEGACY_API_BASE_URL` to forward those calls to the old .NET backend. The old backend only validates Azure AD tokens, though, so forwarded calls fail until it is configured to trust this API's JWT (same `JWT_SECRET`/issuer).

## Database

- **Schema:** 99 tables, including the entities integrated from the Orion `plg_testing` database.
  - Models: `app/models/` (one module per area).
  - Mapping from Orion: `db/ORION_KANBAN_SCHEMA_ANALYSIS.md`.
  - Generated DDL: `db/schema.sql`. Regenerate it with `python -m scripts.init_db --sql > db/schema.sql`.
- **User ids:** UUIDs, like Orion's `RegId`.
- **Migrations:** Alembic, in `migrations/versions/`. The API applies them on start via `scripts.init_db`. To change the schema:
  ```bash
  # edit app/models/…, then (DB at head):
  docker compose -p orion-plg run --rm --no-deps -u root -v "$PWD/migrations:/srv/migrations" api \
    alembic revision --autogenerate -m "describe change"
  # review the generated file, then restart the api (or: alembic upgrade head)
  ```
  Never create or alter tables by hand.
- **Fixed ids the UI depends on:**
  - User types 45 = Admin, 46 = User, 47 = Inactive.
  - Workflow types 59 = Tool, 60 = Task.
  - Hub apps 114–120.

## Tests

The tests run against a real PostgreSQL database. They **drop the whole schema**, rebuild it through the migrations, and empty every table before each test, so point them at a throwaway database:

```bash
# once, as the container's superuser: `kanban` on a fresh volume, `orion` on the original dev volume
docker compose -p orion-plg exec db psql -U kanban -d postgres -c "CREATE DATABASE kanban_test OWNER kanban"
docker compose -p orion-plg run --rm --no-deps -e DATABASE_URL=postgresql+psycopg://kanban:kanban@db:5432/kanban_test api python -m pytest -q
```
