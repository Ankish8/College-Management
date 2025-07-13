# Multi-stage Dockerfile for College Management System
# Optimized for production with security and performance considerations

# ==============================================
# Stage 1: Dependencies (for caching efficiency)
# ==============================================
FROM node:18-alpine AS deps

# Security: Run as non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install security updates
RUN apk add --no-cache libc6-compat

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install dependencies with clean npm cache
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# ==============================================
# Stage 2: Builder (for application build)
# ==============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# ==============================================
# Stage 3: Runtime (production image)
# ==============================================
FROM node:18-alpine AS runner

# Security: Install security updates
RUN apk add --no-cache \
    dumb-init \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Environment settings
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma files for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create uploads directory for file storage
RUN mkdir -p /app/uploads && \
    chown -R nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server.js"]

# ==============================================
# Development Dockerfile
# ==============================================
FROM node:18-alpine AS development

# Install development dependencies
RUN apk add --no-cache libc6-compat git

WORKDIR /app

# Create non-root user for development
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Generate Prisma client
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# ==============================================
# Database Migration Dockerfile
# ==============================================
FROM node:18-alpine AS migrations

WORKDIR /app

# Install dependencies for migrations
RUN apk add --no-cache libc6-compat

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy Prisma schema and migrations
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Copy migration scripts
COPY scripts/migrate.sh ./scripts/

# Make migration script executable
RUN chmod +x ./scripts/migrate.sh

# Run migrations
CMD ["./scripts/migrate.sh"]

# ==============================================
# Testing Dockerfile
# ==============================================
FROM node:18-alpine AS testing

WORKDIR /app

# Install testing dependencies
RUN apk add --no-cache libc6-compat chromium

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Run tests
CMD ["npm", "run", "test:ci"]