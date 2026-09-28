# Estado actual del proyecto

Última actualización: **2026-09-21**.

## Estado general

La auditoría integral está completada y el refactor de infraestructura y CI/CD está en curso activo:
- **Fase 1 (Habilitadores CI/CD):** Completada (PR-01 al PR-05). CI unificado, TypeScript estricto, endpoints `/health/ready`, Dockerfile optimizado, migración de Vercel a Cloudflare Pages.
- **Fase 2 (CD hacia QA):** En curso (PR-06 y PR-07 completados). La imagen se compila y publica en GHCR, y el despliegue automático en Render (`akit-api-qa`) vía Render REST API está 100% operativo y en verde.
- **Siguiente entrega:** PR-08 (ejecución automática de migraciones TypeORM en el pipeline de QA).

## Hallazgos prioritarios

| Prioridad | Área | Estado | Siguiente acción |
|---|---|---|---|
| P0 | Reportes | Confirmado | Recuperar y reconciliar tres `STORAGE_PENDING` antiguos |
| P0 | Auth | Confirmado por código | Diseñar revocación de tokens y validar TLS efectivo |
| P0 | Idempotencia | Confirmado por código | Prohibir fallback de memoria en producción |
| P0 | Multi-tenant | Riesgo alto | Definir `TenantContext` y pruebas cross-tenant |
| P1 | Migraciones | Confirmado | Reconciliar dos migraciones con timestamp repetido |
| P1 | Base de datos | Confirmado | Revisar índices duplicados y timestamps sin zona horaria |
| P1 | Web | Confirmado | Matriz única de rol, scope, permiso, ruta y acción |
| P1 | Site | Confirmado | Corregir marca, legal, claims y funnel B2B |
| P1 | Operación | En Progreso | Configurado DB Backup automatizado a R2. Faltan métricas/alertas. |

## Evidencia QA capturada

La conexión fue read-only a Neon PostgreSQL 17.11, base `neondb`, con aislamiento `READ COMMITTED`.

- 3 instituciones.
- 23 usuarios: 1 `ADMIN`, 3 `INSTITUTION_ADMIN`, 19 `PATIENT`.
- 47 sesiones.
- 5.751 swipes.
- 564 resultados.
- 50 vouchers.
- 7 pagos.
- 9 reportes.
- 5 auditorías de acceso.
- 48 migraciones aplicadas.

### Riesgo operativo confirmado

Hay tres reportes en `STORAGE_PENDING`, con edades aproximadas de 7 a 26 días, sin `object_key` ni `content_hash`. Ver [runbook de reportes](operations/reports.md).

### Limitaciones

- El volumen QA es demasiado pequeño para calcular capacidad máxima.
- Los sequential scans observados no prueban un cuello de botella.
- Las estadísticas de PostgreSQL estaban desactualizadas.
- Las sesiones sin institución pueden ser válidas para B2C o legacy.
- La configuración TLS efectiva debe verificarse antes de producción.

## Orden de trabajo

1. Contención y recuperación de reportes.
2. Seguridad, autorización y tenant.
3. Idempotencia y concurrencia.
4. Pipeline durable de reportes.
5. Migraciones y base de datos.
6. Web y Site.
7. Observabilidad y resiliencia.

## Cómo actualizar este documento

Cada PR debe cambiar el estado de sus tareas y enlazar la evidencia de validación. Si un hallazgo deja de ser válido, no se elimina: se marca como resuelto, obsoleto o refutado con explicación.
