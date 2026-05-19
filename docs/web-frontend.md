# Web Frontend (apps/web)

El panel administrativo de **A.kit Platform** es una **Single Page Application (SPA)** de nivel empresarial optimizada para una experiencia web fluida y de alto rendimiento. Permite a los administradores B2B de instituciones educativas gestionar vouchers, visualizar analíticas grupales en tiempo real y descargar reportes masivos.

---

## 📂 Estructura Detallada del Directorio (`apps/web/src/`)

El frontend está diseñado bajo una arquitectura limpia modular y de separación de responsabilidades para evitar que los archivos crezcan indefinidamente:

```
src/
├── main.tsx                   # Archivo de entrada de React (monta la app en el DOM)
├── index.css                  # Archivo de estilos global de Tailwind CSS v4
├── api/                       # Clientes HTTP axios/fetch fuertemente tipados con contratos
├── assets/                    # Imágenes, logos y tipografías locales del proyecto
├── components/                # Componentes atómicos globales reutilizables (Botones, inputs)
├── config/                    # Configuración de variables de entorno y constantes del front
├── context/                   # Proveedores de contexto de React (Temas, Autenticación global)
├── features/                  # Módulos de negocio aislados (Feature-First Architecture)
│   ├── auth/                  # Lógica de login, login social y recuperación de clave
│   └── dashboard/             # Analíticas, gráficos de Recharts y control institucional
├── hooks/                     # Custom Hooks globales (ej. useAuth, useDebounce, useWindowSize)
├── router/                    # Configuración y guardias de rutas usando React Router dom
├── test/                      # Configuraciones de mocks y utilidades para testing unitario
└── utils/                     # Helpers genéricos (formateadores de fechas, validadores de strings)
```

---

## ⚡ Stack Técnico y Decisiones de Ingeniería

1. **React 18.3.1**: Aprovechamos el modelo de reconciliación rápida de React, hooks nativos (`useTransition`, `useDeferredValue`) para interfaces extremadamente responsivas durante filtrados pesados en el dashboard.
2. **Vite 6.0**: Empaquetador de última generación. Reemplaza a Webpack reduciendo el tiempo de hot-reload y arranque en desarrollo de minutos a milisegundos gracias al uso de ES Modules y caching agresivo en el navegador.
3. **Tailwind CSS v4.2.1**: Implementamos la última versión del motor utility-first. Esta versión redefine la velocidad de compilación y optimiza la carga final de producción descartando código CSS sin usar.
4. **React Router DOM (v7.13.1)**: Manejo declarativo del enrutamiento del lado del cliente, con soporte para rutas anidadas dinámicas y lazy loading nativo de componentes de páginas pesadas.
5. **Recharts (v3.7.0)**: Biblioteca de gráficos construida específicamente para React, basada en elementos SVG nativos del DOM. Utilizada para renderizar la distribución del Holland Code, permitiendo animaciones sumamente fluidas y soporte responsive de pantallas.

---

## 🎨 Tailwind CSS v4 e Integración con `@akit/design-tokens`

Una de las joyas del monorepo es la centralización estética. **A.kit** utiliza la nueva especificación de **Tailwind CSS v4** integrada directamente sobre Vite mediante el plugin `@tailwindcss/vite`, prescindiendo por completo de dependencias pesadas u obsoletas como PostCSS.

### Configuración en `vite.config.ts`:
El compilador se encarga de inyectar los estilos directamente en el ciclo de compilación del bundle:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Inyección directa nativa sin PostCSS
  ],
});
```

### Gestión CSS en `src/index.css`:
En Tailwind v4, ya no existe el archivo tradicional `tailwind.config.js`. Toda la configuración, extensión de temas y tokens de diseño se realiza de forma declarativa directamente dentro de tu archivo CSS principal utilizando directivas `@theme`:

```css
@import "tailwindcss";

@theme {
  /* Extensión del sistema de colores usando variables del monorepo */
  --color-brand-primary: var(--akit-primary-500);
  --color-brand-secondary: var(--akit-secondary-500);
  --color-brand-background: #0f172a; /* Slate 900 */
  
  /* Fuentes Corporativas Modernas */
  --font-sans: "Outfit", sans-serif;
  
  /* Animaciones Customizadas Micro-interacciones */
  --animate-scale-up: scaleUp 0.15s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

Las variables `--akit-*` son inyectadas dinámicamente desde nuestro paquete local de workspaces `@akit/design-tokens`, asegurando una consistencia visual de marca idéntica entre este panel web y el sitio web público.

---

## 🧪 Pruebas Unitarias y de Componentes (Vitest + JSDOM)

Para maximizar la integración con la velocidad del compilador Vite, el frontend reemplaza Jest por **Vitest**. Vitest comparte exactamente la misma configuración de plugins, aliases de rutas y transformadores que usa la app al correr en desarrollo, evitando el clásico bug de "en los tests funciona pero al compilar no".

### Scripts de Tests Mapeados y Verificados

| Comando NPM/PNPM | Script Real Ejecutado | Propósito y Funcionamiento Técnico |
| :--- | :--- | :--- |
| `pnpm run dev` | `vite` | Levanta el panel web en entorno de desarrollo local con recarga rápida (HMR). |
| `pnpm run build` | `tsc -b && vite build` | Ejecuta el validador estricto del compilador de TypeScript (`tsc -b`) y empaqueta la SPA optimizada en la carpeta `/dist`. |
| `pnpm run lint` | `eslint .` | Corre ESLint sobre todo el proyecto para validar el cumplimiento de buenas prácticas y hooks de React. |
| `pnpm run test` | `vitest run` | Ejecuta toda la suite de pruebas unitarias y de integración sobre componentes una sola vez (ideal para CI). |
| `pnpm run test:watch` | `vitest` | Ejecuta las pruebas en modo observador activo (TDD), re-corriendo las pruebas del archivo específico que modifiques al instante. |
| `pnpm run preview` | `vite preview` | Levanta un servidor estático local sirviendo el contenido de la carpeta `/dist` ya compilada, permitiendo auditorías de Lighthouse. |

---

## 📝 Convenciones Técnicas de Código en React

### 1. Test Unitario de un Componente con Vitest
El siguiente es un ejemplo real y testeable de cómo se escriben las aserciones visuales en el front:

```typescript
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Componente Button', () => {
  it('Debería renderizar el texto correctamente y reaccionar al click', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Iniciar Test</Button>);
    
    // Buscar elemento en el DOM simulado de JSDOM
    const buttonElement = screen.getByText('Iniciar Test');
    expect(buttonElement).toBeInTheDocument();
    
    // Simular evento del usuario
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 2. Estructura de Enrutamiento Seguro (React Router v7)
Para asegurar que los usuarios no autenticados no accedan al Dashboard de analíticas B2B:

```typescript
// src/router/AppRouter.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../features/auth/Login';
import { DashboardLayout } from '../features/dashboard/DashboardLayout';
import { DashboardHome } from '../features/dashboard/DashboardHome';
import { PrivateGuard } from './guards/PrivateGuard';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />
        
        {/* Rutas Privadas Protegidas */}
        <Route element={<PrivateGuard />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
          </Route>
        </Route>
        
        {/* Redirección por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```
