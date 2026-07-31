# ---- Stage 1: build the React frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /app/frontend

# Backend URL is same-origin in production, so the API base is just "" (relative /api)
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

COPY frontend/package.json frontend/yarn.lock* ./
RUN corepack enable && yarn install --frozen-lockfile || yarn install

COPY frontend/ ./
RUN yarn build

# ---- Stage 2: backend runtime, serving the built frontend ----
FROM python:3.12-slim-trixie AS backend

# DejaVu fonts needed for ₹ symbol rendering in generated PDFs.
# Also force-upgrade openssl/libssl3: the version shipped in this base image
# has a known TLS handshake bug against MongoDB Atlas (TLSV1_ALERT_INTERNAL_ERROR).
RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    ca-certificates \
    && apt-get upgrade -y openssl libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Bring in the built frontend as static files served by FastAPI
COPY --from=frontend-build /app/frontend/build ./static

ENV ENVIRONMENT=production
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
