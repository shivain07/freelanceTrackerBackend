# Freelancer Project & Invoice Tracker - Backend API

Production-grade RESTful API built with Node.js (ES Modules / ESM), Express, PostgreSQL, and Passport.js Google OAuth 2.0 authentication.

---

## 1. Prerequisites

Before running the backend, make sure you have the following installed:
- **Node.js**: Version 18.x or later ([Download Node.js](https://nodejs.org/))
- **npm**: Version 9.x or later (bundled with Node.js)
- **PostgreSQL**: Version 14.x or later ([Download PostgreSQL](https://www.postgresql.org/download/))

---

## 2. Setting Up Google OAuth 2.0

To enable Google sign-in:

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `freelancer-tracker`).
3. Navigate to **APIs & Services** > **OAuth consent screen**:
   - Choose **External** (or Internal for Workspace).
   - Enter your App name, user support email, and developer contact email.
   - Save and continue through Scopes (default `email`, `profile`, `openid` are required).
4. Navigate to **APIs & Services** > **Credentials**:
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Select **Web application** as the application type.
   - Set **Name**: `Freelancer Tracker Backend`.
   - Under **Authorized JavaScript origins**, add:
     - `http://localhost:3001`
     - `http://localhost:5173`
   - Under **Authorized redirect URIs**, add:
     - `http://localhost:3001/auth/google/callback`
   - Click **Create**.
5. Copy your **Client ID** and **Client Secret**.

---

## 3. Database Initialization

1. Create a PostgreSQL database (e.g. `freelancer_tracker`):
   ```bash
   createdb -U postgres freelancer_tracker
   ```
   *(Or using `psql`: `CREATE DATABASE freelancer_tracker;`)*

2. Run the initialization script located at `db/init.sql`:
   ```bash
   psql -U postgres -d freelancer_tracker -f ../db/init.sql
   ```
   *(On Windows PowerShell from project root)*:
   ```powershell
   psql -U postgres -d freelancer_tracker -f .\db\init.sql
   ```

This script provisions:
- `users`: Stores user profiles and Google IDs.
- `clients`: Tracks client records and hourly rates.
- `projects`: Tracks project status (`active`, `completed`, `archived`).
- `tasks`: Supports multi-level hierarchical tasks with recursive relationships.
- `time_logs`: Logs hours worked per task with date and description.
- Performance indexes on all foreign keys and filter fields.

---

## 4. Environment Configuration

1. In the `backend` folder, duplicate `.env.example` to create `.env`:
   ```bash
   cp .env.example .env
   ```
   *(Or on Windows)*:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `.env` with your actual settings:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/freelancer_tracker
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   SESSION_SECRET=strong_random_session_secret_key_here
   PORT=3001
   CLIENT_URL=http://localhost:5173
   ```

---

## 5. Starting the Server

Install all dependencies and run the server:

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run in development mode with nodemon
npm run dev

# Or run in production mode
npm start
```

The server will start listening at `http://localhost:3001`.

---

## 6. Connecting to the Frontend

The frontend React/Vite application runs on `http://localhost:5173`.
- CORS is preconfigured to accept requests with credentials from `http://localhost:5173`.
- The Google login endpoint sets an HttpOnly `token` cookie. Send requests with credentials enabled (`credentials: 'include'` in `fetch` or Axios `withCredentials: true`) so the browser sends it.
- The current Google login endpoint returns JSON; it does not redirect the browser.

---

## 7. API Endpoint Reference

All resource endpoints require a valid application JWT in the `token` cookie (or an `Authorization: Bearer <token>` header).

### Authentication
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/auth/google` | Accepts `{ token }` from Google and returns the app user; sets the `token` cookie |

`GET /api/auth/status`, `GET /api/auth/logout`, and the OAuth redirect/callback routes are not currently registered by the server.

### Response and error codes

| Status | Meaning | Frontend action |
|---|---|---|
| `200 OK` | Request succeeded. Reads return `{ success: true, data }`; Google login returns `{ success: true, message, user }`. | Use the returned data. |
| `201 Created` | A client, project, task, or time log was created. | Treat as success and use `data`. |
| `400 Bad Request` | Request is missing required fields, contains invalid values, or has malformed JSON. Google login returns this when `token` is missing. | Correct the request; the user does not need to log in again. |
| `401 Unauthorized` | No app token was supplied, the app token is invalid/expired, or Google rejected the supplied login token. | For protected resource requests, ask the user to sign in again. For login, restart Google sign-in with a fresh credential. |
| `403 Forbidden` | Reserved for a validly authenticated user who lacks permission. The current API does not intentionally return this status; inaccessible owned resources are reported as `404`. | Do not infer that the user must sign in again. |
| `404 Not Found` | The URL is not registered, or the requested project/task/client relationship does not exist or is not accessible to this user. | Check the URL/resource; signing in again will not resolve it. |
| `502 Bad Gateway` | Google is unavailable or returns an unexpected failure while verifying an access token. | Show a temporary sign-in error and allow retry; do not treat it as an invalid login by itself. |
| `500 Internal Server Error` | Unexpected application or infrastructure failure. | Show a generic failure and allow retry; do not treat as an authentication failure. |

Error response bodies are not fully uniform yet: middleware and the central error handler use `{ success: false, error }`, the not-found handler uses `{ success: false, message }`, and controller validation responses use `{ success: false, message }` (the missing-Google-token response only has `error`). Frontend code should use the HTTP status as the primary signal and display `message` or `error` when present.

### Clients
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/clients` | List all clients belonging to authenticated user |
| `POST` | `/api/clients` | Create a new client (`{ name, email, hourly_rate }`) |

### Projects
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects` | Aggregated dashboard summary with calculated hours, total earned, pending and total tasks |
| `POST` | `/api/projects` | Create a new project (`{ client_id, title, status? }`) |

### Tasks
| Method | Route | Description |
|---|---|---|
| `GET` | `/api/projects/:projectId/tasks` | Hierarchically ordered task tree for a project using Recursive CTE |
| `POST` | `/api/tasks` | Create task (`{ project_id, title, parent_task_id? }`) |
| `PATCH` | `/api/tasks/:taskId` | Toggle or update task completion (`{ is_completed: true/false }`) |

### Time Logs
| Method | Route | Description |
|---|---|---|
| `POST` | `/api/time-logs` | Log hours worked (`{ task_id, hours, log_date?, description? }`) |
| `GET` | `/api/time-logs/task/:taskId` | Retrieve logged work entries for a specific task |

---

## Architecture Overview

The backend is organized into standard enterprise tiers:
- **`config/`**: Database pool connection (`pg`) and Passport OAuth strategy.
- **`middleware/`**: Authentication checks and request validation.
- **`controllers/`**: HTTP request parsing, status codes, and response serialization.
- **`services/`**: Business logic, data authorization checks, and parameterized SQL queries.
- **`routes/`**: Express route declarations grouping endpoints by resource.
