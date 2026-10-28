# Runbook de reportes

## Objetivo

Diagnosticar reportes pendientes, fallos de generación, problemas de storage y entregas incompletas sin sobrescribir información válida.

## Estados relevantes

```text
PENDING → GENERATING → STORAGE_PENDING → AVAILABLE
AVAILABLE → DELIVERY_PENDING → DELIVERED / DELIVERY_FAILED
PENDING o GENERATING → FAILED
FAILED → PENDING mediante retry autorizado
```

## Diagnóstico seguro

1. Consultar `reports` por `status`, `created_at` y `updated_at`.
2. Verificar si existe el job correspondiente en BullMQ.
3. Verificar si existe el objeto en R2/S3.
4. Comparar `object_key`, `content_hash` y versión.
5. Revisar logs por `reportId`, `sessionId` y `jobId`.
6. Registrar el diagnóstico antes de reencolar.

## Reglas

- No sobrescribir un objeto existente.
- No marcar `AVAILABLE` sin objeto y hash válidos.
- No enviar un PDF que no haya sido persistido correctamente.
- No regenerar un reporte legacy sin `input_snapshot` sin autorización explícita.
- Todo retry debe tener una clave determinista.

## Incidente histórico de QA

La captura del 2026-09-16 mostró tres reportes en `STORAGE_PENDING` con edades de 7 a 26 días. Eran datos históricos y no productivos, no una incidencia vigente de producción. No inferir su antigüedad actual: `storage_pending_since` queda `NULL` para filas preexistentes.

Para monitoreo agregado, sin exponer identificadores:

```sql
SELECT
  COUNT(*) AS pending_reports,
  COUNT(storage_pending_since) AS reports_with_known_age,
  COUNT(*) FILTER (WHERE storage_pending_since < now() - interval '1 hour') AS pending_over_one_hour
FROM reports
WHERE status = 'STORAGE_PENDING';
```
