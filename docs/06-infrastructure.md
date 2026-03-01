# SafePass — Infrastructure (Docker Compose)

Everything runs locally via Docker Compose. Three services: PostgreSQL, NestJS backend, React frontend.

## Services Overview

```
┌─────────────────────────────────────────────────────┐
│                   Docker Compose                     │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐       │
│  │  client   │───►│  server   │───►│    db    │       │
│  │ :5173     │    │ :3000     │    │ :5432    │       │
│  │ React     │    │ NestJS    │    │ Postgres │       │
│  └──────────┘    └──────────┘    └──────────┘       │
│                                                      │
│  Volume: pgdata (persistent DB storage)              │
└─────────────────────────────────────────────────────┘
```

## docker-compose.yml

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: safepass
      POSTGRES_USER: safepass
      POSTGRES_PASSWORD: ${DB_PASSWORD:-safepass_dev}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U safepass"]
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    build:
      context: ./apps/server
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://safepass:${DB_PASSWORD:-safepass_dev}@db:5432/safepass
      JWT_SECRET: ${JWT_SECRET:-dev_jwt_secret_change_me}
      NODE_ENV: development
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./apps/server/src:/app/src
      - server_node_modules:/app/node_modules

  client:
    build:
      context: ./apps/client
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    environment:
      VITE_API_URL: http://localhost:3000
    depends_on:
      - server
    volumes:
      - ./apps/client/src:/app/src
      - client_node_modules:/app/node_modules

volumes:
  pgdata:
  server_node_modules:
  client_node_modules:
```

## Environment Variables

File: `.env` (at project root, git-ignored)

```env
DB_PASSWORD=safepass_dev
JWT_SECRET=change_this_to_a_random_secret
```

| Variable      | Used By  | Description                          | Default               |
|---------------|----------|--------------------------------------|-----------------------|
| DB_PASSWORD   | db, server | PostgreSQL password                | safepass_dev          |
| JWT_SECRET    | server   | Secret for signing JWT tokens        | dev_jwt_secret_change_me |
| DATABASE_URL  | server   | Full PostgreSQL connection string    | Composed from above   |
| VITE_API_URL  | client   | Backend API URL for the frontend     | http://localhost:3000  |
| NODE_ENV      | server   | Node environment                     | development           |

## Dockerfiles

### Server (apps/server/Dockerfile)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]
```

- `start:dev` uses NestJS's built-in file watcher for hot reload
- Source code is bind-mounted (`volumes`) so changes on host reflect immediately
- `node_modules` stored in a named volume to avoid host/container platform conflicts

### Client (apps/client/Dockerfile)

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

- `--host 0.0.0.0` makes Vite accessible from outside the container
- Source is bind-mounted for hot module replacement (HMR)

## Development Workflow

### Docker Compose Commands

```bash
docker compose up              # Start all services
docker compose up --build      # Rebuild after dependency changes
docker compose down            # Stop everything
docker compose down -v         # Reset database (removes pgdata volume)
docker compose logs -f server  # Follow server logs
docker compose logs -f client  # Follow client logs
docker compose exec db psql -U safepass -d safepass  # Access DB directly
```

### Nx Commands

```bash
npx nx serve client            # Start React dev server (without Docker)
npx nx serve server            # Start NestJS dev server (without Docker)
npx nx build client            # Production build of frontend
npx nx build server            # Production build of backend
npx nx run-many -t build       # Build all projects in parallel
npx nx run-many -t lint        # Lint all projects in parallel
npx nx run-many -t test        # Test all projects in parallel
npx nx graph                   # Visualize project dependency graph
npx nx affected -t build       # Only build projects affected by changes
```

### Local Dev (without Docker)

For faster iteration, you can run the client and server directly with Nx while keeping only PostgreSQL in Docker:

```bash
docker compose up db           # Start only PostgreSQL
npx nx serve server            # In terminal 1
npx nx serve client            # In terminal 2
```

## Ports

| Service  | Internal Port | External Port | URL                          |
|----------|---------------|---------------|------------------------------|
| client   | 5173          | 5173          | http://localhost:5173        |
| server   | 3000          | 3000          | http://localhost:3000        |
| db       | 5432          | 5432          | postgresql://localhost:5432  |

## Health Checks

- **PostgreSQL**: `pg_isready` command, checked every 5s
- **Server**: depends on `db` with `condition: service_healthy` (waits for DB to be ready)
- **Client**: depends on `server` (starts after server is up)

## Data Persistence

- PostgreSQL data is stored in the `pgdata` Docker volume
- Data survives `docker compose down` but is lost with `docker compose down -v`
- No other persistent state — the frontend is stateless (key lives in memory only)

## .gitignore (project root)

```
node_modules/
dist/
.env
*.log
.DS_Store
.nx/cache
.nx/workspace-data
```
