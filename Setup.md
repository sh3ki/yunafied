# Setup Guide

This file contains complete setup steps for running Yunafied on another computer.

It includes two flows:
- First-time setup (new machine)
- Update existing local copy using git pull

## 1) Prerequisites

Install these first:
- Git
- Node.js 20+ (LTS recommended)
- npm (comes with Node)
- PostgreSQL database access (Neon or another Postgres host)
- Optional for mobile app: Expo Go app on phone

## 2) First-Time Setup (New Machine)

Open PowerShell and run the following commands.

### 2.1 Clone repository and open folder

```powershell
git clone https://github.com/sh3ki/yunafied.git
cd yunafied
```

### 2.2 Install dependencies (root + backend + mobile)

```powershell
npm install
npm install --prefix backend
npm install --prefix mobile-app
```

### 2.3 Create environment files from templates

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
```

### 2.4 Configure environment values

Edit these files:
- `.env`
- `backend/.env`

Set values at minimum:

In `.env`:
- `VITE_API_URL=http://localhost:4000`

In `backend/.env`:
- `PORT=4000`
- `DATABASE_URL=<your_postgres_connection_string>`
- `JWT_SECRET=<your_strong_secret>`
- `GROQ_API_KEY=<your_groq_api_key>`
- `CLOUDINARY_CLOUD_NAME=<your_cloud_name>`
- `CLOUDINARY_API_KEY=<your_cloudinary_api_key>`
- `CLOUDINARY_API_SECRET=<your_cloudinary_api_secret>`

### 2.5 Run DB migrate and seed

```powershell
npm run db:check --prefix backend
npm run db:init --prefix backend
npm run db:seed --prefix backend
npm run db:seed:gamified --prefix backend
npm run db:check --prefix backend
```

### 2.6 Start the system

Run frontend + backend together:

```powershell
npm run dev
```

Alternative (separate terminals):

Terminal 1:
```powershell
npm run dev:frontend
```

Terminal 2:
```powershell
npm run dev:backend
```

### 2.7 Open app in browser

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`

### 2.8 Demo users after seeding

Default password for seeded users: `password`

- admin@yuna.edu
- teacher@yuna.edu
- student@yuna.edu

## 3) Existing Local Copy (Update with git pull)

If the project is already cloned in your other computer, run this:

```powershell
cd <your-local-path>/yunafied
git pull origin master
npm install
npm install --prefix backend
npm install --prefix mobile-app
npm run db:init --prefix backend
npm run db:seed --prefix backend
npm run db:seed:gamified --prefix backend
npm run dev
```

Notes:
- Keep your `.env` and `backend/.env` values correct for that computer.
- If database schema changed, always run `db:init` again before seeding.

## 4) Mobile App Setup (Optional)

### 4.1 Configure mobile API URL

Update `mobile-app/app.json` under `expo.extra.apiUrl`.

Examples:
- Android emulator: `http://10.0.2.2:4000`
- Physical phone on same Wi-Fi: `http://<your-lan-ip>:4000`

### 4.2 Start mobile app

```powershell
npm run mobile:start
```

Other options:

```powershell
npm run mobile:start:lan
npm run mobile:start:tunnel
```

## 5) Useful Commands

From project root:

```powershell
npm run dev
npm run dev:frontend
npm run dev:backend
npm run build
npm run build:backend
npm run db:seed:gamified
```

From backend folder (or use `--prefix backend` from root):

```powershell
npm run db:check
npm run db:init
npm run db:seed
npm run db:seed:gamified
```

## 6) Quick Troubleshooting

- Backend fails to start:
  - Check `backend/.env` values, especially `DATABASE_URL` and `JWT_SECRET`.
- AI endpoints fail:
  - Verify `GROQ_API_KEY` is set in `backend/.env`.
- Profile image upload fails:
  - Verify all `CLOUDINARY_*` variables.
- Mobile cannot reach backend:
  - Do not use localhost on physical device; use LAN IP or tunnel mode.
- DB errors after updates:
  - Run migrations again: `npm run db:init --prefix backend`.

## 7) Verified DB Refresh Command Set (Migrate + Seed)

This is the exact command set to refresh a new/changed database:

```powershell
npm run db:check --prefix backend
npm run db:init --prefix backend
npm run db:seed --prefix backend
npm run db:seed:gamified --prefix backend
npm run db:check --prefix backend
```
