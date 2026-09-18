# Documentación de A.kit Platform

Este es el punto de entrada para continuar el trabajo sin reconstruir el contexto desde cero.

## Ruta rápida

1. Leer [Contexto de producto](product-context.md).
2. Revisar [Estado actual](project-status.md).
3. Consultar el [Plan de refactor](refactor/README.md).
4. Leer el documento específico del área antes de modificar código.
5. Revisar los ADR relacionados y actualizar el estado al terminar.

## Mapa por necesidad

| Necesidad | Documento |
|---|---|
| Entender el producto completo | [product-context.md](product-context.md) |
| Conocer riesgos y evidencia | [audit/2026-09-product-platform-audit.md](audit/2026-09-product-platform-audit.md) |
| Saber qué está activo | [project-status.md](project-status.md) |
| Continuar el refactor | [refactor/README.md](refactor/README.md) |
| Ver el desglose PR por PR | [refactor/pr-plan.md](refactor/pr-plan.md) |
| Levantar el entorno | [getting-started.md](getting-started.md) |
| Entender la arquitectura técnica | [architecture.md](architecture.md) |
| Trabajar en la API | [api.md](api.md) |
| Cambiar contratos | [contracts.md](contracts.md) |
| Configurar variables | [deployment-environment.md](deployment-environment.md) |
| Resolver incidentes | [operations/incidents.md](operations/incidents.md) |
| Registrar decisiones | [decisions/README.md](decisions/README.md) |

## Fuentes de verdad

- Código y configuración: contrato ejecutable.
- `docs/`: contexto, decisiones, procedimientos y evidencia.
- `packages/contracts`: contratos compartidos entre API, Web y Android.
- Base QA: evidencia operativa fechada, nunca fuente permanente de diseño.

## Reglas de documentación

- Separar hechos, hipótesis y recomendaciones.
- Fechar toda evidencia proveniente de QA o producción.
- No versionar secretos, tokens, dumps ni datos personales.
- Todo cambio de arquitectura, contrato, migración o variable debe actualizar su documento relacionado.
- Toda tarea terminada debe actualizar [project-status.md](project-status.md) o el documento de fase correspondiente.

## Estado de esta documentación

La estructura inicial fue creada durante la auditoría integral del 16 de septiembre de 2026. Los documentos de fase se completarán junto con cada PR del refactor.
