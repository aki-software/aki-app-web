# Primer día de desarrollo

Esta guía permite levantar A.kit Platform en una máquina nueva. Está pensada para un desarrollador que todavía no conoce el repositorio.

## Qué vas a levantar

- **API:** NestJS en `http://localhost:3000`.
- **Web:** dashboard React/Vite, normalmente en `http://localhost:5173`.
- **Site:** sitio público Astro, normalmente en `http://localhost:4321`.
- **Infraestructura local:** PostgreSQL, Redis, Mailpit, pgAdmin y Jaeger mediante Docker Compose.

## 1. Prerequisitos

Instalá:

- Git.
- Node.js 22 o la versión definida por el equipo.
- pnpm `10.28.2`.
- Docker Desktop con Docker Compose activo.

Verificá las versiones:

```powershell
node --version
pnpm --version
docker --version
docker compose version
```

Si pnpm no muestra `10.28.2`, activá la versión fijada por el repositorio:

```powershell
corepack enable
corepack prepare pnpm@10.28.2 --activate
```

## 2. Clonar e instalar

```powershell
git clone <URL_DEL_REPOSITORIO>
Set-Location akit-platform
pnpm install
```

El repositorio es un monorepo. Las aplicaciones viven en `apps/` y los paquetes compartidos en `packages/`.

## 3. Configurar variables locales

No uses valores de producción en tu máquina ni subas archivos `.env` al repositorio.

### API

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Completá `apps/api/.env` con valores locales. Como mínimo, revisá:

- PostgreSQL: `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME`.
- Auth: `JWT_SECRET` y `FIREBASE_PROJECT_ID`.
- Pagos locales: `NODE_ENV=development` y `PAYMENT_SIMULATION=true` cuando el flujo que probás lo permita.
- Redis: `REDIS_HOST=localhost` y `REDIS_PORT=6379`.

La lista completa y la diferencia entre variables obligatorias y opcionales está en [deployment-environment.md](deployment-environment.md).

### Infraestructura Docker

Docker Compose lee sus variables desde `infra/docker/.env`, no desde `apps/api/.env`:

```powershell
Copy-Item infra/docker/.env.example infra/docker/.env
```

Revisá especialmente `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `PGADMIN_DEFAULT_EMAIL` y `PGADMIN_DEFAULT_PASSWORD`. La API debe usar los mismos datos de PostgreSQL.

### Web y Site

Las variables de Web y Site son públicas, pero igualmente se configuran por entorno:

```powershell
Copy-Item apps/site/.env.example apps/site/.env
```

Para Web, creá `apps/web/.env.local` y definí al menos:

```dotenv
VITE_API_URL=http://localhost:3000
```

Nunca pongas contraseñas, tokens o API keys en variables `VITE_*` o `PUBLIC_*`: esos valores terminan en el navegador o en el HTML generado.

## 4. Levantar servicios locales

Desde `infra/docker`:

```powershell
Set-Location infra/docker
docker compose up -d
```

Verificá el estado:

```powershell
docker compose ps
```

URLs útiles:

| Servicio     | URL / puerto             |
| ------------ | ------------------------ |
| PostgreSQL   | `localhost:5432`         |
| Redis        | `localhost:6379`         |
| Mailpit SMTP | `localhost:1025`         |
| Mailpit UI   | `http://localhost:8025`  |
| pgAdmin      | `http://localhost:5050`  |
| Jaeger       | `http://localhost:16686` |

Para detenerlos sin borrar datos:

```powershell
docker compose stop
```

Para detenerlos y eliminar los contenedores:

```powershell
docker compose down
```

No uses `docker compose down -v` salvo que quieras borrar las bases y volúmenes locales.

## 5. Inicializar la base de datos

Desde `apps/api`:

```powershell
Set-Location ../../apps/api
pnpm db:setup:local
```

Ese comando ejecuta migraciones, carga el diccionario y crea el usuario inicial. Para tareas puntuales también existen:

```powershell
pnpm db:bootstrap
pnpm seed:admin
```

`db:bootstrap` prepara el esquema y datos base. `seed:admin` crea o actualiza los datos administrativos iniciales. No ejecutes `db:reset` sobre una base que necesites conservar.

## 6. Levantar las aplicaciones

Abrí tres terminales desde la raíz del repositorio.

### API

```powershell
pnpm dev:api
```

### Web

```powershell
pnpm dev:web
```

### Site

```powershell
pnpm dev:site
```

También podés ejecutar todo lo que tenga script `dev` con:

```powershell
pnpm dev
```

## 7. Verificación mínima

Confirmá lo siguiente:

- La API inicia sin errores de variables, PostgreSQL o Redis.
- Web abre en `http://localhost:5173` y puede comunicarse con la API.
- Site abre en `http://localhost:4321`.
- Un correo de prueba aparece en `http://localhost:8025`.
- PostgreSQL y Redis aparecen como `running` en `docker compose ps`.
- No hay secretos reales en los archivos locales modificados.

Antes de abrir una PR, ejecutá:

```powershell
pnpm lint
pnpm test
pnpm build
```

## Problemas frecuentes

### Docker no inicia

Abrí Docker Desktop y confirmá que el daemon esté disponible:

```powershell
docker info
```

### El puerto ya está ocupado

Identificá el proceso que usa el puerto o detené el servicio local que lo ocupa. No cambies puertos sin actualizar las variables y la documentación del entorno.

### La API no conecta a PostgreSQL

Confirmá que `docker compose ps` muestre PostgreSQL saludable, que `infra/docker/.env` y `apps/api/.env` usen los mismos datos, y que estés ejecutando los comandos desde `apps/api`.

### Falta una variable de autenticación o pagos

Revisá `apps/api/.env.example` y [deployment-environment.md](deployment-environment.md). Para desarrollo, no copies credenciales de producción: usá simulación o credenciales sandbox autorizadas.

### Puppeteer no encuentra Chrome

La generación de PDFs necesita un navegador disponible. Revisá `PUPPETEER_EXECUTABLE_PATH` o la configuración indicada para tu entorno antes de probar reportes.

## Siguiente lectura

- [Variables de entorno y credenciales](deployment-environment.md)
- [Roadmap de documentación](documentation-roadmap.md)
- [README principal](../README.md)
