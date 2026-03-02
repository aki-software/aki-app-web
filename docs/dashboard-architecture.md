# Documentación del Dashboard Administrativo

Esta sección documenta la arquitectura técnica y el estado actual del módulo "Dashboard" creado en el entorno web y el modo en que se comunica (o se comunicará) con el backend.

## 1. Arquitectura del Frontend (`apps/web`)

El Dashboard está construido bajo una **Feature-based Architecture** (una adaptación Clean/DDD para el cliente) para asegurar una clara separación de responsabilidades y modularidad. Todo el código pertenece al directorio: `apps/web/src/features/dashboard`.

### Estructura del Módulo:
- **`api/`**: Contiene el cliente API o servicio proxy (`fetchDashboardStats()`). Actualmente, retorna **Mock Data**. Este es el único lugar donde se debe reemplazar el retorno harcodeado por un verdadero `fetch('/api/sessions/dashboard')` una vez que el backend esté listo.
- **`components/`**: Componentes UI altamente reutilizables.
  - `StatCard`: Tarjetas de KPI (Key Performance Indicators) agnósticas (solo reciben título, valor, ícono y una métrica de tendencia).
  - Componentes de gráficos construidos con **Recharts** (`SessionsChart` y `ResultsDistributionChart`), que consumen datos explícitamente tipados a través de las Props.
- **`layouts/` y `views/`**: Encargados de la composición final (como `DashboardLayout` con Sidebar usando **React Router**) y las vistas generales (`DashboardOverview`).
- **Iconografía**: Se utiliza `lucide-react` para mantener SVG modernos y eficientes.

## 2. Contrato API Compartido (`packages/contracts`)

Dado que el proyecto utiliza **pnpm workspaces (Turborepo)** y el Backend y Frontend pueden ser desarrollados por diferentes equipos de trabajo, se ha creado el paquete interno **`@akit/contracts`**.

### Propósito del Paquete:
Servir como **única fuente de verdad** compartida para las interfaces (types) utilizadas tanto en NestJS como en React, reduciendo las posibilidades de un conflicto de serialización de datos.

Este paquete expone las siguientes interfaces principales en su `index.ts`:

```typescript
export interface DashboardStatsResponse {
  totalSessions: number;
  completionRate: number; // Porcentaje
  averageTimeSeconds: number;
  sessionsActivity: SessionActivityData[];
  resultsDistribution: CategoryDistributionData[];
}
```

### Cómo consumirlo:

**Para Desarrolladores Frontend (`apps/web`):**
1. La dependencia `"@akit/contracts": "workspace:*"` ya está incluida.
2. Los componentes como `DashboardOverview` importan la interfaz para asegurar que el componente que pinta UI maneje correctamente la estructura de los charts.

**Para Desarrolladores Backend (`apps/api`):**
Cuando desarrollen la capa del Dashboard en NestJS:
1. Instalar el paquete ejecutando: `pnpm add @akit/contracts --workspace` desde el directorio de la API.
2. Usar `DashboardStatsResponse` como tipo de retorno en el Controlador (`GET /sessions/dashboard`) o los DTOs, garantizado así que lo que responde Nest se compilará con seguridad en React.

## 3. Próximos pasos recomendados
1. Implementar la capa de datos real en el `SessionsService` del Backend usando TypeORM QueryBuilder.
2. Intercambiar la función `fetchDashboardStats()` en el Frontend por un verdadero `fetch` o cliente Axios dirigido al endpoint de Nest.
3. Extender el Sidebar con las otras pestañas (Resultados en detalle, Usuarios, Ajustes) delegando la navegación a React Router v7.
