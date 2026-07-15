# Documentación del Sitio Público (Landing Page)

El directorio `apps/site` contiene la página web pública de presentación y marketing de A.kit Platform. A diferencia de `apps/web` (que es una SPA protegida y dinámica con React/Vite), este sitio está enfocado 100% en el rendimiento, la conversión y el SEO.

## Arquitectura y Stack

- **Framework Core:** Astro. Elegido por su arquitectura de "Islas" (Islands Architecture), lo que permite enviar HTML estático al navegador por defecto y cargar JavaScript solo en los componentes interactivos.
- **Estilos:** Tailwind CSS, compartiendo los mismos tokens de diseño (`@repo/design-tokens`) que el resto de las aplicaciones para mantener consistencia visual.
- **Interactividad:** Componentes React hidratados en cliente (solo donde es estrictamente necesario, ej: botones de login, carruseles dinámicos).

## Objetivo del Sitio

1. **Adquisición B2C:** Convencer a los estudiantes de descargar la app móvil o usar la plataforma web para descubrir su vocación.
2. **Adquisición B2B:** Actuar como portal institucional para que colegios y fundaciones se pongan en contacto y adquieran lotes de Vouchers.
3. **SEO (Search Engine Optimization):** Indexar correctamente en Google términos relacionados a la orientación vocacional y el Test de Holland.

## Integración con la API

Aunque es un sitio mayormente estático, `apps/site` consume algunos endpoints públicos de la API de NestJS (`apps/api`) durante el proceso de Build (SSG) o en runtime, tales como:
- Estadísticas públicas (ej. "Más de 50.000 test realizados").
- Estados de los servicios.

## Despliegue

El sitio está configurado para desplegarse en la infraestructura de Vercel (Edge Network). Las configuraciones de ruteo, redirecciones (ej. `/app` redirige a `apps/web`) y los headers de caché están optimizados a nivel CDN para garantizar tiempos de carga inferiores a 1 segundo a nivel global.
