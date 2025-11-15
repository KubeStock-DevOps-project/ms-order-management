# Order Management Service

Implements the order management service with Express.js, PostgreSQL persistence, OpenAPI request validation, and Swagger UI at `/docs`.

## Features

- Express.js API matching the OpenAPI contract
- Swagger UI at `/docs` and raw JSON at `/api-docs.json`
- PostgreSQL persistence
- Prisma ORM (client generated from `prisma/schema.prisma`)
- OpenAPI request validation (`express-openapi-validator`)
- Idempotency on order creation (Idempotency-Key)
- Optimistic concurrency with `If-Match` header on PATCH
- In-memory store removed — fully DB-backed
- Basic CI workflow with Postgres service and Prisma schema sync

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 13+

### Environment
Copy `.env.example` to `.env` and adjust as needed:

```
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ms_order
```

### Install

```
npm install
```

This will also run `prisma generate` (via postinstall) to create the Prisma Client.

### Database
Sync the schema using Prisma (creates tables on a fresh database):

```
npx prisma db push
```

Note: We're using Prisma to manage the schema. If you prefer versioned migrations, adopt Prisma Migrate (e.g., `prisma migrate dev` for development and `prisma migrate deploy` for CI/CD) and commit the generated migrations.

### Run

```
npm start
```

- App: http://localhost:${PORT}
- Swagger: http://localhost:${PORT}/docs

### Docker

Build and run the service container. Ensure your database is reachable from the container.

```
# Start a local database
docker run --name ms-order-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=ms_order -p 5432:5432 -d postgres:15

# Build the service
docker build -t ms-order:latest .

# Run the service (adjust DATABASE_URL as needed)
docker run -p 3000:3000 -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/ms_order ms-order:latest
```

## Database Creation SQL
Use the following SQL to create the database and user with appropriate privileges:

```sql
CREATE DATABASE ms_order;

CREATE USER postgres WITH PASSWORD 'postgres';

GRANT ALL PRIVILEGES ON DATABASE ms_order TO postgres;
 
GRANT ALL ON SCHEMA public TO postgres;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;
```

## Development Notes

- Prisma schema: `prisma/schema.prisma`
- Prisma client: generated at `node_modules/.prisma/client`
- Schema sync: `prisma db push` (or use Prisma Migrate)
- API validation: `src/app.js` via `express-openapi-validator`
- Routes: `src/routes/*`

## CI

GitHub Actions workflow `.github/workflows/ci.yml`:
- Spins up Postgres service
- Installs deps and runs `prisma generate`
- Syncs DB schema via `prisma db push`

## Next Steps
- Move remaining raw SQL in orders routes to Prisma (currently in progress)
- Add automated tests (supertest) and wire into CI
- Add response validation once payloads stabilize
- Add a health endpoint (`/healthz`) that checks DB connectivity
