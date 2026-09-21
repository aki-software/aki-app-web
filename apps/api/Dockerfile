# Use the official Node.js Alpine image as the base
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_CONFIG_MANAGE_PACKAGE_MANAGER_VERSIONS=false
RUN npm install -g pnpm@10.28.2

# 1. Pruner Stage - Isolate target workspace dependencies
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune --scope=api --docker

# 2. Builder Stage - Install dependencies and build
FROM base AS builder
WORKDIR /app

# First install the dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --config.manage-package-manager-versions=false

# Build the project
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=api...

# Setup the production image
FROM base AS runner

# OCI Labels for GHCR and Package traceability
LABEL org.opencontainers.image.source="https://github.com/aki-software/aki-app-web"
LABEL org.opencontainers.image.description="A.kit Platform API"
LABEL org.opencontainers.image.licenses="MIT"

# Install Chromium for Puppeteer PDF generation
RUN apk add --no-cache chromium

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs
USER nestjs

WORKDIR /app

# Set Puppeteer executable path to the installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy the built output from the builder stage
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./apps/api/package.json

# Copy internal workspace packages (contracts, design-tokens) required by symlinks
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

# Copy production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/node_modules ./apps/api/node_modules

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Add a health check to inform orchestrators when the API is ready for traffic
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health/ready || exit 1

# Start the application
CMD ["node", "apps/api/dist/main.js"]
