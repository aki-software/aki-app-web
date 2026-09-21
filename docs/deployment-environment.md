# Variables de entorno y credenciales

Esta guía documenta qué variables necesita cada aplicación para desarrollo, QA y producción. Sirve como checklist de despliegue y como referencia para nuevos desarrolladores.

## Ruta rápida de despliegue

1. Copiar la plantilla correspondiente y completar sólo los valores del entorno:
   - API: `apps/api/.env.example`
   - Web: crear `apps/web/.env.local` para desarrollo o configurar `VITE_*` en el proveedor de deploy.
   - Site: `apps/site/.env.example`
2. Nunca copiar secretos reales a `.env.example`, al repositorio, al bundle del frontend ni al site público.
3. Configurar primero base de datos, autenticación, Redis, almacenamiento y pagos en el backend.
4. Configurar `VITE_API_URL` en Web y `PUBLIC_API_URL` o `PUBLIC_FORM_ENDPOINT` en Site.
5. Verificar las URLs públicas, CORS, webhooks y el build de cada aplicación.

## Clasificación

| Marca           | Significado                                                                                     |
| --------------- | ----------------------------------------------------------------------------------------------- |
| **Obligatoria** | El servicio no puede iniciar o no puede cumplir su función sin ella.                            |
| **Recomendada** | El servicio puede iniciar, pero debe configurarse para QA o producción.                         |
| **Opcional**    | Sólo se necesita para una funcionalidad concreta o para desarrollo.                             |
| **Secreto**     | Nunca debe exponerse al navegador, al repositorio ni a logs.                                    |
| **Pública**     | Puede formar parte del bundle del navegador o del HTML generado. No debe contener credenciales. |

## 1. Backend: `apps/api`

### Base de datos

Usar **una** de estas estrategias:

| Variable            | Estado                                          | Tipo    | Uso                                                                           |
| ------------------- | ----------------------------------------------- | ------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`      | Obligatoria en deploy si se usa esta estrategia | Secreto | URL completa de PostgreSQL. Tiene prioridad sobre las variables individuales. |
| `DATABASE_HOST`     | Obligatoria si no existe `DATABASE_URL`         | Privada | Host de PostgreSQL.                                                           |
| `DATABASE_PORT`     | Recomendada                                     | Privada | Puerto de PostgreSQL, normalmente `5432`.                                     |
| `DATABASE_USER`     | Obligatoria si no existe `DATABASE_URL`         | Secreto | Usuario de PostgreSQL.                                                        |
| `DATABASE_PASSWORD` | Obligatoria si no existe `DATABASE_URL`         | Secreto | Contraseña de PostgreSQL.                                                     |
| `DATABASE_NAME`     | Obligatoria si no existe `DATABASE_URL`         | Privada | Nombre de la base.                                                            |

Para CI de previews también se usan `NEON_PROJECT_ID` y `NEON_API_KEY` como secretos de GitHub Actions. El workflow genera `DATABASE_URL` para la rama temporal.

### Servidor y autenticación

| Variable              | Estado                               | Tipo                  | Valor / criterio                                                       |
| --------------------- | ------------------------------------ | --------------------- | ---------------------------------------------------------------------- |
| `NODE_ENV`            | Obligatoria en producción            | Privada               | `production` en deploy.                                                |
| `PORT`                | Opcional                             | Privada               | Default: `3000`. El proveedor puede inyectarlo.                        |
| `CORS_ORIGIN`         | **Obligatoria en producción**        | Pública               | Orígenes HTTPS exactos autorizados, separados por comas. No admite wildcards; los valores se recortan. |
| `WEB_APP_URL`         | Recomendada                          | Pública               | URL del dashboard Web. Se usa para enlaces.                            |
| `FRONTEND_URL`        | Obligatoria para pagos en producción | Pública               | URL HTTPS del frontend autorizado para checkout.                       |
| `API_URL`             | Obligatoria para pagos en producción | Pública               | URL HTTPS pública de la API, sin path. Se usa para webhooks.           |
| `JWT_SECRET`          | **Obligatoria**                      | **Secreto**           | Clave aleatoria de al menos 32 caracteres.                             |
| `JWT_EXPIRATION`      | Opcional                             | Privada               | Default del código: `12h`; usar una duración explícita en producción.  |
| `FIREBASE_PROJECT_ID` | **Obligatoria**                      | Pública/identificador | ID del proyecto Firebase. Nunca usar un token como valor.              |

### Redis, colas y rate limiting

| Variable                     | Estado                        | Tipo        | Uso                                               |
| ---------------------------- | ----------------------------- | ----------- | ------------------------------------------------- |
| `REDIS_URL`                  | **Obligatoria en producción** | **Secreto** | Conexión Redis preferida.                         |
| `QUEUE_REDIS_URL`            | Alternativa heredada          | **Secreto** | Fallback compatible con configuraciones antiguas. |
| `REDIS_HOST`                 | Fallback                      | Privada     | Host cuando no se usa una URL completa.           |
| `REDIS_PORT`                 | Fallback                      | Privada     | Default habitual: `6379`.                         |
| `REDIS_USERNAME`             | Opcional                      | Secreto     | Usuario Redis, si el proveedor lo requiere.       |
| `REDIS_PASSWORD`             | Opcional                      | Secreto     | Contraseña Redis, si el proveedor lo requiere.    |
| `REDIS_DB`                   | Opcional                      | Privada     | Base Redis. Default: `0`.                         |
| `REDIS_TLS`                  | Opcional                      | Privada     | `true` cuando el proveedor exige TLS.             |
| `RATE_LIMIT_MEMORY_FALLBACK` | Sólo desarrollo/test          | Privada     | No usar como sustituto de Redis en producción.    |

Si no existe `REDIS_URL` ni `QUEUE_REDIS_URL`, la API usa la combinación de variables individuales. Producción debe usar Redis distribuido.

### Pagos

Configurar `PAYMENT_GATEWAY` de forma explícita; sus valores válidos son `STRIPE` y `MERCADO_PAGO`. El default del código es `STRIPE`.

| Variable                             | Estado                        | Tipo        | Uso                                                                               |
| ------------------------------------ | ----------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `PAYMENT_GATEWAY`                    | **Obligatoria en producción** | Privada     | Define el proveedor activo.                                                       |
| `PAYMENT_SIMULATION`                 | Sólo desarrollo/test          | Privada     | Debe estar ausente o ser `false` en producción.                                   |
| `PAYMENT_IDEMPOTENCY_SECRET`         | **Obligatoria en producción** | **Secreto** | Secreto aleatorio de al menos 32 caracteres.                                      |
| `STRIPE_SECRET_KEY`                  | Condicional                   | **Secreto** | Obligatoria cuando el gateway activo es Stripe.                                   |
| `STRIPE_WEBHOOK_SECRET`              | Condicional                   | **Secreto** | Firma de webhooks de Stripe.                                                      |
| `MP_ACCESS_TOKEN`                    | Condicional                   | **Secreto** | Obligatoria cuando el gateway activo es Mercado Pago.                             |
| `MP_WEBHOOK_SECRET`                  | Condicional                   | **Secreto** | Firma de webhooks de Mercado Pago.                                                |
| `GOOGLE_PLAY_PACKAGE_NAME`           | Si se habilita Google Play    | Pública     | Application ID Android.                                                           |
| `GOOGLE_PLAY_REPORT_SKU`             | Si se habilita Google Play    | Pública     | SKU del producto vendido.                                                         |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_BASE64` | Si se habilita Google Play    | **Secreto** | Service account codificada en Base64. Nunca decodificarla dentro del repositorio. |

Para la prueba rápida de QA de Mercado Pago, el servicio `akit-api-qa` de Render requiere `PAYMENT_GATEWAY=MERCADO_PAGO` y `PAYMENT_SIMULATION=false`. Configurar `PAYMENT_IDEMPOTENCY_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `FRONTEND_URL` y `API_URL` como secretos administrados por Render o valores de URL; no versionar sus valores.

Los webhooks deben apuntar a:

- Stripe: `/api/v1/webhooks/payments/stripe`
- Mercado Pago: `/api/v1/webhooks/payments/mercado_pago`

### Reportes, almacenamiento y PDF

| Variable                    | Estado                                          | Tipo        | Uso                                                                                              |
| --------------------------- | ----------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `S3_ENDPOINT`               | **Obligatoria** si se guardan reportes privados | Privada     | Endpoint de Cloudflare R2/S3.                                                                    |
| `S3_BUCKET`                 | **Obligatoria** si se guardan reportes privados | Privada     | Bucket privado de reportes.                                                                      |
| `S3_ACCESS_KEY`             | **Obligatoria** si se guardan reportes privados | **Secreto** | Access key de R2.                                                                                |
| `S3_SECRET_KEY`             | **Obligatoria** si se guardan reportes privados | **Secreto** | Secret key de R2.                                                                                |
| `S3_REGION`                 | Recomendada                                     | Privada     | Debe ser `auto` para R2. Default: `auto`.                                                        |
| `REPORT_STORAGE_PREFIX`     | Opcional                                        | Privada     | Prefijo para las claves de objetos.                                                              |
| `PUPPETEER_EXECUTABLE_PATH` | Obligatoria en ejecución normal/Docker          | Privada     | Ruta al navegador Chromium/Chrome instalado.                                                     |
| `PUPPETEER_CACHE_DIR`       | Configuración de Render                         | Privada     | Directorio de cache; actualmente lo configura Render, pero la aplicación no lo lee directamente. |

### Email y notificaciones

`MAIL_TRANSPORT_TYPE` puede ser `smtp`, `pro` o `resend`. Si no se configura, el código usa SMTP.

| Variable              | Estado            | Tipo        | Uso                                                               |
| --------------------- | ----------------- | ----------- | ----------------------------------------------------------------- |
| `MAIL_TRANSPORT_TYPE` | Recomendada       | Privada     | Selecciona el transporte. En producción definirlo explícitamente. |
| `SMTP_HOST`           | Condicional       | Privada     | Host SMTP para Mailpit/Mailtrap u otro servidor.                  |
| `SMTP_PORT`           | Condicional       | Privada     | Puerto SMTP, normalmente `1025` local.                            |
| `SMTP_USER`           | Condicional       | Secreto     | Usuario SMTP. Puede estar vacío en Mailpit local.                 |
| `SMTP_PASS`           | Condicional       | Secreto     | Contraseña SMTP. Puede estar vacío en Mailpit local.              |
| `RESEND_API_KEY`      | Condicional       | **Secreto** | API key cuando se usa Resend.                                     |
| `MAIL_PRO_PASS`       | Fallback heredado | **Secreto** | Fallback usado si no existe `RESEND_API_KEY`.                     |

`SMTP_FROM`, `MAIL_PRO_HOST`, `MAIL_PRO_PORT` y `MAIL_PRO_USER` aparecen en plantillas o en Render, pero actualmente no son leídas directamente por el código mantenido. No asumir que cambiar esas variables modifica el transporte sin verificar la implementación.

### Seed inicial

Para ejecutar el seed inicial del admin, configurar:

| Variable                     | Estado                                                  | Tipo        |
| ---------------------------- | ------------------------------------------------------- | ----------- |
| `ADMIN_USER`                 | Recomendada para el seed (email del admin)              | Secreto     |
| `ADMIN_PASS`                 | Recomendada para el seed (contraseña del admin)         | **Secreto** |
| `ADMIN_NAME`                 | Opcional (nombre visible del admin)                     | Privada     |
| `SEED_MATERIAL_TEORICO_PATH` | Opcional, pero debe ir con `SEED_TRES_AREAS_PATH`       | Privada     |
| `SEED_TRES_AREAS_PATH`       | Opcional, pero debe ir con `SEED_MATERIAL_TEORICO_PATH` | Privada     |

## 2. Web: `apps/web`

Estas variables se incorporan al bundle de Vite. **Nunca colocar secretos en una variable `VITE_*`.**

| Variable               | Estado                      | Tipo    | Uso                                                                                                                            |
| ---------------------- | --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`         | **Obligatoria para deploy** | Pública | URL base de la API. En local tiene default `http://localhost:3000`, pero un build desplegado debe configurarla explícitamente. |
| `VITE_PAYMENT_GATEWAY` | Recomendada                 | Pública | Gateway habilitado en la interfaz de checkout. Los valores válidos son `MERCADO_PAGO` y `STRIPE`; el valor por defecto seguro es `MERCADO_PAGO`. |
| `VITE_PUBLIC_TEST_URL` | Opcional                    | Pública | URL usada para el flujo de test público. Tiene default `https://akit-test.com`.                                                |
| `VITE_WHATSAPP_URL`    | Opcional                    | Pública | URL de contacto por WhatsApp. Tiene default `https://wa.me/`.                                                                  |
| `VITE_ALLOWED_HOSTS`   | Opcional                    | Pública | Hosts de túneles de desarrollo, separados por comas. Si está ausente, Vite conserva su protección de hosts por defecto.       |

Cloudflare Pages compila y sirve la SPA usando `public/_redirects` (`/* /index.html 200`) para el enrutamiento del lado del cliente. Las variables `VITE_*` deben configurarse en el panel de Cloudflare Pages (Settings > Environment variables) o ser inyectadas por el workflow de GitHub Actions durante el build. En Docker deben estar disponibles durante el build de Vite, porque el bundle se genera antes de iniciar Nginx.

## 3. Site público: `apps/site`

Astro genera un sitio estático. Todas las variables `PUBLIC_*` son públicas y se resuelven durante el build.

| Variable                  | Estado                              | Tipo    | Uso                                                                                                          |
| ------------------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_WEB_URL`          | Recomendada en producción           | Pública | URL del dashboard Web para enlaces de navegación.                                                            |
| `PUBLIC_PLAY_STORE_URL`   | Recomendada si se publica Android   | Pública | URL pública de Google Play.                                                                                  |
| `PUBLIC_API_URL`          | Recomendada en producción           | Pública | URL base de la API para el formulario de contacto.                                                           |
| `PUBLIC_FORM_ENDPOINT`    | Recomendada si se usa el formulario | Pública | Endpoint completo alternativo para enviar el formulario. La fuente lo consume, pero falta en `.env.example`. |
| `PUBLIC_MAINTENANCE_MODE` | Opcional                            | Pública | `true` muestra las páginas de mantenimiento en ambos idiomas.                                                |

`PUBLIC_CONTACT_EMAIL` existe en las plantillas, pero actualmente el código usa una dirección fija. `PUBLIC_DASHBOARD_URL` aparece en el `.env` local, pero el código lee `PUBLIC_WEB_URL`; usar el nombre que consume el código.

Site se compila en Cloudflare Pages como sitio estático (`dist/`) ejecutando `astro build`.

## 4. Dónde configurar cada variable

| Entorno          | API                                                                                         | Web (Cloudflare Pages)                   | Site (Cloudflare Pages)                |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Desarrollo local | `apps/api/.env`                                                                             | `apps/web/.env.local`                    | `apps/site/.env`                       |
| Render API (QA)  | Inyectadas automáticamente por GitHub Actions (`cd-qa.yml`) vía Render REST API            | No aplica                                | No aplica                              |
| Cloudflare Pages | No aplica                                                                                   | Settings > Environment Variables         | Settings > Environment Variables       |
| Docker local     | `infra/docker/.env` para PostgreSQL/pgAdmin; API recibe variables al ejecutar el contenedor | Variables disponibles durante el build   | Variables disponibles durante el build |
| CI / CD (GitHub) | GitHub Actions Repository Secrets                                                           | GitHub Actions Secrets (en build de CD)  | GitHub Actions Secrets (en build de CD) |

El archivo `infra/docker/.env.example` documenta las variables de PostgreSQL y pgAdmin del entorno local. `scripts/.env.neon` contiene credenciales sensibles de Neon y nunca debe versionarse.

## 5. Checklist antes de producción

### Backend

- [ ] Base de datos configurada con `DATABASE_URL` o con las cinco variables individuales.
- [ ] `NODE_ENV=production`.
- [ ] `JWT_SECRET` aleatorio y de al menos 32 caracteres.
- [ ] `FIREBASE_PROJECT_ID` correcto.
- [ ] `CORS_ORIGIN`, `WEB_APP_URL`, `FRONTEND_URL` y `API_URL` apuntan a dominios HTTPS reales.
- [ ] Redis distribuido configurado con `REDIS_URL`.
- [ ] `PAYMENT_GATEWAY` declarado explícitamente.
- [ ] Secretos del gateway activo y `PAYMENT_IDEMPOTENCY_SECRET` configurados.
- [ ] Webhooks creados en el proveedor y apuntando a la API correcta.
- [ ] R2 configurado con bucket privado y credenciales del gestor de secretos.
- [ ] Chromium/Puppeteer disponible, o `SERVERLESS=true` si corresponde.
- [ ] Transporte de email y credenciales configurados.

### Web y Site

- [ ] `VITE_API_URL` apunta a la API de producción.
- [ ] `PUBLIC_API_URL` o `PUBLIC_FORM_ENDPOINT` apunta al endpoint correcto.
- [ ] `PUBLIC_WEB_URL` apunta al dashboard correcto.
- [ ] Las URLs públicas no contienen tokens ni secretos.
- [ ] Se ejecutó el build después de configurar las variables, porque Vite y Astro las incorporan durante la compilación.

## 6. Automatización de Despliegue en QA (GitHub Actions & Render REST API)

El pipeline de entrega continua para QA está completamente automatizado en el workflow `.github/workflows/cd-qa.yml` y se dispara en cada push o merge a la rama `dev`.

### Arquitectura del Pipeline de QA

```text
[Push / Merge a 'dev']
        │
        ▼
[Job 1: changes] (dorny/paths-filter)
  Verifica si cambiaron archivos en apps/api, packages/contracts, etc.
        │
        ▼
[Job 2: publish-api-image]
  1. Build multi-stage optimizado con caché de Docker (gha).
  2. Publica la imagen inmutable en GitHub Packages (GHCR):
     - ghcr.io/aki-software/akit-api:qa-latest
     - ghcr.io/aki-software/akit-api:qa-<short-sha>
        │
        ▼
[Job 3: deploy-api-qa]
  1. Inyección de variables de entorno vía Render REST API:
     PUT https://api.render.com/v1/services/${RENDER_SERVICE_ID}/env-vars
  2. Disparo de nuevo despliegue inmutable:
     POST https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys
```

### Entorno Staging y Modo Simulación

Para evitar bloquear el despliegue en QA con credenciales bancarias o de pago reales de producción, la API cuenta con soporte nativo para `NODE_ENV=staging`:

- **`NODE_ENV=staging` + `PAYMENT_SIMULATION=true`:** Omite la validación estricta de credenciales de producción (`sk_live_...`, tokens de Mercado Pago, y certificados de Google Play) permitiendo que la API arranque en QA.
- **Variables Stub de infraestructura:** El pipeline inyecta stubs para `S3_*` y `PUPPETEER_EXECUTABLE_PATH` de modo que los servicios de reportes no bloqueen el boot del contenedor.

---

## 7. Diccionario de Secretos de GitHub Actions

Para que el pipeline de CD funcione, deben configurarse los siguientes **Repository Secrets** en GitHub (**Settings > Secrets and variables > Actions**):

| Nombre del Secreto | Descripción | Dónde y cómo obtenerlo | Formato / Ejemplo |
|---|---|---|---|
| `RENDER_API_KEY` | Token de autenticación para la API REST de Render. | En Render: **Account Settings > API Keys > Create API Key**. Nombrarla "GitHub Actions CD". | `rnd_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `RENDER_QA_SERVICE_ID` | Identificador único del Web Service en Render. | En Render: abrir el servicio `akit-api-qa`. Mirar la URL del navegador (`/srv-cabc123...`) o en **Settings > Service ID**. | `srv-xxxxxxxxxxxxxxxxxxxx` |
| `QA_DATABASE_URL` | String de conexión a la base de datos PostgreSQL de QA. | En Neon Console: seleccionar el proyecto, ir a la rama `qa` (o crearla desde `main`), y copiar el **Connection String**. | `postgresql://user:pass@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `QA_JWT_SECRET` | Clave secreta para firma y verificación de tokens JWT. | Generar una clave aleatoria de al menos 32 caracteres (ej: `openssl rand -base64 32`). | `qa_akit_jwt_super_secret_key_9f8e7d6c5b4a3` |
| `QA_REDIS_URL` | URL de conexión al servidor Redis para colas y rate-limiting. | En Render: crear un **Redis Service** (plan Free) y copiar la **Internal Redis URL** o External URL. | `rediss://default:pass@red-xyz:6379` o `redis://...` |
| `QA_FIREBASE_PROJECT_ID` | Project ID de Firebase para validar tokens de autenticación. | En Firebase Console: **Project Settings > General > Project ID**. | `akit-dev-12345` o `akit-qa` |

> [!IMPORTANT]
> Los secretos deben crearse como **Repository Secrets** (globales del repositorio), **NO** como Environment Secrets ni como Variables, ya que el workflow los referencia directamente mediante `${{ secrets.<NOMBRE> }}`.

---

## 8. Guía Operativa Paso a Paso

### A. Guía para Nuevos Desarrolladores (Onboarding)

1. **Clonar e instalar:**
   ```bash
   git clone https://github.com/aki-software/aki-app-web.git
   cd aki-app-web
   pnpm install
   ```
2. **Configurar variables locales:**
   - Copiar `apps/api/.env.example` a `apps/api/.env`.
   - Copiar `apps/web/.env.example` a `apps/web/.env.local` (`VITE_API_URL=http://localhost:3000/api/v1`).
   - Copiar `apps/site/.env.example` a `apps/site/.env`.
   - Copiar `infra/docker/.env.example` a `infra/docker/.env`.
3. **Levantar dependencias locales:**
   ```bash
   cd infra/docker
   docker compose up -d
   ```
4. **Flujo de ramas y Git:**
   - Crear una rama desde `dev`: `git checkout -b feat/nombre-tarea`.
   - Usar Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
   - Correr lint y tests antes de subir: `pnpm lint && pnpm test`.
   - Abrir Pull Request apuntando a **`dev`**.
   - El CI (`ci.yml`) validará automáticamente el build, linting y pruebas.
   - Al aprobarse y mergearse a `dev`, el CD (`cd-qa.yml`) compilará la imagen de Docker y desplegará automáticamente la API en Render QA.

### B. Guía para Responsable de Despliegue / DevOps (Setup de QA desde Cero)

Si se necesita recrear o reconfigurar el entorno QA desde cero:

1. **Configurar acceso a GHCR en Render:**
   - Render necesita permisos para descargar la imagen privada desde GitHub Packages (`ghcr.io`).
   - En GitHub: generar un Personal Access Token (Classic) con alcance `read:packages`.
   - En Render: ir a **Workspace Settings > Registry Credentials > Add Credential**.
   - Nombre: `github-packages`, Registry: `ghcr.io`, Username: usuario de GitHub, Token: el PAT generado.
2. **Crear el Web Service en Render (por única vez):**
   - En Render: **New > Web Service > Deploy an existing image from a registry**.
   - Image URL: `ghcr.io/aki-software/akit-api:qa-latest`.
   - Registry Credential: `github-packages`.
   - Name: `akit-api-qa`.
   - Environment: `Image`.
   - Plan: `Free`.
   - Crear el servicio. Copiar el `Service ID` (`srv-...`) de la URL resultante.
3. **Cargar los Secretos en GitHub:**
   - Cargar los 6 secretos detallados en la sección 7 en **Settings > Secrets and variables > Actions**.
4. **Configurar Cloudflare Pages (Frontend Web & Site):**
   - Para evitar que los pushes a `dev` disparen previews en el proyecto de producción:
   - Ir a Cloudflare Dashboard > Pages > Proyecto Web / Site.
   - Ir a **Settings > Builds & deployments > Branch control**.
   - Editar **Preview branch** y seleccionar: **None (Disable automatic branch deployments)**.
5. **Ejecutar el despliegue inicial:**
   - Hacer un push a `dev` o ir a la pestaña **Actions** en GitHub, seleccionar **CD QA** y hacer clic en **Run workflow**.

---

## Reglas de seguridad

- `.env`, `.env.local`, `infra/docker/.env` y `scripts/.env.neon` son archivos locales o secretos; no deben commitearse.
- `.env.example` debe contener sólo placeholders o valores de ejemplo claramente ficticios.
- Las variables sin prefijo `VITE_` o `PUBLIC_` no deben enviarse al frontend.
- Si un secreto real fue commiteado o compartido, revocarlo y generar uno nuevo; eliminarlo del archivo no invalida el secreto expuesto.
- No imprimir variables de entorno completas en logs ni en tickets.

