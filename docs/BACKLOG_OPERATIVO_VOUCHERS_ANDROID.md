# Backlog Operativo - Vouchers API + Android

> Fecha de creacion: 2026-04-13  
> Ultima actualizacion: 2026-04-15 (S1-08 cerrado; Sprint 3 hecho; roadmap PR1-PR5 documentado)  
> Basado en: `docs/PLAN_SPRINTS_VOUCHERS_ANDROID.md`

---

## Como usar este backlog

- `Owner sugerido`: rol responsable principal (se puede ajustar por equipo real).
- `Estimacion`: horas efectivas de trabajo.
- `Dependencias`: tareas que deben estar cerradas antes.
- `Estado`: `pendiente`, `en progreso`, `hecho`, `bloqueado`.

---

## Sprint 0 - Cierre de contrato (0.5-1 dia)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S0-01 | Levantar contrato actual de endpoints vouchers | `akit-platform/apps/api/src/vouchers/vouchers.controller.ts`, `akit-platform/apps/api/src/vouchers/dto/*`, `akit-platform/apps/api/src/vouchers/entities/*` | Backend | 2 | - | hecho |
| S0-02 | Definir contrato final (request/response + errores) | `docs/backend/MVP_OWNERSHIP_Y_PERMISOS.md`, `docs/PLAN_SPRINTS_VOUCHERS_ANDROID.md` | Backend + Android Lead | 2 | S0-01 | hecho |
| S0-03 | Validar impacto en Web por contrato final | `akit-platform/apps/web/src/features/dashboard/api/vouchers.api.ts` | Web | 1 | S0-02 | hecho |
| S0-04 | Aprobacion tecnica del contrato (acta breve) | `docs/BACKLOG_OPERATIVO_VOUCHERS_ANDROID.md` | Tech Lead | 1 | S0-02, S0-03 | hecho |

Subtotal estimado Sprint 0: **6 h**

---

## Sprint 1 - Hardening backend vouchers (2-3 dias)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S1-00 | Implementar endpoint de canje idempotente por sesion (`POST /vouchers/redeem`) | `akit-platform/apps/api/src/vouchers/vouchers.controller.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.ts`, `akit-platform/apps/api/src/vouchers/dto/redeem-voucher.dto.ts`, `akit-platform/apps/api/src/vouchers/vouchers.controller.spec.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.spec.ts` | Backend | 4 | S0-04 | hecho |
| S1-01 | Endurecer validaciones globales (whitelist/forbid segun decision) | `akit-platform/apps/api/src/main.ts` | Backend | 1 | S0-04 | hecho |
| S1-02 | DTO para body `send-email`/`resend` con validacion de email | `akit-platform/apps/api/src/vouchers/dto/send-voucher-email.dto.ts`, `akit-platform/apps/api/src/vouchers/vouchers.controller.ts` | Backend | 2 | S0-04 | hecho |
| S1-03 | Validar `expiresAt` como fecha valida y no string libre | `akit-platform/apps/api/src/vouchers/dto/create-voucher.dto.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.ts` | Backend | 2 | S0-04 | hecho |
| S1-04 | Unificar reglas de longitud de `code` (DTO, generador, entidad) | `akit-platform/apps/api/src/vouchers/dto/create-voucher.dto.ts`, `akit-platform/apps/api/src/vouchers/dto/resolve-voucher.dto.ts`, `akit-platform/apps/api/src/vouchers/entities/voucher.entity.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.ts` | Backend | 3 | S0-04 | hecho |
| S1-05 | Agregar `ParseUUIDPipe` en rutas `:id` donde aplique | `akit-platform/apps/api/src/vouchers/vouchers.controller.ts` | Backend | 1 | S0-04 | hecho |
| S1-06 | Normalizar filtros (`status`, `expiration`) y paginacion consistente | `akit-platform/apps/api/src/vouchers/dto/list-vouchers.dto.ts`, `akit-platform/apps/api/src/vouchers/dto/list-voucher-batches.dto.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.ts` | Backend | 3 | S0-04 | hecho |
| S1-07 | Revisar riesgo de exposicion en `POST /vouchers/resolve` | `akit-platform/apps/api/src/vouchers/vouchers.controller.ts`, `akit-platform/apps/api/src/vouchers/vouchers.service.ts` | Backend + Seguridad | 2 | S0-04 | hecho |
| S1-08 | Tests unitarios y e2e de vouchers | `akit-platform/apps/api/src/vouchers/*.spec.ts`, `akit-platform/apps/api/test/*` | Backend QA | 4 | S1-02,S1-03,S1-04,S1-05,S1-06,S1-07 | hecho |

Subtotal estimado Sprint 1: **18 h**

---

## Sprint 2 - Contratos compartidos (1-2 dias)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S2-01 | Definir tipos vouchers en contracts | `akit-platform/packages/contracts/src/index.ts`, `akit-platform/packages/contracts/src/vouchers.schemas.ts`, `akit-platform/packages/contracts/src/errors.schemas.ts` | Backend | 3 | S1-08 | hecho |
| S2-02 | Publicar/compilar contratos y revisar tipos generados | `akit-platform/packages/contracts/package.json`, `akit-platform/packages/contracts/dist/*`, `akit-platform/packages/contracts/src/export-json-schemas.ts`, `akit-platform/packages/contracts/dist/json-schema/vouchers.schemas.json` | Backend | 2 | S2-01 | hecho |
| S2-03 | Adaptar Web para usar tipos compartidos | `akit-platform/apps/web/src/features/dashboard/api/vouchers.api.ts` | Web | 2 | S2-01 | hecho |
| S2-04 | Documentar version de contrato y breaking changes | `akit-platform/packages/contracts/CONTRACT_CHANGELOG.md`, `docs/PLAN_SPRINTS_VOUCHERS_ANDROID.md`, `docs/BACKLOG_OPERATIVO_VOUCHERS_ANDROID.md` | Tech Lead | 1 | S2-03 | hecho |
| S2-05 | Generacion automatica de modelos Android desde contrato | `akit-platform/packages/contracts/src/generate-android-models.ts`, `CotejoApp/app/src/main/java/com/akit/app/contracts/generated/VoucherContracts.kt` | Backend + Android | 2 | S2-02 | hecho |

Subtotal estimado Sprint 2: **8 h**

---

## Sprint 3 - Fundaciones Android de red y auth (3-4 dias)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S3-01 | Crear modulo de red tipado (Retrofit/OkHttp o stack definido) | `CotejoApp/app/src/main/java/com/akit/app/di/NetworkModule.kt`, `CotejoApp/app/build.gradle.kts` | Android | 4 | S2-04 | hecho |
| S3-02 | Interceptor auth bearer y manejo 401 base | `CotejoApp/app/src/main/java/com/akit/app/data/remote/*` | Android | 3 | S3-01 | hecho |
| S3-03 | Error mapper HTTP -> dominio | `CotejoApp/app/src/main/java/com/akit/app/data/remote/*`, `CotejoApp/app/src/main/java/com/akit/app/util/*` | Android | 3 | S3-01 | hecho |
| S3-04 | Integrar DI de cliente nuevo sin romper legacy | `CotejoApp/app/src/main/java/com/akit/app/di/*`, `CotejoApp/app/src/main/java/com/akit/app/data/remote/BackendApiClient.kt` | Android | 3 | S3-01,S3-02 | hecho |
| S3-05 | Prueba tecnica con 1 endpoint protegido real | `CotejoApp/app/src/main/java/com/akit/app/data/remote/*` | Android QA | 2 | S3-02,S3-03,S3-04 | en progreso |

Subtotal estimado Sprint 3: **15 h**

---

## Sprint 4 - Feature vouchers Android end-to-end (4-5 dias)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S4-01 | Modelos de dominio vouchers + enums | `CotejoApp/app/src/main/java/com/akit/app/domain/model/*` | Android | 3 | S3-05 | pendiente |
| S4-02 | Contrato API vouchers Android (DTO + service) | `CotejoApp/app/src/main/java/com/akit/app/data/remote/*` | Android | 4 | S4-01 | pendiente |
| S4-03 | Repository vouchers + mappers | `CotejoApp/app/src/main/java/com/akit/app/data/repository/*`, `CotejoApp/app/src/main/java/com/akit/app/domain/repository/*` | Android | 4 | S4-02 | pendiente |
| S4-04 | Use cases vouchers | `CotejoApp/app/src/main/java/com/akit/app/domain/usecase/*` | Android | 3 | S4-03 | pendiente |
| S4-05 | ViewModel vouchers y estados UI | `CotejoApp/app/src/main/java/com/akit/app/ui/viewmodel/*` | Android | 3 | S4-04 | pendiente |
| S4-06 | Pantallas vouchers (lista/detalle/acciones) | `CotejoApp/app/src/main/java/com/akit/app/ui/screens/*`, `CotejoApp/app/src/main/java/com/akit/app/ui/components/*` | Android | 5 | S4-05 | pendiente |
| S4-07 | Navegacion y rutas vouchers | `CotejoApp/app/src/main/java/com/akit/app/navigation/NavGraph.kt`, `CotejoApp/app/src/main/java/com/akit/app/navigation/Screen.kt` | Android | 2 | S4-06 | pendiente |
| S4-08 | Manejo UX de estados (loading, vacio, error) | `CotejoApp/app/src/main/java/com/akit/app/ui/screens/*`, `CotejoApp/app/src/main/java/com/akit/app/ui/viewmodel/*` | Android | 2 | S4-06 | pendiente |
| S4-09 | Maquina de estados de informe (sync/unlock/delivery) | `CotejoApp/app/src/main/java/com/akit/app/domain/model/*`, `CotejoApp/app/src/main/java/com/akit/app/domain/usecase/*`, `CotejoApp/app/src/main/java/com/akit/app/ui/viewmodel/*` | Android | 3 | S4-08 | pendiente |
| S4-10 | Flujo desbloqueo por voucher (UI + canje + errores) | `CotejoApp/app/src/main/java/com/akit/app/ui/screens/results/*`, `CotejoApp/app/src/main/java/com/akit/app/data/remote/*`, `CotejoApp/app/src/main/java/com/akit/app/domain/usecase/*` | Android | 4 | S4-09 | pendiente |
| S4-11 | Flujo desbloqueo por pago (estado + transiciones) | `CotejoApp/app/src/main/java/com/akit/app/domain/model/*`, `CotejoApp/app/src/main/java/com/akit/app/ui/viewmodel/*` | Android | 3 | S4-09 | pendiente |
| S4-12 | Cola/reintentos de envio de informe (orquestacion worker) | `CotejoApp/app/src/main/java/com/akit/app/data/worker/*`, `CotejoApp/app/src/main/java/com/akit/app/data/local/*` | Android | 3 | S4-10,S4-11 | pendiente |
| S4-13 | Telemetria de funnel de informe (requested/queued/sent/failed) | `CotejoApp/app/src/main/java/com/akit/app/data/analytics/*`, `CotejoApp/app/src/main/java/com/akit/app/ui/viewmodel/*` | Android | 2 | S4-12 | pendiente |

Subtotal estimado Sprint 4: **41 h**

---

## Sprint 5 - QA, seguridad y salida (1-2 dias)

| ID | Tarea | Archivo(s) objetivo | Owner sugerido | Estimacion (h) | Dependencias | Estado |
|---|---|---|---|---:|---|---|
| S5-01 | Unit tests Android (mappers/use cases/viewmodel) | `CotejoApp/app/src/test/**` | Android QA | 4 | S4-08 | pendiente |
| S5-02 | Pruebas funcionales integradas contra staging | `docs/backend/HANDOFF_YYYY-MM-DD.md` | QA | 3 | S5-01 | pendiente |
| S5-03 | Revisar seguridad de red para release | `CotejoApp/app/src/main/AndroidManifest.xml`, `CotejoApp/app/src/main/res/xml/network_security_config.xml` | Android | 2 | S5-02 | pendiente |
| S5-04 | Actualizar documentacion tecnica final | `CotejoApp/docs/DOCUMENTACION_TECNICA.md`, `docs/PLAN_SPRINTS_VOUCHERS_ANDROID.md` | Tech Lead | 2 | S5-02 | pendiente |
| S5-05 | Checklist Go/No-Go y decision de salida | `docs/BACKLOG_OPERATIVO_VOUCHERS_ANDROID.md` | Tech Lead + QA + Producto | 1 | S5-03,S5-04 | pendiente |

Subtotal estimado Sprint 5: **12 h**

---

## Resumen de estimacion total

- Sprint 0: 6 h
- Sprint 1: 18 h
- Sprint 2: 8 h
- Sprint 3: 15 h
- Sprint 4: 41 h
- Sprint 5: 12 h

**Total estimado: 100 horas efectivas**

> Nota: con 1 dev backend + 1 dev Android + soporte QA parcial, esto normalmente cae en 2-3 semanas de calendario segun bloqueos externos.

---

## Seguimiento de avance

### Estado por sprint

| Sprint | Estado | Inicio | Fin | Comentarios |
|---|---|---|---|---|
| 0 | hecho | 2026-04-13 | 2026-04-13 | contrato cerrado con negocio |
| 1 | hecho | 2026-04-13 | 2026-04-15 | unit + e2e vouchers en verde |
| 2 | hecho | 2026-04-13 | 2026-04-13 | contrato runtime + export JSON + modelos Kotlin generados |
| 3 | hecho | 2026-04-15 | 2026-04-15 | fundaciones de red/auth/error completas e integradas |
| 4 | pendiente | - | - | - |
| 5 | pendiente | - | - | - |

### Bloqueos abiertos

| Fecha | Bloqueo | Impacto | Responsable | Estado |
|---|---|---|---|---|
| 2026-04-15 | Conexion local a Postgres intermitente (`Connection terminated unexpectedly`) durante e2e | Alto | Backend/DevOps | mitigado (reinicio de contenedor) |

### Notas de avance

- Sprint 0 cerrado con decisiones de contrato confirmadas por negocio.
- En Sprint 1 se implemento canje de voucher idempotente por sesion y hardening de validaciones.
- Cobertura de pruebas ejecutadas: `vouchers.controller.spec.ts`, `vouchers.service.spec.ts` y build `pnpm --filter api build`.
- `pnpm --filter api test:e2e` no cierra por dependencia de base de datos no estable/disponible en entorno local actual.
- Sprint 2 implementado: contratos vouchers con schemas runtime (`zod`), changelog/versionado simple, export JSON schema y generacion automatica de modelos Android.
- Build validado: `pnpm --filter @akit/contracts build`, `pnpm --filter @akit/contracts export:json`, `pnpm --filter @akit/contracts generate:android`, `pnpm --filter web build`.
- 2026-04-15: `pnpm --filter api test -- vouchers` ejecutado en verde (4 suites, 23 tests).
- 2026-04-15: reinicio de `akit-postgres` y revalidacion de conectividad local; `pnpm --filter api test:e2e` pasa (1 suite, 5 tests).
- 2026-04-15: iniciado `S3-01` con `NetworkModule` (Retrofit/OkHttp), dependencias agregadas en `libs.versions.toml` y `app/build.gradle.kts`.
- 2026-04-15: compilacion Android validada con `gradlew.bat :app:compileDebugKotlin`.
- 2026-04-15: iniciado `S3-02` con `AuthInterceptor` (Bearer con Firebase token) y `UnauthorizedInterceptor` (limpieza de cache local en 401).
- 2026-04-15: iniciado `S3-03` con `HttpErrorMapper`, `ApiResult/RemoteFailure` y primer consumo de mapper en canje protegido (`redeemVoucherProtected`).
- 2026-04-15: `sendReport` migrado a flujo protegido (`sendReportProtected`) con `SessionsApi` + mapper de errores.
- 2026-04-15: `SendEmailReportUseCase` y `SyncSessionWorker` adaptados para consumir `ApiResult`.
- 2026-04-15: `ensureBackendUserId`, `completeSession` y `fetchAllMaterial` migrados a variantes protegidas (`*Protected`) usando `ApiResult/RemoteFailure`, manteniendo wrappers legacy para compatibilidad.
- 2026-04-15: `SyncCompletedSessionToBackendUseCase`, `SyncSessionWorker` y `MaterialTeoricoRepositoryImpl` migrados a consumo de variantes `*Protected` para reducir dependencia efectiva del flujo legacy.
- 2026-04-15: wrappers legacy eliminados de `BackendApiClient`; consumidores internos quedan sobre flujo protegido.
- 2026-04-15: `FinalizeVocationalTestUseCase` ajustado para sincronizar sesion al backend al finalizar el test (camino inmediato) y mantener `WorkManager` como fallback cuando no se obtiene `backendSessionId`.
- 2026-04-15: `POST /sessions/:id/send-report` habilitado para flujo mobile sin guard JWT backend (la app actualmente firma con token Firebase); build API y tests de controller en verde.
- 2026-04-15: UI Android de envio de informe corregida para reflejar estados reales (`Success`, `Queued`, `NoSession`, `Error`) en lugar de mostrar exito por defecto.
- 2026-04-15: roadmap por PRs definido para cierre de informe Android: PR1 (state machine), PR2 (voucher unlock), PR3 (payment unlock), PR4 (resiliencia worker), PR5 (QA E2E).
- 2026-04-15: documento tecnico agregado con flujo de estados, transiciones y plan de archivos para PR1: `docs/IMPLEMENTACION_INFORME_ANDROID_PR_PLAN.md`.
