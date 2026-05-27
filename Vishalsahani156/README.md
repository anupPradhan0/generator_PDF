# MERN PDF Generator (TypeScript)

## Features

- JWT auth (register/login/logout)
- Protected API routes
- A4 multi-page PDF generation (`pdf-lib`)
- PDF preview + download
- Dashboard: list, search, edit, delete PDF records

## Project layout

- `frontend/` - React + TypeScript + Tailwind + Axios
- `backend/` - Node.js + Express + TypeScript + MongoDB + Mongoose

## Run with Docker Compose (local URLs only)

All services use **localhost** in the browser. MongoDB uses the Docker service name `mongo` inside the network (not a cloud URL).

```bash
cd generator_PDF/Vishalsahani156
docker compose up -d --build
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:5000 |
| MongoDB  | localhost:27017 (host port) |

Stop:

```bash
docker compose down
```

Logs:

```bash
docker compose logs -f
```

Environment variables for Docker are defined in `docker-compose.yml` (no cloud MongoDB URI required).

## Local setup without Docker (optional)

### 1) MongoDB in Docker only

```bash
docker compose up -d mongo
```

### 2) Env file for host-run backend

```bash
cp .env.example .env
```

Set `MONGODB_URI=mongodb://localhost:27017/pdf_generator` in `.env`.

### 3) Backend

```bash
cd backend
npm install
npm run dev
```

### 4) Frontend

Stop the Docker frontend first so port 5173 is free and `node_modules` is not recreated as root:

```bash
docker compose stop frontend
```

```bash
cd ../frontend
npm install
npm run dev
```

If `npm install` fails with **EACCES** (Docker left `node_modules` owned by root):

```bash
sudo chown -R "$USER:$USER" node_modules
rm -rf node_modules
npm install
npm run dev
```

Or run the helper script (fixes permissions, installs, starts Vite):

```bash
./dev.sh
```
