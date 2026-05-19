# Infraestructura y Despliegue (Production)

Este documento detalla la arquitectura de infraestructura utilizada para desplegar los diferentes componentes del ecosistema **A.kit** en entornos productivos (Staging y Producción). A diferencia del entorno local basado enteramente en Docker, en producción apostamos por soluciones PaaS (Platform as a Service) especializadas y serverless para maximizar la escalabilidad y minimizar el mantenimiento de servidores (Zero Ops).

---

## 🏗️ Topología de la Infraestructura en la Nube

```mermaid
graph TD
    subgraph Frontend (Edge CDN)
        VercelWeb[Vercel: Panel Web Admin]
        VercelSite[Vercel: Landing Page]
    end

    subgraph Backend & Background Jobs
        RenderAPI[Render: API NestJS / Worker]
        RenderRedis[(Render: Redis Managed)]
    end

    subgraph Data & Auth
        NeonDB[(Neon: Serverless PostgreSQL)]
        FirebaseAuth[Firebase: Auth & Credential Manager]
    end

    subgraph Mobile
        PlayConsole[Google Play Console: CotejoApp]
    end

    VercelWeb -->|Peticiones REST| RenderAPI
    VercelSite -->|Peticiones REST| RenderAPI
    PlayConsole -->|Peticiones REST| RenderAPI
    
    RenderAPI -->|Lee/Escribe Datos| NeonDB
    RenderAPI -->|Encola Jobs / Puppeteer| RenderRedis
    
    PlayConsole -->|Valida Identidad| FirebaseAuth
    VercelWeb -->|Valida Identidad| FirebaseAuth
```

---

## 🌐 1. Frontends (Vercel)

Tanto el **Admin Web Dashboard** (React + Vite) como la **Landing Page Pública** (Astro) están alojados en **Vercel**.

* **Por qué Vercel:** Vercel está intrínsecamente optimizado para Single Page Applications (SPA) empaquetadas con Vite y sitios estáticos generados por Astro. Nos proporciona una CDN global, pre-visualizaciones automáticas por Pull Request y despliegue instantáneo.
* **Configuración del Monorepo:** En el panel de Vercel, configuramos dos proyectos apuntando al mismo repositorio de GitHub, estableciendo el "Root Directory" a `apps/web` y `apps/site` respectivamente, con el comando de build delegado a Turborepo.

## ⚙️ 2. API Backend & Cola de Tareas (Render)

La API construida en **NestJS** y nuestro motor de colas interno (**BullMQ**) se ejecutan en los servicios de **Render**.

* **Por qué Render:** Nos permite desplegar servicios Node.js y levantar bases de datos de Redis gestionadas a bajo costo con auto-despliegue directo desde la rama `main` o `develop`.
* **Despliegue del Backend:** La API se despliega como un "Web Service". Los procesos en segundo plano (como el Worker que utiliza Puppeteer para la generación de PDFs) corren sobre el mismo entorno.
* **Instancia Redis:** Render nos provee una instancia de Redis segura (accesible solo mediante la red interna de Render o vía URL autenticada) que actúa como el broker de mensajería para nuestras tareas pesadas.

## 🗄️ 3. Base de Datos (Neon Serverless PostgreSQL)

Abandonamos las bases de datos relacionales tradicionales con servidores fijos y nos migramos a **Neon**.

* **Por qué Neon:** Es un servicio PostgreSQL completamente Serverless. Escala la computación a cero cuando no hay tráfico (ideal para entornos de QA/Staging) y nos permite "clonar" ramas de la base de datos de producción (Database Branching) en milisegundos para probar migraciones agresivas sin arriesgar los datos reales.
* **Seguridad:** TypeORM se conecta a Neon mediante una cadena de conexión TLS estricta gestionada en nuestras variables de entorno de producción (`DATABASE_URL`).

## 🔐 4. Autenticación (Firebase)

La identidad de los usuarios recae exclusivamente en **Firebase Auth**.

* **Por qué Firebase:** Nos libera de la responsabilidad legal y de seguridad de almacenar contraseñas hasheadas en nuestra base de datos.
* **Flujo Híbrido:** El frontend y la app móvil autentican al usuario directamente con los servidores de Google (mediante Credential Manager / Google Sign-In) y obtienen un JWT. Este token se envía en las cabeceras a nuestra API NestJS, la cual valida la firma del token contra las llaves públicas de Firebase antes de autorizar cualquier acceso a Neon.

## 📱 5. Despliegue Móvil (Google Play Console)

El ciclo de vida de **CotejoApp** finaliza en la tienda oficial de Android.

* **Flujo de Publicación:** Las versiones de la aplicación son compiladas por nuestro pipeline CI en GitHub Actions generando un Android App Bundle (`.aab`).
* **Tracks de Distribución:** Utilizamos el canal de "Pruebas Internas" y "Beta" de Play Console para distribuir versiones a los testers e instituciones antes de lanzar una actualización formal a producción, permitiendo verificar los flujos de "Cert Pinning" y encripción SQLCipher en dispositivos físicos reales.
