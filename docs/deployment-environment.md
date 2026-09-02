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
| `CORS_ORIGIN`         | Recomendada en producción            | Pública               | Origen exacto del Web desplegado. Admite una lista separada por comas. |
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
| `SERVERLESS`                | Obligatoria sólo en serverless                  | Privada     | `true` activa el flujo de Chromium empaquetado.                                                  |
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

Para ejecutar el seed inicial del admin e institución, configurar:

| Variable                     | Estado                                                  | Tipo        |
| ---------------------------- | ------------------------------------------------------- | ----------- |
| `ADMIN_USER`                 | Recomendada para el seed                                | Secreto     |
| `ADMIN_PASS`                 | Recomendada para el seed                                | **Secreto** |
| `ADMIN_NAME`                 | Opcional                                                | Privada     |
| `SEED_MATERIAL_TEORICO_PATH` | Opcional, pero debe ir con `SEED_TRES_AREAS_PATH`       | Privada     |
| `SEED_TRES_AREAS_PATH`       | Opcional, pero debe ir con `SEED_MATERIAL_TEORICO_PATH` | Privada     |

Las variables `SEED_ADMIN_*` y `SEED_INSTITUTION_*` están en la plantilla, pero no son leídas por el código mantenido actualmente. Deben considerarse documentación histórica hasta que el seed las consuma explícitamente.

## 2. Web: `apps/web`

Estas variables se incorporan al bundle de Vite. **Nunca colocar secretos en una variable `VITE_*`.**

| Variable               | Estado                      | Tipo    | Uso                                                                                                                            |
| ---------------------- | --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `VITE_API_URL`         | **Obligatoria para deploy** | Pública | URL base de la API. En local tiene default `http://localhost:3000`, pero un build desplegado debe configurarla explícitamente. |
| `VITE_PUBLIC_TEST_URL` | Opcional                    | Pública | URL usada para el flujo de test público. Tiene default `https://akit-test.com`.                                                |
| `VITE_WHATSAPP_URL`    | Opcional                    | Pública | URL de contacto por WhatsApp. Tiene default `https://wa.me/`.                                                                  |

Vercel sólo configura el rewrite de la SPA; las variables deben agregarse manualmente en Project Settings. En Docker deben estar disponibles durante el build de Vite, porque el bundle se genera antes de iniciar Nginx.

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

No se encontró un manifiesto propio de Vercel, Render o Docker para Site. El proveedor debe ejecutar el build de Astro con estas variables disponibles y publicar el resultado estático.

## 4. Dónde configurar cada variable

| Entorno          | API                                                                                         | Web                                      | Site                                   |
| ---------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------- |
| Desarrollo local | `apps/api/.env`                                                                             | `apps/web/.env.local`                    | `apps/site/.env`                       |
| Render API       | Render Dashboard o `render.yaml`                                                            | No aplica                                | No aplica                              |
| Vercel Web       | No aplica                                                                                   | Project Settings > Environment Variables | Sólo si se agrega un proyecto Site     |
| Docker local     | `infra/docker/.env` para PostgreSQL/pgAdmin; API recibe variables al ejecutar el contenedor | Variables disponibles durante el build   | Variables disponibles durante el build |
| CI previews      | GitHub Actions Secrets, especialmente `NEON_PROJECT_ID` y `NEON_API_KEY`                    | Variables del entorno del workflow       | Variables del entorno del workflow     |

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

## 6. Hallazgos actuales del deploy

Antes de usar `render.yaml` para producción, completar o revisar estas variables en Render:

- `API_URL`
- `PAYMENT_IDEMPOTENCY_SECRET`
- `MP_ACCESS_TOKEN`
- `MP_WEBHOOK_SECRET`
- `PAYMENT_GATEWAY`

Render no declara actualmente `PAYMENT_GATEWAY`; como el código usa `STRIPE` por defecto, puede activar una validación de Stripe aunque la infraestructura esté preparada para Mercado Pago. Definir el gateway de forma explícita y agregar sólo las credenciales del proveedor elegido.

También conviene agregar `PUBLIC_FORM_ENDPOINT` a `apps/site/.env.example` y retirar o marcar como obsoletas las variables de plantillas que el código ya no consume.

## Reglas de seguridad

- `.env`, `.env.local`, `infra/docker/.env` y `scripts/.env.neon` son archivos locales o secretos; no deben commitearse.
- `.env.example` debe contener sólo placeholders o valores de ejemplo claramente ficticios.
- Las variables sin prefijo `VITE_` o `PUBLIC_` no deben enviarse al frontend.
- Si un secreto real fue commiteado o compartido, revocarlo y generar uno nuevo; eliminarlo del archivo no invalida el secreto expuesto.
- No imprimir variables de entorno completas en logs ni en tickets.
