# Plan Maestro A.kit — Arquitectura, Trabajo, Gestión y MVP Funcional

> **Fecha de creación:** 2026-03-30
> **Última actualización:** 2026-03-30
> **Estado real del código:** Backend sólido · Android compilado · Web incompleta

---

## 1. Análisis de Arquitectura

### 1.1 Decisión: La arquitectura ya está elegida y es correcta

La documentación existente y el código real están alineados en una **Clean Architecture + DDD en monorepo**.
No hay que cambiar la base; hay que **ejecutarla de forma consistente** en las capas que aún están incompletas (principalmente Web y Mobile-backend).

### 1.2 Stack definitivo (sin cambios)

| Capa | Tecnología | Estado |
|---|---|---|
| **API Backend** | NestJS + TypeScript Strict + TypeORM + PostgreSQL | ✅ Operativo |
| **Web Dashboard** | React + Vite + TypeScript | ⚠️ Incompleto (solo `auth` + `dashboard` parcial) |
| **Mobile** | Android · Kotlin · Jetpack Compose · MVVM | ⚠️ Compilado, validación funcional pendiente |
| **Infraestructura** | Docker · pnpm workspaces · Turborepo | ✅ Base lista |
| **Email** | Nodemailer / AWS SES | ✅ Módulo integrado |
| **Storage** | AWS S3 | 🔴 Pendiente de conectar en producción |

### 1.3 Estructura de capas (Backend — regla inmutable)

```
src/
  ├── [domain]/
  │     ├── entities/          ← Entidades puras, sin ORM
  │     ├── repositories/      ← Interfaces (contratos)
  │     └── value-objects/
  ├── [domain]/application/    ← Casos de uso / Services
  ├── [domain]/infrastructure/ ← TypeORM repos, clientes externos
  └── [domain]/presentation/   ← Controllers, DTOs, Guards
```

> **Dominios ya implementados:** `auth` · `users` · `sessions` · `categories` · `vouchers` · `institutions` · `mail`

### 1.4 Gaps arquitectónicos detectados

| Gap | Impacto | Prioridad |
|---|---|---|
| Web no refleja modelo `owner` institucional | Datos incompletos en dashboard | 🔴 Alta |
| Web carece de pantallas completas para flujos MVP | MVP incompleto | 🔴 Alta |
| No hay módulo `payments` en el backend | Flujo de pago individual bloqueado | 🟡 Media |
| Android necesita validación funcional end-to-end | Riesgo de release | 🔴 Alta |
| S3 no conectado en producción | PDF no se archiva en cloud | 🟡 Media |

---

## 2. MVP Funcional — Definición

### 2.1 Criterio de entrada al MVP

Un MVP está completo cuando los tres actores clave pueden completar su flujo principal **de forma autónoma** sin intervención del administrador de sistema.

### 2.2 Flujos del MVP por actor

#### 🧑‍🎓 Paciente (Android)
1. Registrarse / onboarding anónimo
2. Ver y desplazar tarjetas ocupacionales (swipe like/dislike)
3. Ver resultado inmediato (radar de categorías)
4. Ingresar voucher y desbloquear informe completo
5. Recibir informe por email (híbrido HTML + PDF)

#### 🏥 Institución / Terapeuta (Web)
1. Login con credenciales
2. Ver dashboard con KPIs propios (vouchers disponibles, sesiones activas)
3. Ver listado de sus sesiones / pacientes (filtrado por `institution_id`)
4. Ver detalle de sesión con resultado vocacional
5. Gestionar sus vouchers (listar, ver estado usado/disponible)

#### 🛡️ Admin de Plataforma (Web)
1. Login admin
2. Gestionar instituciones (CRUD)
3. Crear y asignar lotes de vouchers a instituciones
4. Ver sesiones globales con filtros

### 2.3 Qué definitivamente NO entra en este MVP

- Pago individual con pasarela de cobro (Mercado Pago / Stripe)
- Historial web del paciente
- Múltiples terapeutas por institución
- Subasignación interna de vouchers entre terapeutas
- Bandeja clínica / notas de sesión
- Analytics avanzados (gráficas de tendencias)

---

## 3. Plan de Trabajo por Fases

### Fase 0 — Estabilización base ✅ COMPLETADA (2026-03-30)
> **Objetivo:** Partir de una base limpia y verificada

Ver detalle en `CHECKLIST_IMPLEMENTACION.md`.

### Fase 1 — Backend: gaps del MVP (2–3 días)
> **Objetivo:** Cerrar endpoints que la web necesita para los flujos del MVP

- Verificar y exponer resultado de sesión (`session_results`) en el detalle
- Endpoint de KPIs por institución para el dashboard
- Filtro de vouchers por `institutionId`
- Guard de ownership en endpoints sensibles
- Tests de integración para los flujos nuevos

### Fase 2 — Web Dashboard: pantallas MVP (4–5 días)
> **Objetivo:** La web es usable por institución y admin

- Layout base: sidebar + header con usuario/logout
- Dashboard home con KPIs reales
- Listado de sesiones con filtro institucional
- Detalle de sesión con resultado vocacional y radar
- Gestión de vouchers (listado + estados)
- Pantallas admin: CRUD instituciones + crear vouchers

### Fase 3 — Android: validación funcional (2–3 días)
> **Objetivo:** Flujo paciente funciona de punta a punta en release

- Flujo completo end-to-end contra backend real
- Validación offline-first (Room → WorkManager)
- Flujo de voucher en app funcional
- APK release firmado y verificado

### Fase 4 — Integración y Pre-Lanzamiento (1–2 días)
> **Objetivo:** Todo funciona integrado, listo para producción

- Checklist `MVP_PRELAUNCH_CHECKLIST.md` completo
- Variables de entorno de producción verificadas
- Flujo de staging: Paciente → Institución → Admin
- Email con PDF real confirmado
- Decisión Go/No-Go documentada

---

## 4. Gestión del Proyecto

### 4.1 Tablero de trabajo (Kanban simple)

| Columna | Criterio |
|---|---|
| **Backlog** | Definido, no iniciado |
| **En curso** | Máximo 3 ítems simultáneos |
| **En revisión** | Código listo, pendiente de validación manual |
| **Hecho** | Validado en staging o por test |

### 4.2 Definición de "Done"

Un ítem está **Done** cuando:
1. El código compila sin errores (`pnpm --filter api build`)
2. Los tests relevantes pasan (`pnpm --filter api test`)
3. El flujo fue validado manualmente o por script
4. El handoff del día lo documenta en `docs/backend/HANDOFF_YYYY-MM-DD.md`

### 4.3 Cadencia de trabajo recomendada

```
Inicio de sesión:
  → Revisar handoff anterior
  → Elegir 1–3 ítems de la Fase actual en el CHECKLIST

Fin de sesión:
  → pnpm --filter api test  (todos deben pasar)
  → pnpm --filter api build (sin errores de compilación)
  → Crear docs/backend/HANDOFF_YYYY-MM-DD.md
  → Actualizar CHECKLIST_IMPLEMENTACION.md (marcar completados)
```

### 4.4 Estrategia de riesgo

| Riesgo | Mitigación |
|---|---|
| Web tarda más de lo esperado | Priorizar pantallas de institución sobre admin |
| Android falla en release | Mantener debug APK como alternativa hasta cierre |
| S3 no disponible en producción | Enviar PDF adjunto al email como fallback temporal |
| DB migration falla en producción | Ejecutar siempre en base limpia local antes de merge |

---

## 5. Notas de arquitectura relevantes

### Regla de ownership (inmutable en MVP)
- El `ownerInstitutionId` es la fuente de verdad para filtrar datos por actor.
- Un terapeuta independiente se modela como **institución privada** — nunca como entidad separada.
- El Admin tiene visión global sin filtro de institución.

### Regla de seguridad (inmutable)
- Zero hardcoded secrets: todo desde `.env`
- Guards de rol en cada endpoint sensible (`ADMIN`, `INSTITUTION`, `PATIENT`)
- Los endpoints de `sessions` y `vouchers` siempre filtran por scope antes de responder

### Documentos de referencia
- `docs/core.md` — Resumen ejecutivo del negocio
- `docs/backend/MVP_OWNERSHIP_Y_PERMISOS.md` — Matriz de permisos y reglas de ownership
- `docs/arquitectura_y_tecnica/DIAGRAMAS_C4.md` — Diagramas C4 (contexto, contenedores, componentes)
- `docs/arquitectura_y_tecnica/DIAGRAMAS_ESTADO.md` — Máquinas de estado de sesión, voucher y sync
- `docs/CHECKLIST_IMPLEMENTACION.md` — Estado actual de avance por fase
