# Multi-stage build for the Tagzheimer frontend — Bun install + Vite build, served by nginx.
#
# Bun install is ~10× faster than npm, and the oven/bun image is smaller
# than node:20-alpine.

# === Stage 1: build ===
FROM oven/bun:1.4 AS build
WORKDIR /app

# Install deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Build with the backend URL baked in (set at build time via build arg)
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

# === Stage 2: serve (nginx is fine — Bun's static server is experimental) ===
FROM nginx:alpine AS serve

# nginx config that does SPA fallback (so react-router URLs work)
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA fallback — all unknown routes serve index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Cache hashed assets aggressively
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # Never cache the entry HTML
  location = /index.html {
    add_header Cache-Control "no-store";
  }

  # Security headers
  add_header X-Frame-Options "DENY" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "geolocation=(self), camera=(self), microphone=()" always;
}
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
