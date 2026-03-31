# Hardening Checklist (Seguridad, Robustez, Escalabilidad)

Checklist para mejorar la app **sin cambiar funcionalidades**.

## Seguridad
- [ ] Network Security Config: bloquear HTTP en release.
- [ ] `android:allowBackup="false"` en release.
- [ ] Revisar logs: sin PII ni secretos.
- [ ] Revisar Analytics/Crashlytics: sin PII.
- [ ] Cifrado local (SQLCipher) si hay datos sensibles.
- [ ] Validar permisos mínimos (solo los necesarios).

## Robustez
- [ ] Manejo uniforme de errores (UI + ViewModel).
- [ ] Reintentos con backoff en operaciones críticas.
- [ ] Timeouts claros en operaciones de red.
- [ ] Cancelación correcta de coroutines.
- [ ] StrictMode habilitado en debug.

## Escalabilidad
- [ ] Config por ambientes (debug/release).
- [ ] Feature flags para activar/desactivar secciones.
- [ ] Modularización gradual (data/domain/ui).
- [ ] Métricas básicas de performance.

## Calidad / CI
- [ ] Pipeline CI: build + lint + tests.
- [ ] Tests críticos automatizados (login, onboarding, navegación).
- [ ] Baseline profiles.

