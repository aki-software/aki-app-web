# Auditoría de plataforma y próximos pasos

Fecha: 2026-05-06

## 1) Decisión de marca

- **A.kit** = marca de la plataforma.
- **Orient A.Ki** = nombre del producto / app móvil.

Esto resuelve la confusión entre los textos visibles de web, Android y mails.

## 2) Estado actual: lo que ya quedó implementado

### Backend / API

- Flujo de recuperación de contraseña completo:
  - token separado para reset
  - endpoints de request / resolve / reset
  - mail específico de reset
- Layout compartido para emails:
  - base común
  - header/footer reutilizables
  - templates unificados para activación, voucher y reset
- Seguridad P0 en flujos sensibles:
  - `POST /sessions/:id/send-report` protegido con JWT + ownership
  - `POST /sessions/complete` protegido con JWT + DTO estricto
  - rate limiting en auth, reset y sesiones
  - sanitización de errores 5xx
- Fix importante de integración:
  - se corrigió el error de UUID/Firebase UID en `send-report`
  - el envío de reporte por mail ya funciona nuevamente

### Emails

- El saludo ya no fuerza email como nombre.
- El fallback de URL en activación/reset quedó más prolijo.
- El reporte vocacional sigue usando un template específico con PDF/resumen.

### Android

- Se tomó como referencia visual principal.
- La app ya define una paleta clara:
  - primary teal
  - secondary terracota
  - tertiary verde sage
  - fondo beige cálido

## 3) Hallazgos de consistencia visual

### Android

- Tiene la mejor definición de tokens de marca.
- La paleta está bien estructurada y semanticamente separada.
- Los botones usan tokens de marca y estados semánticos.

### Web

- Usa una paleta propia, parecida pero no igual a Android.
- Tiene acentos violetas que no están en Android.
- Usa tokens CSS bien organizados, pero la base visual no está alineada 1:1 con Android.

### Emails

- Los templates tienen identidad visual consistente entre sí.
- Pero la paleta actual todavía no replica Android ni web.
- En particular, activación/reset usan una estética más “naranja/cálida” que la app móvil.

## 4) Qué conviene hacer ahora

### P1 — Alinear marca visual

1. Tomar Android como fuente de verdad para tokens visuales.
2. Mapear esos tokens a web.
3. Llevar la misma base a emails.
4. Eliminar colores “inventados” que no estén en la paleta común.

### P2 — Refactor arquitectónico

1. Sacar lógica pesada del `SessionsController`.
2. Encapsular mejor la resolución de ownership y scopes.
3. Reducir acoplamiento entre controller, service y repositorio.

### P3 — Calidad y validación

1. Tests de integración para:
   - `complete`
   - `send-report`
   - activation / reset
   - voucher / mail
2. Smoke test manual de web + Android.
3. Observabilidad:
   - correlation id
   - logs de request/job más trazables

## 5) Riesgos abiertos

- La web todavía no consume la paleta Android como verdad única.
- Los emails todavía no están 100% alineados a Android.
- El naming de marca puede volver a mezclarse si no se documenta bien.
- No se ejecutaron builds automáticos después de los cambios, por regla del repo.

## 6) Próximo paso recomendado

**Prioridad inmediata:** crear una capa de tokens compartidos o, como mínimo, un mapa explícito Android → Web → Email para que la marca quede coherente en toda la plataforma.

