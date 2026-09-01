# Build the Vite app in the same image as the API.  The API serves the SPA from
# backend/public, so the frontend assets must be present in the runtime image.
FROM node:20-bullseye-slim AS frontend-build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --silent
COPY index.html vite.config.ts postcss.config.mjs .env.production ./
COPY src ./src
COPY public ./public
RUN npm run build:frontend

FROM node:20-bullseye-slim

# Install system packages: Python3, pip, ffmpeg and build tools needed by some Python packages
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    build-essential \
    pkg-config \
    libvips-dev \
    libvips-tools \
    libsndfile1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Copy package files first for caching installs
COPY backend/package.json backend/package-lock.json* ./

# Install Node deps (include dev deps to allow TypeScript build)
RUN npm install --legacy-peer-deps --production=false --silent

# Copy backend source and build
COPY backend/ .
RUN npm run build

# Replace the source-only backend/public directory with the compiled Vite app.
COPY --from=frontend-build /app/dist ./public

# Install Python requirements for transcription helper
COPY backend/python/requirements.txt /tmp/requirements.txt
RUN python3 -m pip install --upgrade pip setuptools wheel \
  && python3 -m pip install -r /tmp/requirements.txt

EXPOSE 4000

# Start the compiled Node backend
CMD ["node", "dist/index.js"]
