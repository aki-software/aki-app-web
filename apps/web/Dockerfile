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
RUN turbo prune --scope=web --docker

# 2. Builder Stage - Install dependencies and build
FROM base AS builder
WORKDIR /app

# Install dependencies utilizing cache
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=pruner /app/out/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm install --frozen-lockfile --config.manage-package-manager-versions=false

# Build the project
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=web...

# 3. Runner Stage - Serve with NGINX
FROM nginx:alpine AS runner

# Copy custom nginx configuration for Single Page Application
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy the static built output from the builder stage
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
