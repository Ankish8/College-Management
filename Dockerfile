# College Management System - Production Dockerfile
# Multi-stage build for optimized production container

# Stage 1: Dependencies and Build
FROM node:20-alpine AS builder

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    ca-certificates

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including dev deps for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Copy environment file for build (will be overridden in production)
COPY .env.example .env

# Generate Prisma client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Stage 2: Production Runtime
FROM node:20-alpine AS runner

# Install system dependencies for runtime
RUN apk add --no-cache \
    dumb-init \
    postgresql-client \
    curl

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy package.json for runtime dependencies
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Create scripts directory and copy migration scripts
RUN mkdir -p /app/scripts
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# Set correct permissions
RUN chown -R nextjs:nodejs /app
RUN chmod +x /app/scripts/*.js

# Create health check script
RUN echo '#!/bin/sh\ncurl -f http://localhost:3000/api/health || exit 1' > /app/healthcheck.sh
RUN chmod +x /app/healthcheck.sh

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD /app/healthcheck.sh

# Start application with proper process manager
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]