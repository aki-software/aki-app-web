# Roadmap de documentación de A.kit Platform

## Objetivo

Reducir la deuda técnica de documentación del monorepo hasta que un desarrollador nuevo pueda levantar el entorno, entender la arquitectura, ejecutar una tarea, desplegar cada aplicación y diagnosticar un fallo sin depender de conocimiento oral.

Este documento es el plan de trabajo. La documentación operativa vigente está en [deployment-environment.md](deployment-environment.md).

## Diagnóstico verificado

### Estado actual

| Área                 | Evidencia                                                                                                | Evaluación          |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------- |
| Índice documental    | `README.md` enlaza documentos que no existen actualmente en `docs/`                                      | Crítico             |
| Variables de entorno | Hay diferencias entre `.env.example`, código y `render.yaml`                                             | Crítico para deploy |
| Onboarding           | Existen scripts y comandos en `package.json`, pero no hay una guía verificable de principio a fin        | Alta                |
| Arquitectura         | `README.md` tiene un diagrama general, pero faltan límites, decisiones y flujos por aplicación           | Alta                |
| API                  | La API contiene módulos, seeds, pagos, colas, reportes y auth, pero no hay guía operativa central        | Alta                |
| Web y Site           | No hay guías técnicas propias en `docs/`; sólo referencias parciales en el código                        | Alta                |
| Contratos            | `packages/contracts` es una fuente de verdad importante, pero no hay guía del pipeline ni del versionado | Alta                |
| Deploy               | Existe `render.yaml`, Vercel config y workflows, pero no hay runbook de deploy, rollback ni smoke tests  | Crítico             |
| Operaciones          | No hay runbooks consolidados para incidentes, migraciones, webhooks, Redis, R2 o email                   | Alta                |
| Mantenimiento        | No hay propietario, regla de actualización ni validación automática de enlaces/documentación             | Alta                |

### Desalineaciones concretas

1. `README.md` presenta como disponibles `docs/setup-local.md`, `docs/architecture.md`, `docs/contracts-ssot.md`, `docs/infra-deployment.md`, `docs/api-swagger.md`, `docs/scripts-automation.md`, `docs/api-backend.md`, `docs/report-unlock-monetization.md` y `docs/web-frontend.md`, pero esos archivos no están presentes en el árbol actual.
2. `apps/api/.env.example` contiene variables históricas o no consumidas por el runtime y no refleja todas las variables usadas por el código, por ejemplo `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `REPORT_STORAGE_PREFIX`, `SERVERLESS` y rutas de seed.
3. `apps/site` consume `PUBLIC_FORM_ENDPOINT`, pero esa variable falta en `apps/site/.env.example`.
4. `PUBLIC_CONTACT_EMAIL` y `PUBLIC_DASHBOARD_URL` aparecen en configuraciones, pero el código consume valores o nombres diferentes.
5. `render.yaml` no declara `API_URL`, `PAYMENT_IDEMPOTENCY_SECRET`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` ni `PAYMENT_GATEWAY`, aunque son relevantes para la validación de producción. Sin `PAYMENT_GATEWAY`, el código usa `STRIPE` por defecto.
6. `render.yaml` declara variables `MAIL_PRO_*`, pero la implementación usa `RESEND_API_KEY` y tiene fallback a `MAIL_PRO_PASS`; esto debe resolverse y documentarse como contrato, no sólo como comentario.
7. `README.md` menciona MailHog, mientras la infraestructura local usa Mailpit. La documentación debe usar un único nombre y explicar los puertos reales.
8. Hay archivos locales sensibles como `apps/api/.env`, `infra/docker/.env` y `scripts/.env.neon`; el proceso documental debe incluir una política explícita de secretos y rotación.

## Principios de la solución

- **Una fuente de verdad por tema:** README para navegación; documentos en `docs/` para conocimiento transversal; código y configuración para el contrato ejecutable.
- **Documentación ejecutable:** todo procedimiento debe incluir comandos, prerequisitos, resultado esperado y una verificación.
- **Configuración derivada del runtime:** las tablas de variables deben generarse o validarse contra el código para evitar drift.
- **Seguridad por diseño:** ningún documento versionado contiene secretos reales, tokens, valores de producción ni dumps de configuración.
- **Separación por audiencia:** onboarding, desarrollo, deploy y operaciones no deben mezclarse en una guía interminable.
- **Actualización junto con el código:** cambiar una variable, endpoint, migración, workflow o flujo crítico exige actualizar el documento correspondiente en el mismo cambio.

## Arquitectura documental objetivo

```text
docs/
├── README.md                         # Índice y mapa de lectura
├── getting-started.md                 # Primer día de un desarrollador
├── local-development.md               # Docker, servicios, comandos y troubleshooting
├── architecture.md                    # Contexto, límites y decisiones
├── contracts.md                       # SSOT, Zod, OpenAPI y generación Android
├── api.md                             # NestJS, módulos, auth, jobs y endpoints
├── web.md                             # React/Vite, features, build y deploy
├── site.md                            # Astro, contenido público y build estático
├── environment.md                     # Variables y secretos por aplicación
├── infrastructure.md                  # Render, Vercel, Neon, Redis, R2 y DNS
├── deployment-runbook.md              # QA, producción, smoke tests y rollback
├── operations/
│   ├── database.md                    # Migraciones, seeds, backups y recuperación
│   ├── payments.md                    # Gateways, webhooks, idempotencia y conciliación
│   ├── reports.md                     # Puppeteer, R2, PDFs y retención
│   ├── notifications.md               # SMTP/Resend y diagnóstico de email
│   └── incidents.md                   # Clasificación y respuesta a incidentes
├── decisions/                         # ADRs de decisiones técnicas importantes
└── runbooks/                          # Procedimientos repetibles y acotados
```

Los nombres pueden ajustarse durante la implementación, pero el índice debe permanecer estable y enlazar sólo archivos existentes.

## Plan por fases

### Fase 0: congelar el inventario y definir gobernanza

**Prioridad:** P0

**Objetivo:** establecer la línea base antes de escribir más prosa.

**Tareas:**

- [ ] Registrar todas las aplicaciones, paquetes, scripts, workflows y proveedores externos.
- [ ] Crear una matriz `variable -> consumidor -> entorno -> sensibilidad -> fuente de verdad`.
- [ ] Clasificar cada hallazgo como válido, obsoleto, faltante o ambiguo.
- [ ] Definir responsables por área: API, Web, Site, infraestructura, contratos y operaciones.
- [ ] Definir el formato mínimo de cada documento: propósito, audiencia, prerequisitos, procedimiento, verificación, troubleshooting y fecha de revisión.
- [ ] Definir que una PR que cambia código operativo debe actualizar documentación afectada o declarar por qué no aplica.

**Entregables:**

- `docs/README.md` inicial.
- Matriz de ownership y estado.
- Plantilla de documentación para nuevos documentos.
- Regla de revisión documental en `CONTRIBUTING.md` o en el README principal.

**Aceptación:** una persona externa puede encontrar qué documento leer y quién mantiene cada área.

### Fase 1: onboarding y desarrollo local

**Prioridad:** P0

**Documento:** `docs/getting-started.md` y `docs/local-development.md`.

**Tareas:**

- [x] Documentar Node, pnpm, versión de package manager y prerequisitos del sistema.
- [x] Explicar la estructura del monorepo: `apps/api`, `apps/web`, `apps/site`, `packages/contracts` y `packages/design-tokens`.
- [x] Documentar la copia de `.env.example` por aplicación, sin incluir secretos.
- [x] Explicar qué levanta `infra/docker/docker-compose.yml`: PostgreSQL, Redis, Mailpit, pgAdmin y Jaeger.
- [x] Documentar puertos, URLs locales, credenciales ficticias y cómo verificar cada servicio.
- [x] Documentar `pnpm install`, `pnpm dev`, `pnpm dev:api`, `pnpm dev:web`, `pnpm dev:site` y builds individuales.
- [x] Documentar `pnpm lint`, `pnpm test`, `pnpm build` y los filtros de Turborepo.
- [x] Agregar troubleshooting para puertos ocupados, Docker detenido, base no inicializada, Puppeteer y variables faltantes.
- [x] Documentar `db:bootstrap`, `seed:admin` y la diferencia entre migración, bootstrap y seed.

**Aceptación:** un desarrollador nuevo levanta API, Web y Site siguiendo sólo estos documentos y obtiene una respuesta HTTP, una pantalla Web y una página Site.

### Fase 2: arquitectura global y decisiones

**Prioridad:** P0

**Documento:** `docs/architecture.md`.

**Estado:** documento inicial completado; quedan pendientes los ADRs y las ampliaciones de flujos específicas.

**Tareas:**

- [ ] Explicar el contexto del sistema: aplicación Android externa, API, dashboard Web, Site, PostgreSQL, Redis, R2, Firebase, proveedores de pago y email.
- [ ] Separar arquitectura lógica de arquitectura de despliegue.
- [ ] Documentar límites de responsabilidad: UI, features, API, contratos, adapters e infraestructura.
- [ ] Documentar el flujo de una petición HTTP desde cliente hasta persistencia.
- [ ] Documentar los flujos críticos: login, generación de reporte, envío de email, checkout, webhook y fulfillment.
- [ ] Crear ADRs para decisiones relevantes: monorepo, contratos compartidos, Redis, almacenamiento privado, gateway de pagos y serverless.
- [ ] Explicar qué no debe modificarse desde cada capa y dónde vive la lógica de negocio.

**Aceptación:** un nuevo dev puede ubicar el código correcto para una feature sin recorrer todo el repositorio.

### Fase 3: contratos, API y Swagger

**Prioridad:** P0

**Documentos:** `docs/contracts.md`, `docs/api.md` y, si sigue siendo necesario, `docs/api-swagger.md`.

**Estado:** contratos compartidos documentados; API y Swagger quedan pendientes.

**Tareas:**

- [x] Documentar `packages/contracts` como fuente de verdad.
- [x] Explicar schemas Zod, tipos inferidos, exports y validación.
- [x] Documentar el pipeline de quicktype y la generación de modelos para Android.
- [x] Documentar reglas de compatibilidad y cambios breaking.
- [ ] Documentar cómo API y Web consumen los contratos.
- [ ] Documentar autenticación JWT/Firebase, roles, guards y errores esperados.
- [ ] Documentar convenciones de módulos NestJS, DTOs, repositories, adapters y servicios.
- [ ] Documentar cómo generar, consultar y publicar OpenAPI/Swagger si el flujo está activo.
- [ ] Incluir ejemplos sin datos reales de request, response y error.

**Aceptación:** un cambio de contrato tiene un procedimiento claro, impacto conocido y pruebas asociadas.

### Fase 4: backend operativo

**Prioridad:** P1

**Documento:** ampliar `docs/api.md` y crear runbooks específicos.

**Tareas:**

- [ ] Mapear módulos de API y sus dependencias.
- [ ] Documentar TypeORM, conexión PostgreSQL, migraciones, índices y transacciones.
- [ ] Documentar seeds, datos demo y cómo resetear un entorno no productivo.
- [ ] Documentar BullMQ/Redis, workers, reintentos, idempotencia y manejo de trabajos fallidos.
- [ ] Documentar generación de PDFs, instalación de Chromium y diferencias Docker/Render/serverless.
- [ ] Documentar R2/S3, bucket privado, prefijos, URLs firmadas, retención y recuperación.
- [ ] Documentar logging, errores, health checks y observabilidad existente.
- [ ] Documentar límites y defaults que hoy sólo están implícitos en el código.

**Aceptación:** un dev puede diagnosticar un reporte fallido, un job trabado o una conexión de infraestructura sin conocimiento oral.

### Fase 5: pagos y monetización

**Prioridad:** P0

**Documentos:** `docs/operations/payments.md` y el documento de monetización existente, si se recupera o se reemplaza.

**Tareas:**

- [ ] Documentar la selección explícita de `PAYMENT_GATEWAY`.
- [ ] Separar claramente Stripe, Mercado Pago, Google Play y simulación.
- [ ] Documentar credenciales requeridas por proveedor y entorno.
- [ ] Documentar formato y registro de webhooks.
- [ ] Documentar idempotencia, reintentos, estados de pago y fulfillment.
- [ ] Documentar cómo probar en sandbox sin tocar producción.
- [ ] Documentar conciliación manual y recuperación ante webhook duplicado o perdido.
- [ ] Resolver la discrepancia de `render.yaml` antes de marcar producción como soportada.
- [ ] Añadir smoke tests de configuración que fallen si el gateway declarado no coincide con sus credenciales.

**Aceptación:** el deploy de pagos es reproducible, las credenciales mínimas están verificadas y existe un procedimiento de rollback o pausa.

### Fase 6: Web y Site

**Prioridad:** P1

**Documentos:** `docs/web.md` y `docs/site.md`.

**Web:**

- [ ] Documentar React, Vite, Tailwind/shadcn, estructura feature-first y reglas de UI.
- [ ] Documentar routing, auth, cliente API, almacenamiento local y manejo de errores.
- [ ] Documentar `VITE_API_URL`, `VITE_PUBLIC_TEST_URL` y `VITE_WHATSAPP_URL`.
- [ ] Explicar que `VITE_*` queda embebido en el bundle y nunca puede contener secretos.
- [ ] Documentar build, preview, Vercel rewrite y Docker/Nginx.
- [ ] Documentar pruebas Vitest y criterios para agregar una prueba de feature.

**Site:**

- [ ] Documentar Astro, páginas, componentes, i18n y salida estática.
- [ ] Documentar `PUBLIC_WEB_URL`, `PUBLIC_PLAY_STORE_URL`, `PUBLIC_API_URL`, `PUBLIC_FORM_ENDPOINT` y `PUBLIC_MAINTENANCE_MODE`.
- [ ] Explicar que `PUBLIC_*` es público y se resuelve durante el build.
- [ ] Documentar formulario de contacto, endpoint, fallbacks y mantenimiento.
- [ ] Alinear `apps/site/.env.example` con las variables realmente consumidas.
- [ ] Documentar el proveedor de hosting y el comando de build una vez definido.

**Aceptación:** un dev puede cambiar una feature Web o una página Site, probarla localmente y desplegarla sin adivinar nombres de variables ni comandos.

### Fase 7: variables, infraestructura y despliegue

**Prioridad:** P0

**Documentos:** mantener `docs/deployment-environment.md`, crear `docs/infrastructure.md` y `docs/deployment-runbook.md`.

**Tareas:**

- [ ] Convertir la matriz actual de variables en una fuente validable automáticamente.
- [ ] Decidir si la API usa `DATABASE_URL` o variables individuales por proveedor y documentar una única recomendación.
- [ ] Decidir el contrato oficial de Redis: `REDIS_URL`, `QUEUE_REDIS_URL` o componentes.
- [ ] Decidir el contrato oficial de email: `RESEND_API_KEY` o `MAIL_PRO_*` y retirar nombres muertos.
- [ ] Completar `render.yaml` con todas las variables de producción requeridas.
- [ ] Documentar diferencias QA/production y ramas asociadas.
- [ ] Documentar Render, Vercel, Neon, Redis, R2, Firebase, Google Play y DNS.
- [ ] Documentar el orden de deploy: infraestructura, API, migraciones, seeds, Web, Site y smoke tests.
- [ ] Documentar rollback por aplicación y qué cambios de base no son reversibles.
- [ ] Documentar rotación de JWT, DB, Redis, R2, SMTP, Stripe, Mercado Pago, Neon y GitHub Actions.
- [ ] Añadir una tabla de URLs, dominios, webhooks y responsables sin incluir tokens.

**Aceptación:** una persona autorizada puede desplegar QA y producción siguiendo el runbook y puede comprobar que no faltan variables críticas.

### Fase 8: operaciones y respuesta a incidentes

**Prioridad:** P1

**Documentos:** `docs/operations/*.md` y `docs/operations/incidents.md`.

**Tareas:**

- [ ] Definir health checks y señales de servicio caído.
- [ ] Documentar diagnóstico de API, base, Redis, R2, Puppeteer y email.
- [ ] Documentar incidentes de pagos y webhooks.
- [ ] Documentar pérdida o duplicación de jobs.
- [ ] Documentar backup, restore y prueba periódica de recuperación.
- [ ] Definir severidad, canal de comunicación, responsable y postmortem.
- [ ] Agregar checklist de cierre de incidente y actualización documental.

**Aceptación:** cada incidente recurrente tiene un procedimiento de diagnóstico y una salida segura.

### Fase 9: automatización de calidad documental

**Prioridad:** P1

**Tareas:**

- [ ] Validar enlaces Markdown internos en CI.
- [ ] Fallar CI si `README.md` enlaza un archivo inexistente.
- [ ] Validar que cada variable usada por runtime tenga entrada en la documentación o una excepción explícita.
- [ ] Validar que `.env.example` no contenga patrones de tokens reales.
- [ ] Comparar las variables declaradas en `render.yaml` con las requeridas por producción.
- [ ] Añadir `docs:check` al root `package.json`.
- [ ] Añadir una revisión de documentación al template de PR.
- [ ] Registrar fecha y propietario de documentos operativos.

**Aceptación:** el drift documental básico se detecta en una PR, no durante un deploy fallido.

## Orden recomendado de ejecución

1. Corregir el índice del README y crear `docs/README.md`.
2. Completar onboarding y entorno local.
3. Resolver contratos de variables y la configuración de Render.
4. Documentar arquitectura y contratos.
5. Documentar API, pagos y operaciones críticas.
6. Documentar Web y Site.
7. Completar runbook de deploy y rollback.
8. Automatizar validaciones documentales.
9. Revisar todos los documentos con un desarrollador que no haya participado en su creación.

## Definition of Done documental

Una fase se considera terminada sólo cuando:

- [ ] El documento existe y está enlazado desde el índice correcto.
- [ ] Declara audiencia, prerequisitos, comandos y resultado esperado.
- [ ] Sus ejemplos no contienen secretos ni dominios privados.
- [ ] Sus afirmaciones fueron contrastadas con código/configuración actual.
- [ ] Incluye troubleshooting para los fallos más probables.
- [ ] Tiene propietario y criterio de actualización.
- [ ] Sus enlaces internos funcionan.
- [ ] Un desarrollador externo pudo completar el procedimiento sin ayuda oral.

## Métricas de seguimiento

- Porcentaje de enlaces internos válidos.
- Porcentaje de variables runtime documentadas.
- Tiempo para levantar el entorno local desde cero.
- Tiempo para ejecutar un deploy QA.
- Cantidad de pasos manuales no documentados detectados en cada deploy.
- Cantidad de incidentes con runbook disponible.
- Edad de la última revisión de cada documento operativo.

## Primer sprint sugerido

Para obtener valor rápido sin intentar escribir todo de una vez:

1. Crear el índice documental y corregir los enlaces rotos del README.
2. Completar onboarding/local development.
3. Reconciliar `.env.example`, runtime y `render.yaml`.
4. Completar el runbook de deploy QA con smoke tests.
5. Documentar pagos y webhooks antes del próximo cambio de monetización.
6. Agregar el chequeo de enlaces y variables a CI.

El resultado de ese sprint debe ser un repositorio que se pueda clonar, levantar y desplegar en QA con instrucciones verificables y sin depender de secretos guardados en archivos locales.
