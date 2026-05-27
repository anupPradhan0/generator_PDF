# Event Dashboard

MERN stack — customer **events** (name, mobile, event name, date), PDF export, auth. Lives in `Anurag313y/`.

```
Anurag313y/
├── frontend/           # React (Vite) + Tailwind + TanStack Query
├── backend/            # Express + Mongoose API
├── docker-compose.yml  # Mongo + API + nginx (production-style)
├── DOCKER.md           # Docker usage
└── README.md
```

## Local development (no Docker)

**Backend**

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

Vite proxies `/api` → `http://localhost:5001`. Open **http://localhost:5173**.

## Docker

See **[DOCKER.md](./DOCKER.md)**.

| Mode | Command |
|------|---------|
| Local / staging | `docker compose up -d --build` |
| Production | `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build` |

Open **http://localhost:3000** (set `CLIENT_URL` and secrets in `.env` for production).

Quick copy:

```bash
cd Anurag313y
copy .env.docker.example .env
# Edit JWT_SECRET in .env
docker compose up --build
```

## Health checks

- **Local API**: http://localhost:5001/api/health  
- **Docker UI**: nginx only — use http://localhost:3000/api/health (proxied)

## Frontend stack

- React Query hooks in `frontend/src/hooks/`
- DevTools in development

