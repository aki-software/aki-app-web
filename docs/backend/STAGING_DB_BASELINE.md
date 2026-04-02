# Staging DB Baseline

Objetivo: inicializar una base limpia para staging con solo usuario admin y sin datos de prueba.

## Estado Actual

- Migraciones existentes: multiples (historicas).
- Seed por defecto del API: admin-only (idempotente).
- Seeds de categorias y escenarios MVP: quedan como opcionales/manuales (`seed:optional:categories`, `seed:optional:mvp`).

## Comandos Operativos

Desde `apps/api`:

```bash
pnpm db:bootstrap:staging
```

- Ejecuta migraciones pendientes.
- Crea/actualiza un usuario admin.

Para reinicializar completamente la DB de staging:

```bash
pnpm db:reset:staging
```

- Hace `schema:drop`.
- Reaplica migraciones.
- Ejecuta seed admin-only.

## Variables Del Seed Admin

- `SEED_ADMIN_EMAIL` (default: `admin@akit.app`)
- `SEED_ADMIN_NAME` (default: `Platform Admin`)
- `SEED_ADMIN_PASSWORD` (default: `Admin1234!`)

Recomendacion: en staging/prod definir siempre estas variables y no usar defaults.

## Squash A Una Sola Migracion (Paso Controlado)

No borrar migraciones historicas en caliente. Hacerlo en una rama dedicada:

1. Levantar una base vacia temporal.
2. Generar una nueva migracion snapshot desde entidades actuales.
3. Validar `migration:run` en DB vacia.
4. Validar arranque API + login admin con `seed:admin`.
5. Reemplazar historial de migraciones solo cuando todo pase en CI.

Esto evita drift o perdida de cambios evolutivos ya aplicados.
