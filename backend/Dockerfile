# Stage 1 - build
FROM node:20-bullseye AS builder
WORKDIR /app
# Install dependencies (use package-lock for reproducible installs)
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy sources
COPY tsconfig.json .
COPY prisma ./prisma
COPY src ./src

# Prisma: generate client (if using Prisma)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build TypeScript
RUN npm run build    # assumes package.json has "build": "tsc"

# Stage 2 - runtime
FROM node:20-slim AS runner
WORKDIR /app

# Create non-root user for safety
RUN useradd --uid 1001 --create-home --shell /bin/bash appuser

# Copy only production deps and built output
COPY package.json package-lock.json ./
# Install production deps only
RUN npm ci --production=true

# Copy built code + prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Set env for production
ENV NODE_ENV=production
ENV PORT=5000

# Use non-root user
USER appuser

# Healthcheck (uses the app's health endpoint)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost:${PORT}/api || exit 1

EXPOSE 5000
CMD ["node", "dist/server.js"]