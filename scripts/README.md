# ORIENT A.KI — Scripts de desarrollo individual

Scripts para levantar apps individuales del monorepo sin ejecutar todo el stack.

## Uso

```bash
# Desde la raíz del monorepo (akit-platform/)

# Landing page (site)
pnpm dev:site

# API solamente
pnpm dev:api

# Web admin solamente
pnpm dev:web

# Todas las apps (comportamiento default)
pnpm dev
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `dev:site` | Landing page (Astro) en `http://localhost:4321` |
| `dev:api` | API NestJS en `http://localhost:3000` |
| `dev:web` | Admin dashboard React en `http://localhost:5173` |
| `dev` | Todas las apps con Turborepo |
