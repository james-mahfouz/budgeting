# Budgeting

Full-stack budgeting app workspace:

- `backend`: TypeScript Fastify API with JSON-file persistence, validation, seed data, budgets, transactions, and event analytics.
- `mobile`: Expo React Native app focused on Android with bottom tabs, launch-time add transaction modal, dashboard, transactions, budgets, analytics, and settings.

## Run it

```bash
cd budgeting
npm install
npm run seed
npm run dev:backend
```

In another terminal:

```bash
cd budgeting
npm run dev:android
```

Set `mobile/.env` if your Android emulator or physical device needs a different API URL.

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000
```

Android emulator uses `10.0.2.2` to reach your host machine. For a physical phone, use your computer's LAN IP, for example `http://192.168.1.12:4000`.

## Backend API

- `GET /health`
- `GET /api/categories`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/:id`
- `GET /api/budgets`
- `POST /api/budgets`
- `GET /api/analytics/summary`
- `GET /api/analytics/categories`
- `GET /api/analytics/cash-flow`
- `POST /api/events`

The app stores analytics events as simple product events such as app open, screen view, modal close, transaction create, and sync refresh. No third-party analytics SDK is included, so privacy remains easy to reason about.

## Deploy Backend With Docker

On your server:

```bash
git clone <your-github-repo-url> budgeting
cd budgeting
bash deploy.sh
```

For later deploys:

```bash
cd budgeting
bash deploy.sh
```

The script pulls the latest branch when an upstream is configured, builds `Dockerfile.backend`, starts `docker-compose.yml`, and checks `/health`.

Production settings live in `.env.production`. The script creates it from `.env.production.example` on first run. Backend data is stored in the Docker named volume `budgeting_backend-data`, so it survives rebuilds and container restarts.

Useful options:

```bash
SKIP_PULL=1 bash deploy.sh
SEED_ON_DEPLOY=1 bash deploy.sh
HOST_PORT=8080 bash deploy.sh
```

Use `SEED_ON_DEPLOY=1` only for demos because it overwrites transactions and budgets.
