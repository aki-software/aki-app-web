# Proposal: Admin Panel Redesign — Centro de Mando

## Intent

Rediseñar el panel administrativo como un **Centro de Mando** con navegación clara por roles, health bar de alertas en la home del admin, y organización semantics de secciones (Instituciones vs Profesionales), eliminando páginas escondidas y mejorando la experiencia de navegación.

## Scope

### In Scope

- **Sidebar con navegación por roles**: Admin ve Panel General, Instituciones, Profesionales, Vouchers, Configuración. Terapeuta ve Resultados, Mi Panel.
- **DashboardOverview → Centro de Mando (admin)**: Health bar con indicadores de alerta (completación baja, instituciones con alertas, triage count), gráfico de actividad, accesos directos.
- **DashboardResults (terapeuta)**: Mover behavioral trends (SelectivityDonut, FatigueGauge, RushGauge) desde InstitutionDetailOverview a Results del terapeuta.
- **DashboardUsers**: Dividir lógica de visualización en dos secciones semánticas — Instituciones (reales + particulares) y Profesionales (terapeutas internos).
- **Breadcrumbs**: Completar en todas las páginas del dashboard.
- **HealthBar**: Nuevo componente independiente con indicadores tipo semáforo y links directos a instituciones con anomalías.

### Out of Scope

- Vouchers section changes
- Settings section changes
- Session Detail page changes
- Patient model or CRUD
- Backend API changes (new endpoints or scopes)
- Authentication or authorization logic

## Modelo de Usuarios

| Tipo | Cómo se crea | ¿Tiene institución padre? | En backend es... | Aparece en... |
|---|---|---|---|---|
| **Institución Real** | Admin | — | Institution | Instituciones |
| **Particular** | Admin via invitación | No (actúa como institución) | Institution (unipersonal) | Instituciones |
| **Terapeuta Interno** | Creado por institución | Sí (la institución que lo creó) | User (THERAPIST) vinculado | Profesionales |

## Capabilities

### New Capabilities
- `health-bar`: Componente de indicadores con semáforo (verde/amarillo/rojo) y links directos a detalle
- `role-sidebar`: Sidebar que muestra items según el rol del usuario autenticado

### Modified Capabilities
- `admin-dashboard-overview`: Pasa de mostrar todo a mostrar solo Centro de Mando (health bar + actividad + accessos)
- `dashboard-results`: Agrega behavioral trends para terapeutas
- `dashboard-users`: Separa visualmente Instituciones de Profesionales
- `sidebar`: Items dinámicos por rol en vez de filtro `adminOnly` plano

## Approach

1. **Sidebar**: Refactor `DASHBOARD_NAV_ITEMS` para que cada item tenga `roles: ('ADMIN' | 'THERAPIST')[]` en vez de `adminOnly: boolean`. Render condicional por rol.
2. **HealthBar**: Nuevo componente en `components/admin/HealthBar.tsx`. Toma `alerts`, `triageCount`, `completionRate` como props. Cada indicador con color semáforo y link a detalle.
3. **Centro de Mando**: `DashboardOverview.tsx` — reemplazar secciones de stats genéricos por HealthBar + SessionsChart + QuickActions + ActivityFeed. Mover ResultsDistributionChart a sección secundaria o eliminarla.
4. **Behavioral Trends**: Mover `SelectivityDonut`, `FatigueGauge`, `RushGauge` de `InstitutionDetailOverview` a `DashboardResults` (solo para terapeutas). Llamar a `fetchBehavioralTrends` con scope del terapeuta autenticado.
5. **DashboardUsers**: Agregar tabs o filtro visual para "Instituciones" vs "Profesionales". No dividir en rutas separadas, mantener una sola página con toggle.
6. **Breadcrumbs**: Componente reutilizable `Breadcrumbs` con items y links. Integrar en todas las páginas del dashboard.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/web/src/features/dashboard/components/Sidebar.tsx` | Refactor | Items por rol en vez de `adminOnly` |
| `apps/web/src/features/dashboard/views/DashboardOverview.tsx` | Refactor | Centro de Mando con HealthBar |
| `apps/web/src/features/dashboard/views/DashboardResults.tsx` | Modified | Agregar behavioral trends para terapeutas |
| `apps/web/src/features/dashboard/views/DashboardUsers.tsx` | Modified | Tabs Instituciones / Profesionales |
| `apps/web/src/features/dashboard/views/InstitutionDetailOverview.tsx` | Modified | Sacar behavioral trends, dejar solo stats |
| `apps/web/src/features/dashboard/components/admin/HealthBar.tsx` | New | Componente de health indicators |
| `apps/web/src/features/dashboard/components/admin/SelectivityDonut.tsx` | Moved | De admin/ a results/ o shared/ |
| `apps/web/src/features/dashboard/components/admin/FatigueGauge.tsx` | Moved | Mismo movimiento |
| `apps/web/src/features/dashboard/components/admin/RushGauge.tsx` | Moved | Mismo movimiento |
| `apps/web/src/features/dashboard/constants/dashboard.constants.ts` | Modified | Agregar nav items por rol |
| `apps/web/src/features/dashboard/components/Breadcrumbs.tsx` | New | Componente reutilizable de breadcrumbs |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Behavioral trends scope `"therapist"` no existe en backend | Medium | Verificar endpoint `fetchBehavioralTrends` antes de implementar. Si no existe, pasar `therapistId` como parámetro adicional y adaptar query |
| Sidebar refactor rompe navegación existente | Low | Tests manuales post-implementación de cada ruta |
| HealthBar sin datos de backend (completionRate, triageCount global) | Medium | Usar datos existentes de `adminStats` + `fetchTriageSessions` combinados |
| Cambios en DashboardUsers rompen CRUD existente | Medium | Mantener estructura de tabla intacta, solo agregar filtro visual |

## Rollback Plan

Revertir archivos modificados por capa: 1) Sidebar 2) DashboardOverview 3) DashboardResults/DashboardUsers 4) InstitutionDetailOverview. Los componentes nuevos (HealthBar, Breadcrumbs) se eliminan sin afectar funcionalidad existente.

## Dependencies

- Verificar que `fetchBehavioralTrends` soporte scope por terapeuta (o pasar therapistId)
- Datos necesarios: `adminStats.alerts`, `fetchTriageSessions` count global

## Success Criteria

- [ ] Sidebar muestra items según rol (admin vs therapist)
- [ ] Admin DashboardOverview tiene HealthBar con indicadores y links
- [ ] Terapeuta DashboardResults muestra behavioral trends
- [ ] InstitutionDetailOverview oculta behavioral trends (solo stats)
- [ ] DashboardUsers tiene tabs Instituciones / Profesionales
- [ ] Breadcrumbs visibles en todas las páginas del dashboard
- [ ] Build pasa limpio
