# Plan de refactor

Este documento es el tablero técnico del refactor. Cada fase debe ejecutarse en PRs pequeños y verificables.

El desglose ejecutable está en [pr-plan.md](pr-plan.md).

## Principios

- Primero reducir riesgo; después mejorar estructura.
- Mantener el modular monolith mientras los límites no estén probados.
- El backend es la autoridad de autorización.
- Los contratos compartidos cambian antes que sus consumidores.
- Todo retry, job y webhook debe ser idempotente.
- No modificar migraciones históricas.
- No duplicar información del dashboard ADMIN en el producto B2B.

## Fases

| Fase | Objetivo | Estado |
|---|---|---|
| 0 | Contener y recuperar reportes | Pendiente |
| 1 | Seguridad, autorización y tenant | Pendiente |
| 2 | Idempotencia y concurrencia | Pendiente |
| 3 | Pipeline durable de reportes | Pendiente |
| 4 | Migraciones y base de datos | Pendiente |
| 5 | Web y Site | Pendiente |
| 6 | Observabilidad y resiliencia | Pendiente |

## Dependencias

```text
Fase 0 → Fase 1 → Fase 2 → Fase 3
                         ↓
                    Fase 4 → Fase 6
Fase 1 → Fase 5
```

La observabilidad mínima debe empezar en la Fase 0, aunque el dashboard operativo completo pertenezca a la Fase 6.

## Criterio para iniciar una fase

- La fase anterior tiene criterios de salida verificables.
- Existe una matriz de archivos afectados.
- Se conocen los contratos y migraciones involucrados.
- Hay pruebas para el comportamiento actual y el esperado.
- Se documentó el rollback o la estrategia de recuperación.

## Criterio para cerrar una fase

- Código, pruebas y documentación están en el mismo PR o conjunto de PRs relacionados.
- No quedan estados ambiguos ni tareas implícitas.
- La validación ejecutada está registrada.
- `project-status.md` está actualizado.

## Próximo trabajo

Desglosar la Fase 0 en PRs: inventario de reportes pendientes, reconciliación segura, alerta de antigüedad y runbook operativo.
