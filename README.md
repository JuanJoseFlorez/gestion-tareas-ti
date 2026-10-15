# IT Task Management

Web app to manage IT service requests and their assignment to technicians.

| Folder      | Stack                                        |
| ----------- | -------------------------------------------- |
| `backend/`  | Node.js 24, Express 5, TypeScript, Prisma 7  |
| `frontend/` | Angular 21, TypeScript                       |
| `db`        | PostgreSQL 17 (Docker)                       |

## Requirements

- Docker + Docker Compose
- Node.js 24+ (local development only)

## Run with Docker

```bash
cp .env.example .env
docker compose --profile full up --build
```

- App: http://localhost:8080
- API: http://localhost:3000/api/v1/health

Migrations and seed data (technicians, service types, sample requests) are applied automatically when the API container starts.

## Local development

```bash
cp .env.example .env
docker compose up -d db

cd backend
npm install
npx prisma migrate dev
npm run db:seed
npm run dev          # http://localhost:3000

cd ../frontend
npm install
npm start            # http://localhost:4200
```

## Tests

```bash
docker compose --profile test up -d db-test   # PostgreSQL on port 5433

(cd backend && npm test)
(cd frontend && npm test)
```

## Environment variables

See [`.env.example`](.env.example). A single `.env` at the repository root is shared by Docker Compose and the backend.
