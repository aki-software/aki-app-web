# Estado actual del proyecto

Última actualización: **2026-10-28**.

## Estado general

La auditoría integral está completada y el refactor de infraestructura y CI/CD está en curso activo:
- **Fase 1 (Habilitadores CI/CD):** Completada (PR-01 al PR-05). CI unificado, TypeScript estricto, endpoints `/health/ready`, Dockerfile optimizado, migración de Vercel a Cloudflare Pages.
- **Fase 2 (CD hacia QA):** En curso. PR-06 al PR-09 completados. El pipeline publica la imagen en GHCR, ejecuta las migraciones TypeORM en GitHub Actions antes del despliegue de la API en Render (`akit-api-qa`) y despliega Web y Site en Cloudflare Pages. Falta comprobar su ejecución completa en QA.
- **Siguiente entrega:** Verificar el pipeline de punta a punta (incluidos los smoke tests) y resolver el timestamp duplicado en la tabla `migrations` de QA.
- **Entorno local:** SeaweedFS provee buckets privados para reportes y backups locales; crear el bucket de backups no activa un job de backup.
- **Diagnóstico de email:** los fallos SMTP registran `code` y `responseCode` seguros, sin exponer el mensaje crudo del proveedor.
- **Creación de vouchers:** corregida la persistencia de `quantity` en lotes creados manualmente y cubierta con pruebas de cantidad explícita, valor predeterminado y validación previa.
- **Compartir vouchers:** WhatsApp y copiado usan un mensaje contextual con institución, código, vencimiento y una alternativa para destinatarios sin Gmail.

## Hallazgos prioritarios

| Prioridad | Área | Estado | Siguiente acción |
|---|---|---|---|
| P0 | Reportes | Histórico / no productivo | La captura de QA de 2026-09-16 correspondía a datos históricos no productivos; no tratarla como incidente vigente de producción. Ver [runbook de reportes](operations/reports.md). |
| P0 | Auth | Confirmado por código | Diseñar revocación de tokens y validar TLS efectivo |
| P0 | Idempotencia | Confirmado por código | Prohibir fallback de memoria en producción |
| P0 | Multi-tenant | Riesgo alto | Definir `TenantContext` y pruebas cross-tenant |
| P1 | Migraciones | Confirmado | Reconciliar dos migraciones con timestamp repetido |
| P1 | Base de datos | Confirmado | Revisar índices duplicados y timestamps sin zona horaria |
| P1 | Web | Confirmado | Matriz única de rol, scope, permiso, ruta y acción |
| P1 | Site | Confirmado | Corregir marca, legal, claims y funnel B2B |
| P1 | Operación | Implementado en dev | Automatización, reconciliador y métricas locales de reportes integrados; verificar despliegue y scraping en QA. |
| P1 | Infraestructura | Pendiente | Cambiar origen de despliegue en Render y Cloudflare Pages de 'dev' a 'qa'. |

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

### Hallazgo histórico de QA

La captura del 2026-09-16 sobre tres reportes en `STORAGE_PENDING` era histórica y no productiva; no constituye evidencia de una incidencia vigente en producción. Las filas preexistentes no tienen edad conocida, porque `storage_pending_since` no se retrocarga. Ver [runbook de reportes](operations/reports.md).

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

## Observabilidad MVP local (2026-10-29)

El MVP de observabilidad local incluye métricas de API, un stack privado y desechable de Prometheus/Grafana y alertas consultables sin notificaciones externas. El scraping se limita a la red interna de Docker y las interfaces de usuario se publican solo en loopback. QA/producción y exportación externa siguen fuera de alcance. Ver [guía y runbook local](operations/local-metrics.md#stack-local-unificado).

## Cómo actualizar este documento

Cada PR debe cambiar el estado de sus tareas y enlazar la evidencia de validación. Si un hallazgo deja de ser válido, no se elimina: se marca como resuelto, obsoleto o refutado con explicación.



## Stack local unificado

Un solo Compose integra API, dependencias y observabilidad sobre datos locales. Validacion estatica completa; arranque manual pendiente. Sin exportacion cloud.
