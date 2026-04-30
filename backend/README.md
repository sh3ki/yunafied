# YUNAfied Backend

Node.js + Express + TypeScript backend connected to Neon PostgreSQL.

Implemented 40% modules:

- User Management (register/login + admin CRUD)
- Scheduling (create/view/delete)
- Assignment Management (post/view/submit with file upload)
- Grading and Feedback (simple grade + comment)
- Announcement Module (post/view)

## Setup

Install dependencies:

```bash
npm install
```

Run DB schema initialization:

```bash
npm run db:init
```

Seed demo accounts:

```bash
npm run db:seed
```

Start development server:

```bash
npm run dev
```

Install Python dependencies for video summarization:

```bash
pip install -r python/requirements.txt
```

## Environment

Copy `.env.example` to `.env` and set values:

- `PORT`
- `DATABASE_URL`
- `GROQ_API_KEY` (for summary generation)

## Available Scripts

- `npm run dev` - Start backend in watch mode.
- `npm run build` - TypeScript build to `dist`.
- `npm run start` - Run compiled backend.
- `npm run db:init` - Apply all SQL migrations in `sql/`.
- `npm run db:seed` - Seed admin/teacher/student demo users.
- `npm run db:check` - Test DB connection.

## API Endpoints

- `GET /api/health`
- `GET /api/health/db`
- `GET /api/users`
- `POST /api/users`
