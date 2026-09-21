# Plan de PRs — CI/CD Refactor

Este documento describe la secuencia de Pull Requests para implementar la arquitectura de CI/CD (Build Once, Deploy Many).

## Decisiones arquitectónicas aplicadas

- **URLs QA:** Subdominios de Render y Cloudflare Pages.
- **URLs Prod:** `api.akituvocacion.com.ar`, `app.akituvocacion.com.ar`, `akituvocacion.com.ar`.
- **Registry:** GHCR (GitHub Container Registry).
- **Entornos:** `dev` (QA) → `main` (Railway Staging & Railway Prod).
- **Analytics Web:** Cloudflare Web Analytics (reemplaza `@vercel/analytics`).
- **Aprobación de migraciones:** Automática inicialmente, preparada para `environment` protection en GitHub.

---

## Fases y PRs

### Fase 1: Habilitadores (Foundation)

| PR        | Título                                                           | Descripción                                                                                                                                                                                                                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PR-01** | `ci: reproducible CI and migration timestamp fix`                | Reemplaza el CI actual. Unifica pnpm cache. Arregla el timestamp duplicado de las migraciones `1789100000000`. **Nota de QA:** `SessionPatientEmail1789100000000` ya está aplicada en la tabla `migrations` de QA con ese nombre. Antes del primer CD a QA, ejecutar: `UPDATE migrations SET name = 'SessionPatientEmail1789150000000' WHERE name = 'SessionPatientEmail1789100000000';` |
| **PR-02** | `feat(api): add readiness endpoint and Dockerfile HEALTHCHECK`   | Agrega `/health/ready` y la instrucción HEALTHCHECK al Dockerfile para resiliencia en orchestrators.                                                                                                                                                                                                                                                                                     |
| **PR-03** | `feat(infra): harden Dockerfile and add OCI labels`              | Optimiza el Dockerfile de la API (multi-stage) y agrega labels OCI requeridos por GHCR.                                                                                                                                                                                                                                                                                                  |
| **PR-04** | `feat(web): replace @vercel/analytics with Cloudflare Analytics` | Elimina la dependencia de Vercel y prepara Web para Cloudflare.                                                                                                                                                                                                                                                                                                                          |
| **PR-05** | `feat(web): add _redirects for Cloudflare Pages SPA fallback`    | Agrega el archivo `public/_redirects` (`/* /index.html 200`) para que la SPA funcione.                                                                                                                                                                                                                                                                                                   |

### Fase 2: CD hacia QA (dev)

| PR        | Título                                                           | Descripción                                                                                              |
| --------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **PR-06** | `feat(infra): publish API image to GHCR on dev push`             | Crea `cd-qa.yml`. Construye la imagen y hace push a GHCR con el SHA del commit.                          |
| **PR-07** | `feat(infra): add Render QA deploy pipeline`                     | Agrega `render.yaml` y el step de deploy a Render usando el digest inmutable de la imagen.               |
| **PR-08** | `feat(infra): add migration job to QA pipeline`                  | Agrega step en `cd-qa.yml` para ejecutar las migraciones contra QA _después_ del deploy exitoso.         |
| **PR-09** | `feat(infra): add Cloudflare Pages deploy for Web and Site (QA)` | Compila Web (con `VITE_API_URL` apuntando a Render) y Site, y sube los artefactos a Cloudflare Pages QA. |
| **PR-10** | `feat(infra): add smoke tests (provider-neutral)`                | Script bash que verifica HTTP 200 en API, Web y Site post-deploy.                                        |

### Fase 3: CD hacia Producción y Staging (main)

| PR        | Título                                                      | Descripción                                                                                         |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **PR-11** | `feat(infra): add Railway staging and prod deploy pipeline` | Crea `cd-prod.yml`. Promueve la imagen de QA (sin recompilar) a Railway Staging y Prod.             |
| **PR-12** | `feat(infra): add Cloudflare Pages prod deploy`             | Despliega Web y Site a los dominios `.com.ar` con las variables productivas. Integra el smoke test. |

### Fase 4: Documentación operativa

| PR        | Título                                         | Descripción                                                                                  |
| --------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **PR-13** | `docs: update deployment docs, runbooks, ADRs` | Documenta cómo hacer rollback en Render, Railway y CF Pages. Añade interfaz futura para AWS. |
