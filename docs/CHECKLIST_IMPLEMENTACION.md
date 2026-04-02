# A.kit — Checklist de Implementación por Fases

> Última actualización: 2026-03-30
> Notación: `[x]` = completado | `[/]` = en progreso | `[ ]` = pendiente

---

## FASE 0 — Estabilización Base ✅ COMPLETADA (2026-03-30)

### Backend
- [x] Verificar migraciones en base limpia (DB fresh) → `No migrations are pending` ✅
- [x] Correr suite de tests: `pnpm --filter api test` → **10/10 pasando** ✅
  - ⚠️ Se corrigieron 3 tests desactualizados en `sessions.service.spec.ts`:
    - Las relaciones `institution`, `therapist`, `voucher` no estaban incluidas en las assertions
    - El filtro `voucherId: IsNull()` para rol ADMIN no estaba contemplado
    - Faltaba `mockReset()` en `beforeEach` causando contaminación entre tests
- [x] Build del API limpio: `pnpm --filter api build` → sin errores ✅
- [x] Sincronizar `.env.example` → agregada `MAIL_TRANSPORT_TYPE` que faltaba ✅

### Android
- [x] Validar compilación: `./gradlew :app:compileDebugKotlin` → **BUILD SUCCESSFUL** en 28s ✅

### Web
- [x] Build limpio: `pnpm --filter web build` → **2462 módulos transformados**, sin errores ✅
- [x] React Router configurado con `ProtectedRoute` funcional ✅
- [x] Pantallas existentes mapeadas:
  - `DashboardOverview` — en construcción
  - `DashboardResults` — en construcción
  - `DashboardVouchers` — en construcción
  - `DashboardUsers` — en construcción
  - `DashboardSettings` — en construcción
  - `LoginPage` — funcional
  - `SetupPasswordPage` — funcional
- [x] Infraestructura Docker: Postgres `healthy` en puerto 5432 ✅

---

## FASE 1 — Backend: Gaps del MVP ✅ COMPLETADA

- [x] `GET /sessions/:id/result` → Devolver resultado calculado de una sesión
- [x] `GET /vouchers?institutionId=` → Verificar si ya existe; si no, implementar filtro
- [x] `GET /institutions/:id/stats` → KPIs para el dashboard (sesiones, vouchers usados)
- [x] Confirmar que `session_results` se expone en el detalle de sesión
- [x] Auditar guards de ownership en todos los endpoints sensibles
- [x] Tests de integración para los endpoints nuevos/modificados

---

## FASE 2 — Web Dashboard: Pantallas MVP ✅ COMPLETADA

### Layout base
- [x] Sidebar de navegación con íconos y roles (ADMIN vs INSTITUTION)
- [x] Header con nombre de usuario logueado y botón logout

### Institución / Terapeuta
- [x] Dashboard home → KPIs reales (vouchers disponibles, sesiones completadas, informes enviados)
- [x] Listado de sesiones → tabla con paciente, fecha, estado, voucher usado (filtro `institution_id`)
- [x] Detalle de sesión → resultado vocacional + radar de categorías + botón envío de informe
- [x] Vouchers → tabla con código, estado (AVAILABLE / USED / EXPIRED), fecha de uso

### Admin de Plataforma
- [x] Gestión de instituciones → CRUD (listar, crear, editar, desactivar)
- [x] Crear lotes de vouchers → formulario: cantidad + institución destino + fecha expiración

### Transversal
- [x] Protección de rutas por ROLE (`ADMIN` vs `INSTITUTION`) con redirect correcto
- [x] Integrar modelo `ownerInstitutionId` como scope global de consultas en la UI

---

## FASE 3 — Android: Validación Funcional

- [ ] Flujo completo contra backend real: registro → test → resultado → voucher → informe
- [ ] Sincronización offline-first verificada (Room → WorkManager → Backend)
- [ ] UI de resultado muestra datos reales del backend (categorías, radar, porcentajes)
- [ ] Ingreso y validación de voucher funcional (código + resolución en backend)
- [ ] APK release firmado y verificado con keystore de producción

---

## FASE 4 — Integración y Pre-Lanzamiento

- [ ] Correr `docs/backend/MVP_PRELAUNCH_CHECKLIST.md` completo
- [ ] Verificar todas las variables de entorno en entorno de producción (Neon Cloud)
- [ ] Flujo completo en staging: Paciente (Android) → Institución (Web) → Admin (Web)
- [ ] Envío de email con PDF real adjunto confirmado
- [ ] Decisión Go/No-Go documentada con evidencia
