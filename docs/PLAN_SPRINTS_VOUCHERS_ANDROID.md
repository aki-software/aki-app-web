# Plan de Sprints - Integracion Vouchers API en Android

> Fecha de creacion: 2026-04-13  
> Ultima actualizacion: 2026-04-15 (S1-08 cerrado; Sprint 3 hecho; PR plan S4-S5 documentado)  
> Estado: Aprobado para ejecucion

---

## Objetivo

Implementar de punta a punta el consumo de vouchers en el cliente Android (`CotejoApp`), con contrato estable en backend (`akit-platform/apps/api`) y cobertura de calidad suficiente para salida a staging/produccion.

## Alcance

- Incluye: endurecimiento de API vouchers, contrato compartido, integracion Android, QA y pre-release.
- No incluye: pasarela de pagos, rediseño UX completo, refactor total de modulos no vinculados a vouchers.

## Entregables finales

1. API vouchers consistente y validada.
2. Contratos compartidos actualizados para vouchers.
3. Feature vouchers funcional en Android.
4. Pruebas tecnicas y funcionales documentadas.
5. Checklist de salida y riesgos controlados.

---

## Sprint 0 (0.5-1 dia) - Cierre de contrato

### Objetivo
Congelar el contrato API para evitar retrabajo durante la implementacion Android.

### Tareas
- Definir campos finales de request/response por endpoint de vouchers.
- Alinear reglas de `status`, `expiration`, `code`, `expiresAt` y errores.
- Acordar formato de errores para mobile (envelope + codigos de negocio).
- Confirmar campos realmente necesarios en `POST /vouchers/resolve`.

### Criterio de salida
- Contrato funcional firmado por backend y Android.
- Sin ambiguedades de tipos ni de reglas de validacion.

### Resultado real (cerrado)
- Android consume vouchers solo para validar/canjear.
- Codigo de voucher definido como alfanumerico de 8 caracteres.
- Sin expiracion activa para el flujo Android en esta etapa.
- Android no requiere estado `REVOKED` para su UX inicial.
- Canje vinculado a `sessionId` y con idempotencia por sesion.
- Errores funcionales requeridos por Android: `INVALID_CODE`, `ALREADY_USED`.
- Se definio estrategia de auth con token exchange para mobile (Firebase -> JWT backend) para la fase de integracion de auth.

---

## Sprint 1 (2-3 dias) - Hardening backend vouchers

### Objetivo
Dejar la API de vouchers robusta, segura y predecible para clientes moviles.

### Tareas
- Endurecer validaciones DTO y parametros (`id`, `email`, fechas, enums).
- Corregir inconsistencias de longitud y formato del codigo de voucher.
- Estandarizar respuesta de listados (paginacion y filtros).
- Revisar seguridad del endpoint publico de `resolve`.
- Agregar/actualizar tests unitarios e integracion de vouchers.

### Criterio de salida
- Tests de vouchers en verde.
- Contrato backend estable y coherente.

### Avance
- Implementado endpoint protegido `POST /api/v1/vouchers/redeem` (canje por `code + sessionId`).
- Implementada logica idempotente: si el voucher ya fue canjeado por la misma sesion, responde exito sin duplicar consumo.
- Implementado error de negocio `INVALID_CODE` cuando el codigo no existe.
- Implementado error de negocio `ALREADY_USED` cuando el voucher fue usado por otra sesion.
- El canje actualiza voucher y sesion en una transaccion para consistencia.
- Validacion global endurecida con `forbidNonWhitelisted`.
- `send-email` y `resend` migrados a DTO tipado con validacion de email.
- `:id` en `send-email`, `resend` y `revoke` validado con `ParseUUIDPipe`.
- Regla de `code` unificada a alfanumerico exacto de 8 en create/resolve/redeem y en generacion interna.
- `expiresAt` validado como fecha ISO (`IsDateString`) cuando se informa.
- `resolve` protegido con JWT para reducir exposicion de datos.
- Paginacion de `GET /vouchers` normalizada para devolver siempre `page` y `limit`.
- Tests unitarios de vouchers en verde (`pnpm --filter api test -- vouchers`: 4 suites, 23 tests).
- `test:e2e` validado en verde tras estabilizar conectividad local de Postgres (`pnpm --filter api test:e2e`: 1 suite, 5 tests).

---

## Sprint 2 (1-2 dias) - Contratos compartidos

### Objetivo
Consolidar una sola fuente de verdad para Web y Android.

### Tareas
- Extender `packages/contracts` con modelos y respuestas de vouchers.
- Tipar enums (`VoucherStatus`, `OwnerType`) y envelope de error.
- Validar uso real del contrato desde Web (compilacion y consumo).
- Dejar versionado interno del contrato para seguimiento.

### Criterio de salida
- `packages/contracts` cubre vouchers end-to-end.
- Web y Android pueden usar el mismo contrato.

### Avance (cerrado)
- `@akit/contracts` actualizado a `1.1.0` con contrato vouchers tipado y schemas runtime con `zod`.
- Catalogo de errores estable incorporado (`INVALID_CODE`, `ALREADY_USED`, `SESSION_NOT_FOUND`, `UNAUTHORIZED`, `VALIDATION_ERROR`).
- Exportador JSON schema agregado (`pnpm --filter @akit/contracts export:json`).
- Changelog/versionado simple documentado en `packages/contracts/CONTRACT_CHANGELOG.md`.
- Generacion automatica de modelos Kotlin para Android implementada (`pnpm --filter @akit/contracts generate:android`).
- Archivo generado para Android: `CotejoApp/app/src/main/java/com/akit/app/contracts/generated/VoucherContracts.kt`.
- Web integrado con tipos compartidos de vouchers y build validado.

---

## Sprint 3 (3-4 dias) - Fundaciones Android de red y auth

### Objetivo
Preparar una base tecnica segura para consumir vouchers.

### Tareas
- Incorporar cliente de red tipado (Retrofit/OkHttp o equivalente definido).
- Configurar auth bearer centralizada para endpoints protegidos.
- Implementar parseo/mapper de errores HTTP a errores de dominio.
- Integrar DI para nuevo cliente sin romper flujo actual.
- Mantener compatibilidad temporal con cliente legacy hasta migracion completa.

### Avance
- Creado `NetworkModule` en Android con `OkHttpClient` + `Retrofit` + `GsonConverterFactory`.
- Agregadas dependencias de red en `gradle/libs.versions.toml` y `app/build.gradle.kts`.
- Declarada interfaz `VouchersApi` para `POST /api/v1/vouchers/redeem` como prueba tecnica base.
- Declarada interfaz `SessionsApi` para `POST /api/v1/sessions/{id}/send-report`.
- Compilacion validada: `gradlew.bat :app:compileDebugKotlin`.
- Iniciado manejo de auth de red con `AuthInterceptor` (Bearer token desde Firebase).
- Iniciado manejo base de 401 con `UnauthorizedInterceptor` (limpieza de cache local de `backend_user_id`).
- Iniciado mapper de errores HTTP a dominio con `HttpErrorMapper` y nuevo contrato `ApiResult/RemoteFailure`.
- Integrado primer flujo protegido de vouchers (`redeemVoucherProtected`) con parseo de error de negocio (`code/message`) y errores de red/timeouts.
- Integrado flujo protegido de envio de reporte (`sendReportProtected`) y adaptados `SendEmailReportUseCase` + `SyncSessionWorker` al nuevo contrato de errores.
- Migradas operaciones remotas legacy (`ensureBackendUserId`, `completeSession`, `fetchAllMaterial`) a variantes protegidas `*Protected` con wrappers de compatibilidad temporal.
- Avance de integracion DI sin ruptura: `SyncCompletedSessionToBackendUseCase`, `SyncSessionWorker` y `MaterialTeoricoRepositoryImpl` ahora consumen el flujo protegido.
- Etapa de transicion cerrada: wrappers legacy removidos en `BackendApiClient`; el consumo interno queda alineado al cliente nuevo.
- Ajuste de fiabilidad del flujo final: `FinalizeVocationalTestUseCase` intenta sincronizar la sesion al backend en el mismo cierre del test y mantiene `WorkManager` como respaldo.
- `send-report` habilitado para mobile sin requerir JWT backend mientras se implementa token exchange Firebase -> JWT.
- Correccion de UX en Android para mostrar estado real del envio de informe (sin falso positivo de exito).

### Criterio de salida
- Al menos un endpoint backend funcionando por la nueva capa de red.
- Base de auth y errores lista para vouchers.

### Estado real
- Sprint 3 cerrado funcionalmente: sync de sesion backend validado en dispositivo real, envio de informe operativo en entorno dev (Mailtrap) y UX sin falso positivo.

---

## Sprint 4 (4-5 dias) — Feature vouchers Android end-to-end

### Objetivo
Entregar la funcionalidad completa de vouchers en Android.

### Tareas
- Crear modelos de dominio y casos de uso de vouchers.
- Implementar `Repository` + `RemoteDataSource` + mappers.
- Construir ViewModel y estados UI de lista/detalle/acciones.
- Agregar pantallas y navegacion de vouchers.
- Manejar estados de carga, vacio, error y reintentos.
- Integrar estado de desbloqueo de informe por voucher (`UNLOCKED_BY_VOUCHER`).
- Integrar estado de desbloqueo de informe por pago (`UNLOCKED_BY_PAYMENT`).
- Introducir maquina de estados para informe (`SessionSyncState`, `ReportUnlockState`, `ReportDeliveryState`).

### Criterio de salida
- Flujo funcional en dispositivo: listar -> detalle -> accion (enviar/reenviar/revocar segun permiso).
- Flujo funcional de informe en dispositivo: terminar test -> desbloquear (voucher o pago) -> solicitar informe -> estado final (`SENT` o `QUEUED` con reintento).

---

## Sprint 5 (1-2 dias) — QA, seguridad y salida

### Objetivo
Reducir riesgo de release y dejar evidencia de calidad.

### Tareas
- Pruebas unitarias (mappers, use cases, ViewModel).
- Pruebas funcionales de integracion contra backend real/staging.
- Revisar configuracion de red para release (cleartext, policies).
- Actualizar documentacion tecnica final.
- Checklist de Go/No-Go con riesgos y mitigaciones.
- Validar matriz de casos de informe: backend caido, backend recuperado, voucher valido/invalido/usado, pago aprobado/rechazado.

### Criterio de salida
- Evidencia de pruebas y checklist cerrada.
- Lista para despliegue controlado.

## Plan de ejecucion por PR (S4-S5)

1. PR1: Maquina de estados de informe + UI base de estados.
2. PR2: Desbloqueo por voucher (UI + canje + errores).
3. PR3: Desbloqueo por pago (estado + transiciones).
4. PR4: Resiliencia y orquestacion worker para entrega eventual.
5. PR5: QA E2E, hardening y cierre documental.

Ver detalle operativo en `docs/IMPLEMENTACION_INFORME_ANDROID_PR_PLAN.md`.

---

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigacion |
|---|---|---|
| Cambios de contrato durante implementacion | Alto | Congelar contrato en Sprint 0 |
| Auth mobile-backend desalineada | Alto | Definir estrategia bearer en Sprint 3 |
| Parseo inestable por respuestas heterogeneas | Medio | Tipado + contrato compartido en Sprint 2 |
| Retrabajo por red legacy | Medio | Migracion incremental con coexistencia temporal |
| Falta de cobertura de tests | Alto | Gate de salida en Sprint 5 |

## Dependencias

- Backend vouchers (`apps/api`) disponible en entorno de prueba.
- Acceso a credenciales/entorno de staging para validacion real.
- Coordinacion entre responsables de backend y Android.

## Definicion de Done (global del plan)

Un sprint se considera cerrado cuando:

1. Cumple su criterio de salida.
2. Tiene evidencia (tests, notas tecnicas o demo funcional).
3. Queda registrado el estado en handoff/documentacion.

---

## Seguimiento sugerido

- Reuniones cortas diarias (15 min) con foco en bloqueos.
- Actualizacion de este archivo al cierre de cada sprint.
- Registro de cambios relevantes en `docs/backend/HANDOFF_YYYY-MM-DD.md`.
