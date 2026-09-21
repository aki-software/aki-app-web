# Plan de PRs del refactor

Este plan convierte las fases técnicas en unidades pequeñas, revisables y reversibles. Cada PR debe tener un único objetivo principal, pruebas y documentación relacionada.

## Reglas de trabajo

- No mezclar refactor estructural con cambio de producto salvo que sea imprescindible.
- No mezclar API, Web y Site en el mismo PR si pueden evolucionar por contrato.
- Cada PR debe declarar dependencias y rollback.
- Los PRs que cambian `packages/contracts` requieren coordinación con todos sus consumidores.
- El orden es recomendado; sólo se puede saltar un PR con evidencia y actualización de este documento.

## Secuencia resumida

```text
PR-00 → PR-01 → PR-02 → PR-03
                    ↓
PR-04 → PR-05 → PR-06 → PR-07 → PR-08
                              ↓
                         PR-09 → PR-10
                                  ↓
                         PR-11 → PR-12
PR-05 ─────────────────────────→ PR-13 → PR-14
PR-13 ─────────────────────────→ PR-15
PR-01 ─────────────────────────→ PR-16 → PR-17 → PR-18
```

## PR-00: Documentación de continuidad

**Estado:** En progreso en la rama actual  
**Ownership:** Orquestación/documentación  
**Dependencias:** Ninguna

### Tareas

- Crear índice documental y contexto de producto.
- Registrar estado, auditoría y riesgos conocidos.
- Crear plan de refactor, runbooks, templates y ADR index.
- Conectar `README.md`, `AGENTS.md` y roadmap.

### Aceptación

- Un dev nuevo puede localizar contexto, riesgos y siguiente tarea desde `docs/README.md`.
- No quedan enlaces nuevos a documentos inexistentes.
- No se incluyen secretos ni datos personales.

## PR-01: Inventario observable de reportes

**Fase:** 0  
**Ownership:** API  
**Dependencias:** PR-00

### Tareas

- Crear consulta o comando read-only para reportes por estado y antigüedad.
- Exponer `reportId`, `sessionId`, estado, fechas, `objectKey`, `contentHash`, `jobId` y último error sin datos sensibles.
- Añadir métrica de edad y contador por estado.
- Añadir prueba de que el inventario no modifica datos.
- Documentar el procedimiento en `docs/operations/reports.md`.

### Aceptación

- Se pueden identificar reportes atascados sin inspección manual de tablas completas.
- El comando funciona en QA y falla de forma segura si falta configuración.
- Las métricas distinguen `STORAGE_PENDING`, `FAILED` y jobs ausentes.

## PR-02: Reconciliación segura de reportes

**Fase:** 0  
**Ownership:** API  
**Dependencias:** PR-01

### Tareas

- Implementar reconciliación explícita para `STORAGE_PENDING`.
- Comprobar existencia, hash y metadata del objeto antes de marcar `AVAILABLE`.
- Reencolar sólo cuando no exista un objeto válido y haya snapshot suficiente.
- Usar clave determinista para evitar duplicados.
- Registrar auditoría de cada decisión.
- Resolver los tres registros QA con un procedimiento verificable, no con SQL manual destructivo.

### Aceptación

- Un retry duplicado no genera dos objetos ni dos reportes disponibles.
- Un objeto existente con metadata incompatible no se sobrescribe.
- Cada reporte queda en un estado terminal o con una razón accionable.

## PR-03: Protección contra reportes envejecidos

**Fase:** 0  
**Ownership:** API + operación  
**Dependencias:** PR-02

### Tareas

- Añadir alerta para reportes que superen el SLA de generación/storage.
- Añadir dashboard o consulta operativa mínima.
- Documentar escalamiento y severidad.
- Añadir prueba de alerta con reloj controlado.

### Aceptación

- Un reporte que supera el SLA genera una señal observable.
- La alerta contiene identificadores suficientes para ejecutar el runbook.
- No se alerta sobre estados normales recién creados.

## PR-04: Revocación de sesión y tokens

**Fase:** 1  
**Ownership:** API  
**Dependencias:** PR-03

### Tareas

- Definir estrategia de revocación compatible con JWT actual.
- Persistir `sessionVersion`, denylist temporal o equivalente según decisión documentada.
- Hacer que logout y cambio de password invaliden credenciales según el contrato.
- Añadir pruebas de logout, password reset y token expirado.
- Crear ADR si cambia el modelo de sesión.

### Aceptación

- Un token revocado no puede acceder a endpoints protegidos.
- Logout es idempotente.
- Cambio de password invalida las sesiones requeridas.
- No se almacenan tokens crudos en logs.

## PR-05: Contexto de tenant y autorización de recursos

**Fase:** 1  
**Ownership:** API + contracts si aplica  
**Dependencias:** PR-04

### Tareas

- Definir `TenantContext` y fuente única de scope.
- Separar rol, permiso y alcance institucional.
- Centralizar validación de ownership en servicios/repositorios.
- Aplicar primero a instituciones, vouchers, sesiones y reportes.
- Documentar reglas en un ADR.

### Aceptación

- Un usuario de una institución no puede leer ni modificar recursos de otra.
- Las rutas de ADMIN y B2B tienen límites explícitos.
- Los servicios no dependen sólo de `RolesGuard` para seguridad de datos.

## PR-06: Matriz de pruebas de autorización

**Fase:** 1  
**Ownership:** API + Web para consumidores  
**Dependencias:** PR-05

### Tareas

- Crear matriz rol/scope/permiso/recurso/acción.
- Añadir pruebas positivas y negativas cross-tenant.
- Cubrir endpoints críticos de pagos, reportes, vouchers y sesiones.
- Añadir casos de usuario sin institución para B2C/legacy.

### Aceptación

- Cada endpoint crítico tiene al menos una prueba de denegación.
- Los casos B2C válidos no se rompen por la introducción de tenant.
- La matriz se usa como referencia para PRs posteriores.

## PR-07: Idempotencia distribuida

**Fase:** 2  
**Ownership:** API  
**Dependencias:** PR-06

### Tareas

- Eliminar fallback de memoria para producción.
- Definir storage distribuido requerido para idempotency keys.
- Hacer explícito el comportamiento ante replay, timeout y conflicto de payload.
- Añadir TTL, índice y limpieza segura.
- Probar dos workers concurrentes con la misma clave.

### Aceptación

- Dos requests concurrentes producen un solo efecto.
- Un replay con el mismo payload devuelve el resultado consistente.
- Una clave reutilizada con payload diferente se rechaza.
- Sin Redis/configuración válida, producción no arranca silenciosamente en modo inseguro.

## PR-08: Webhooks y fulfillment idempotentes

**Fase:** 2  
**Ownership:** API  
**Dependencias:** PR-07

### Tareas

- Persistir evento y clave del proveedor antes del fulfillment.
- Validar firma, proveedor, estado y monto.
- Hacer idempotente la entrega de vouchers/unlocks.
- Cubrir duplicados, reordenamiento y reintentos.
- Documentar reconciliación manual.

### Aceptación

- El mismo webhook no duplica voucher, unlock ni acceso.
- Un webhook inválido no muta estado.
- Un evento retrasado no revierte una transición válida.

## PR-09: Pipeline durable de reportes

**Fase:** 3  
**Ownership:** API  
**Dependencias:** PR-02, PR-07

### Tareas

- Definir la máquina de estados completa y transiciones válidas.
- Separar generación, persistencia, disponibilidad y delivery.
- Persistir intentos, razones y timestamps.
- Hacer retries explícitos, limitados y observables.
- Cubrir crash entre generación y storage.

### Aceptación

- No existe transición inválida desde un worker concurrente.
- Un crash permite reanudar o reconciliar sin pérdida silenciosa.
- Los estados terminales son distinguibles de los estados reintentables.

## PR-10: Storage privado y delivery auditable

**Fase:** 3  
**Ownership:** API  
**Dependencias:** PR-09

### Tareas

- Confirmar contrato de storage privado, key determinista y hash.
- Validar autorización antes de emitir descarga o envío.
- Registrar destinatario, resultado y motivo de delivery.
- Añadir expiración y revocación de URLs si aplica.
- Cubrir colisiones inmutables y objetos huérfanos.

### Aceptación

- Nadie puede descargar un reporte fuera de su scope.
- Un objeto existente no se reemplaza silenciosamente.
- Cada delivery tiene auditoría suficiente para investigación.

## PR-11: Reconciliación de migraciones

**Fase:** 4  
**Ownership:** API/datos  
**Dependencias:** PR-10

### Tareas

- Comparar migraciones del repositorio con las aplicadas en QA.
- Identificar timestamps/nombres duplicados.
- Definir migración correctiva sin editar historial aplicado.
- Añadir validación CI para nombres únicos.
- Documentar rollback y límites de migraciones irreversibles.

### Aceptación

- El historial local y QA tiene una reconciliación documentada.
- No se reescriben migraciones aplicadas.
- CI rechaza nuevas colisiones de identidad.

## PR-12: Higiene de esquema y performance

**Fase:** 4  
**Ownership:** API/datos  
**Dependencias:** PR-11

### Tareas

- Eliminar índices duplicados mediante migración nueva y segura.
- Estandarizar timestamps nuevos en `timestamptz`.
- Definir `statement_timeout` por entorno.
- Actualizar estadísticas y medir consultas críticas.
- Actualizar catálogo de esquema QA con fecha de captura.

### Aceptación

- No quedan índices duplicados sin justificación.
- Las consultas críticas tienen plan y umbral documentados.
- Un timeout protege la base sin romper jobs legítimos.

## PR-13: Matriz de navegación y autorización Web

**Fase:** 5  
**Ownership:** Web  
**Dependencias:** PR-05, PR-06

### Tareas

- Centralizar matriz de ruta, rol, permiso y tenant.
- Alinear guards de router con autorización de API.
- Diferenciar dashboard ADMIN y dashboard B2B.
- Añadir tests de navegación y deep links.

### Aceptación

- Una ruta protegida no queda accesible por navegación directa.
- La UI no muestra acciones que la API va a rechazar por scope.
- Los estados de carga y sesión expirada son deterministas.

## PR-14: Flujos operativos B2B

**Fase:** 5  
**Ownership:** Web  
**Dependencias:** PR-13, PR-10

### Tareas

- Priorizar cohortes, batches, vouchers, progreso y reportes.
- Añadir estados vacíos, errores recuperables y feedback de operaciones.
- Evitar lógica de negocio duplicada en componentes.
- Añadir pruebas de los journeys institucionales principales.

### Aceptación

- Un admin institucional puede completar el journey principal sin consola ADMIN.
- Los datos mostrados respetan el tenant.
- Cada operación fallida ofrece una acción segura o un diagnóstico.

## PR-15: Posicionamiento B2B del Site

**Fase:** 5  
**Ownership:** Site  
**Dependencias:** PR-13

### Tareas

- Separar mensajes B2C, instituciones y terapeutas.
- Corregir claims, legal, contacto y destino del funnel.
- Añadir CTA de demo/compra institucional medible.
- Validar responsive, accesibilidad y SEO básico.

### Aceptación

- El visitante institucional entiende el producto, siguiente paso y beneficio.
- No hay claims sin evidencia o copy contradictorio con el producto.
- Los formularios tienen endpoint, feedback y tracking verificables.

## PR-16: Observabilidad de negocio y jobs

**Fase:** 6  
**Ownership:** API + operación  
**Dependencias:** PR-01, PR-09

### Tareas

- Definir métricas de auth, reportes, pagos, vouchers y jobs.
- Añadir correlation ID y campos estructurados.
- Definir dashboards mínimos y alertas P0/P1.
- Evitar PII y secretos en logs.

### Aceptación

- Cada incidente P0/P1 conocido tiene una señal observable.
- Se puede seguir un flujo por `requestId`, `jobId` o `paymentId`.
- Los dashboards tienen owner y umbral documentados.

## PR-17: Backups, restore y continuidad

**Fase:** 6  
**Ownership:** Operación/infraestructura  
**Dependencias:** PR-12, PR-16

### Tareas

- Definir RPO y RTO por dato crítico.
- Documentar backup, restore y verificación.
- Ejecutar restore en entorno seguro.
- Documentar rotación y acceso a secretos.
- Añadir checklist de deploy y rollback.

### Aceptación

- Un restore probado tiene evidencia y duración registrada.
- RPO/RTO están aprobados y no son valores implícitos.
- El runbook no requiere conocimiento oral.

## PR-18: Pruebas de resiliencia y cierre

**Fase:** 6  
**Ownership:** API + Web + operación  
**Dependencias:** PR-16, PR-17

### Tareas

- Probar Redis caído, storage lento, proveedor duplicando webhooks y DB con latencia.
- Ejecutar smoke tests de deploy y rollback.
- Revisar límites, timeouts y backpressure.
- Cerrar hallazgos o crear backlog con owner y fecha.
- Actualizar `project-status.md` y ADRs.

### Aceptación

- Los fallos externos degradan de forma explícita y recuperable.
- No se pierden pagos, reportes ni eventos críticos silenciosamente.
- La auditoría de cierre enlaza código, pruebas, métricas y runbooks.
