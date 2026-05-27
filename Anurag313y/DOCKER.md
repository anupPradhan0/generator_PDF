## Docker (full stack)

Runs **MongoDB**, **Express API**, and **React (nginx)** together.

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose on Linux

### Quick start

From the `Anurag313y` folder:

```bash
# Optional: set JWT (Compose also reads a root .env file automatically)
copy .env.docker.example .env
# Edit .env and set JWT_SECRET to a strong random value

docker compose up --build
```

Open **http://localhost:3000** (or the port in `APP_PORT` if you changed it).

API is available to the browser **only through nginx** at **`/api`** (same origin). The backend container is not published to the host by default.

### Useful commands

```bash
# Detached
docker compose up -d --build

# Logs
docker compose logs -f backend

# Stop
docker compose down

# Stop and remove DB volume (wipes Mongo data)
docker compose down -v
```

### Environment variables

| Variable        | Default | Description                          |
|----------------|---------|--------------------------------------|
| `JWT_SECRET`    | *(weak)* | **Set in production** (root `.env` or shell) |
| `APP_PORT`      | `3000`  | Published host port for the web UI   |

`CLIENT_URL` is set automatically to `http://localhost:<APP_PORT>` for CORS.

### Troubleshooting

- **Blank page**: wait for nginx + backend logs; reload after `frontend` container is healthy.
- **Mongo not ready**: `backend` waits on Mongo `healthcheck`; if it loops, check `docker compose logs mongo`.
- **Change JWT**: update `.env`, then `docker compose up -d --force-recreate backend`.
