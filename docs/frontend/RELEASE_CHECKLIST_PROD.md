# Release Checklist (Producción) — A.KI

## 1) Build y configuración
- [ ] `applicationId` confirmado: `com.akit.app`
- [ ] `versionCode` incrementado
- [ ] `versionName` actualizado
- [ ] `google-services.json` correcto (A.KI)
- [ ] `default_web_client_id` coincide con Firebase
- [ ] SHA‑1 / SHA‑256 correctos en Firebase
  - SHA‑1: `36:A2:FA:10:28:2A:22:2D:B1:7B:B6:C1:63:DF:37:73:33:6C:F7:87`
  - SHA‑256: `94:AD:AE:A2:EF:5C:B7:42:5A:13:31:4E:02:6E:9D:13:73:F8:EF:6B:DF:3B:9B:D8:77:FB:69:5B:13:98:CB:78`
- [ ] Keystore de release disponible y fuera del repo

## 2) Seguridad / privacidad
- [ ] Sin logs sensibles (SHA, tokens, credenciales)
- [ ] `keystore.properties` no versionado
- [ ] `.env` real no versionado
- [ ] `google-services.json` no versionado
- [ ] Analytics/Crashlytics sin PII (email, nombre, ids)

## 3) QA mínimo
- [ ] Smoke test completo (ver `SMOKE_TEST.md`)
- [ ] Flujo login Google OK
- [ ] Onboarding → Test → Resultados OK
- [ ] Diálogos legibles + botones consistentes

## 4) Build release
- [ ] `assembleRelease` sin errores
- [ ] ProGuard/R8 sin romper navegación o login
- [ ] APK/AAB generado

## 5) Distribución interna (Firebase App Distribution)
- [ ] APK/AAB subido
- [ ] Testers invitados
- [ ] Release notes cargadas

## 6) Post‑release
- [ ] Verificar Crashlytics/Analytics activos
- [ ] Monitorear crashes 24‑48h
- [ ] Feedback inicial de testers

