# Contexto de producto

A.kit Platform es un ecosistema de orientación vocacional. El producto debe entenderse como una sola experiencia con tres superficies y un backend central.

## Superficies

| Superficie | Función principal | Usuario |
|---|---|---|
| Site | Presentar la marca, explicar el producto y convertir visitas | Estudiantes, terapeutas e instituciones |
| Web | Operar compras, vouchers, sesiones y reportes | Admin, instituciones y terapeutas |
| API | Autenticar, autorizar, persistir y coordinar operaciones | Clientes y workers |

La aplicación Android es un cliente externo conectado a la API y no vive en este repositorio.

## Producto B2C

- Test vocacional individual.
- Experiencia de evaluación y resultados.
- Reporte individual desbloqueable.
- Compra individual mediante Google Play.

## Producto B2B

La institución no compra solamente códigos. Compra un programa de orientación medible.

El valor esperado incluye:

- adquisición de vouchers;
- asignación a estudiantes o consultantes;
- seguimiento de inicio y finalización;
- acceso controlado a reportes;
- métricas agregadas;
- trazabilidad operativa;
- soporte y renovación.

## Actores y límites

| Actor | Necesidad principal | No debe ver |
|---|---|---|
| `ADMIN` | Operar toda la plataforma | Datos fuera de sus capacidades explícitas |
| `INSTITUTION_ADMIN` | Gestionar su institución, compras, vouchers y resultados autorizados | Otras instituciones, pricing interno y operaciones globales |
| `THERAPIST` | Trabajar con sesiones y reportes autorizados | Operaciones globales y datos fuera de su alcance |
| `PATIENT` | Completar el test y acceder a su resultado | Datos de otros pacientes |

El rol identifica quién es el actor. El scope identifica sobre qué institución o recurso puede operar. El permiso identifica qué acción puede ejecutar. No deben tratarse como la misma cosa.

## North Star Metric

**Cohortes institucionales completadas con reporte de impacto entregado.**

Esta métrica conecta adquisición, activación, uso, resultado y renovación.

## Journeys críticos

### Institución

```text
Site → demo o compra → institución creada → cuenta activada → batch creado
→ voucher redimido → cohorte iniciada → cohorte completada → reporte visto
```

### Reporte

```text
Sesión completada → reporte pendiente → generación → storage privado
→ reporte disponible → grant o descarga → delivery opcional
```

### Administración

```text
Login → salud operativa → alerta accionable → recurso o flujo específico
```

## Decisiones de producto vigentes

- El dashboard ADMIN es una consola de operación de plataforma, no un duplicado del dashboard institucional.
- El dashboard B2B debe estar orientado a tareas, cohortes, vouchers, compras y reportes.
- REST continúa siendo adecuado para la API actual.
- El monorepo y el modular monolith se mantienen por ahora.
- No se debe iniciar una migración a microservicios antes de resolver seguridad, resiliencia y límites de dominio.
