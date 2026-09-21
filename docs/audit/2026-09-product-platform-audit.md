# Auditoría integral del producto

Fecha de captura: **2026-09-16**.

## Alcance

Se revisaron `apps/site`, `apps/web`, `apps/api`, `packages/contracts`, `packages/design-tokens`, documentación, configuración de deploy y base QA mediante consultas read-only.

## Método

- Exploración estructural con CodeGraph.
- Revisión estática de código y configuración.
- Revisión de documentación existente.
- Consultas PostgreSQL read-only.
- Revisión de planes `EXPLAIN (ANALYZE, BUFFERS)` sobre consultas representativas.
- Contraste con WCAG 2.2, Core Web Vitals y prácticas de seguridad/operación.

## Hechos

- El site comunica mejor B2C que B2B.
- Web tiene separación inicial por roles, pero permisos y scopes están duplicados.
- API tiene módulos, transacciones y flujos de pago maduros, con gaps de revocación, idempotencia y recuperación.
- QA tiene tres reportes `STORAGE_PENDING` antiguos.
- QA tiene índices únicos duplicados y migraciones con timestamp repetido.
- No existe evidencia suficiente de backup/restore probado, RPO o RTO.

## Hipótesis a validar

- El comprador B2B pagará por cohortes e impacto, no por vouchers aislados.
- El segmento inicial más prometedor son instituciones educativas organizadas.
- Terapeutas independientes requieren un paquete y experiencia diferentes.
- La retención depende de ciclos académicos y nuevas cohortes.

## Limitaciones

La base QA no representa volumen productivo. No se puede inferir capacidad, latencia de producción ni comportamiento con múltiples réplicas sólo a partir de esta captura.

## Resultado

El refactor debe comenzar por confiabilidad operativa y seguridad. No se recomienda una reescritura ni una migración inmediata a microservicios.

Ver el [plan de refactor](../refactor/README.md) para la secuencia ejecutable.
