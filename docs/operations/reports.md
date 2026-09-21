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

## Incidente actual de QA

La captura del 2026-09-16 mostró tres reportes en `STORAGE_PENDING` con edades de 7 a 26 días. Deben resolverse como primera tarea del refactor y no mediante cambios destructivos en la base.
