# Docker — Event Dashboard

Runs **MongoDB**, **Express API**, and **React (nginx)** as a production-oriented stack.

| Mode | Command | Use case |
|------|---------|----------|
| **Local / staging** | `docker compose up -d --build` | Quick start, Mongo without auth |
| **Production** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` | Mongo auth, JWT enforcement, resource limits |

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose v2 on Linux

---

## Quick start (local / staging)

From the `Anurag313y` folder:

```bash
copy .env.docker.example .env
# Optional: edit JWT_SECRET and APP_PORT

docker compose up -d --build
```

Open **http://localhost:3000** (or your `APP_PORT`).

- API is only reachable through nginx at **`/api`** (same origin).
- Backend and Mongo are **not** published to the host.
- Containers restart automatically (`unless-stopped`).

---

## Production deployment

### 1. Configure environment

```bash
copy .env.docker.example .env
```

Edit `.env` and set **strong** values:

| Variable | Required (prod) | Description |
|----------|-----------------|-------------|
| `JWT_SECRET` | Yes | Long random string (`openssl rand -hex 32`) |
| `MONGO_ROOT_USER` | Yes | MongoDB admin username |
| `MONGO_ROOT_PASSWORD` | Yes | MongoDB admin password |
| `CLIENT_URL` | Yes | Public app URL, e.g. `https://events.example.com` |
| `APP_PORT` | No | Host port mapped to nginx (default `3000`) |

### 2. Start production stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Production overlay enables:

- MongoDB authentication (`authSource=admin`)
- JWT secret validation at container start (refuses weak/default secret)
- Memory/CPU limits per service
- Healthchecks on mongo, API, and nginx
- Non-root API process (`node` user) with `dumb-init` for clean shutdown
- Unprivileged nginx (`nginxinc/nginx-unprivileged`) on port **8080** inside the container

### 3. Put HTTPS in front (recommended)

Expose only nginx (or a reverse proxy) on the internet. Examples:

- **Caddy / Traefik / nginx** on the host terminating TLS → proxy to `localhost:3000`
- **Cloud**: Railway, Render, Fly.io, AWS ECS — set `CLIENT_URL` to your HTTPS domain

Update `CLIENT_URL` in `.env` to match the public URL (required for CORS).

---

## Architecture

```
Browser → :APP_PORT (host) → frontend:8080 (nginx)
                                    ↓ /api
                              backend:5001 (Express)
                                    ↓
                              mongo:27017 (MongoDB)
```

---

## Useful commands

```bash
# View status
docker compose ps

# Follow logs
docker compose logs -f backend
docker compose logs -f frontend

# Rebuild after code changes
docker compose up -d --build

# Stop (keep data)
docker compose down

# Stop and wipe MongoDB volume
docker compose down -v
```

Production variant — add `-f docker-compose.prod.yml` to any `docker compose` command.

---

## Environment reference

| Variable | Default (dev compose) | Notes |
|----------|----------------------|--------|
| `JWT_SECRET` | weak placeholder | **Must** change for production overlay |
| `CLIENT_URL` | `http://localhost:3000` | Must match browser origin |
| `APP_PORT` | `3000` | Maps to nginx `8080` in container |
| `MONGO_URI` | `mongodb://mongo:27017/...` | Overridden in prod overlay with auth |
| `MONGO_ROOT_USER` | — | Prod overlay only |
| `MONGO_ROOT_PASSWORD` | — | Prod overlay only |

---

## Production checklist

- [ ] Copy `.env.docker.example` → `.env` with strong secrets
- [ ] Set `CLIENT_URL` to your real public URL (HTTPS in production)
- [ ] Use `docker-compose.prod.yml` overlay
- [ ] Place TLS reverse proxy in front of the app
- [ ] Back up the `mongodb_data` volume regularly
- [ ] Do not commit `.env` to git

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| **Backend exits: JWT_SECRET** | Set a strong `JWT_SECRET` in `.env` when using prod overlay |
| **Backend unhealthy / 503 health** | Wait for Mongo; check `docker compose logs mongo` |
| **CORS / login fails** | `CLIENT_URL` must exactly match the URL in the browser |
| **Blank page** | Wait for frontend healthcheck; check `docker compose logs frontend` |
| **Mongo auth after enabling prod** | Existing volume may lack auth users — `docker compose down -v` then redeploy (wipes data) |
| **Port in use** | Change `APP_PORT` in `.env` |

---

## Image details

| Service | Base image | Notes |
|---------|------------|--------|
| `backend` | `node:22-alpine` | Multi-stage `npm ci --omit=dev`, non-root, healthcheck |
| `frontend` | `nginxinc/nginx-unprivileged` | Vite build + static assets, `/api` proxy, security headers |
| `mongo` | `mongo:7` | Persistent volume `mongodb_data` |
