# Docker build & run

Build the image (from repo root):

```bash
docker build -t promptminder:latest .
docker build -t promptminder:0.1.0 .
```

Run the container (port 3000):

```bash
docker run --rm -p 3000:3000 promptminder:latest
```

If you use Docker Compose, map volumes and environment as needed.

Docker Compose (app + Postgres):

1. Copy `.env.sample` to `.env` and fill in secrets:

```bash
cp .env.sample .env
# Edit .env to set SUPABASE_URL / keys or other secrets
```

2. Start services:

```bash
docker compose up --build
```

Postgres will execute SQL files stored in the repository `./sql/` automatically during initial container startup (they are mounted into `/docker-entrypoint-initdb.d`). For applying the SQL files to an existing DB, use the helper script:

```bash
./docker/init-db.sh "postgresql://promptminder:promptminder@localhost:5432/promptminder"
```

