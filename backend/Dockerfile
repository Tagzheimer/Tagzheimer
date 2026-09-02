# Multi-stage build for the Tagzheimer backend — Bun runtime.
#
# Bun image is ~150 MB (vs ~250 MB for node:20-alpine) and boots faster.
# Bun also handles the install step itself, no separate npm step.

FROM oven/bun:1.4 AS runtime

# tini for proper signal handling (graceful shutdown on SIGTERM)
# curl for the Docker HEALTHCHECK
USER root
RUN apt-get update && \
    apt-get install -y --no-install-recommends tini curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy just the manifest first for layer caching
COPY package.json bun.lock ./

# Install production deps
RUN bun install --frozen-lockfile --production

# Copy application source
COPY . .

# Create a non-root user for security
RUN groupadd --system tagz && \
    useradd --system --gid tagz --home-dir /app --no-create-home tagz && \
    chown -R tagz:tagz /app
USER tagz

ENV NODE_ENV=production \
    PORT=5000

# Healthcheck — pings the health endpoint every 30s
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -fsS http://localhost:${PORT}/api/health || exit 1

EXPOSE 5000

# Use tini as init process for proper signal forwarding
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "run", "server.js"]
