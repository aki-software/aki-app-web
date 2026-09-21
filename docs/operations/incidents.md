# Respuesta a incidentes

## Clasificación

| Severidad | Criterio | Respuesta |
|---|---|---|
| P0 | Exposición de datos, pagos duplicados o pérdida de reportes | Detener cambios y escalar inmediatamente |
| P1 | Flujo crítico degradado, jobs pendientes o aislamiento dudoso | Contener, diagnosticar y corregir con prioridad |
| P2 | Error acotado sin pérdida de integridad | Registrar y planificar |
| P3 | Mejora documental o de UX | Incluir en backlog |

## Procedimiento

1. Confirmar alcance y entorno.
2. Evitar operaciones destructivas.
3. Capturar evidencia sin secretos ni datos personales.
4. Identificar si el problema es de código, configuración, dependencia o datos.
5. Aplicar contención reversible.
6. Verificar recuperación.
7. Registrar causa raíz, impacto y prevención.

## Incidentes críticos conocidos

- Reportes atascados en `STORAGE_PENDING`.
- Fallback de idempotencia a memoria.
- Tokens que no se invalidan correctamente.
- TLS PostgreSQL efectivo pendiente de verificación.
- Migraciones con timestamp repetido.
