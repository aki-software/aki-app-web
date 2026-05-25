# Auditoría de Componentes y Licencias de Software de Terceros
**Proyecto:** A.kit  
**Fecha:** 2026-05-25  
**Estado:** Finalizado para Revisión Legal

Este documento contiene el inventario consolidado de dependencias de software, librerías, frameworks e integraciones de terceros utilizados en las distintas partes del sistema (App Mobile, API/backend, Dashboard administrativo y Landing page), detallando versión, tipo de licencia asociada, plataforma y su finalidad técnica.

---

## Resumen Ejecutivo de Licencias Utilizadas

El proyecto utiliza un conjunto estándar de librerías de código abierto y servicios comerciales autorizados. El perfil general de licencias se compone principalmente de:

1. **Licencias de Código Abierto Permisivas (MIT, Apache-2.0, ISC, BSD-2/3-Clause):** Representan el 90%+ del software integrado. Estas licencias son comercialmente seguras, no tienen restricciones de "copyleft" (código libre obligatorio para el derivado) y permiten la compilación, distribución y modificación en software comercial propietario.
2. **Términos de Servicio y Licencias Propietarias de Proveedores de Nube (Google Play / Firebase / AWS):** Utilizadas de forma reglamentaria a través de sus respectivos SDKs cliente para conectar la aplicación móvil y backend a servicios en la nube licenciados (Autenticación, Analytics, Notificaciones push y Almacenamiento).

---

## 1. Detalle por Componente del Sistema

A continuación, se presenta el desglose técnico estructurado conforme a la plantilla requerida.

---

### A. App Mobile (Android Nativos - CotejoApp)

#### Kotlin Standard Library & Coroutines
- **Nombre:** Kotlin Standard Library & Coroutines (`kotlinx-coroutines-core`)
- **Versión utilizada:** `2.0.21` (Kotlin Compiler) / `1.8.1` (Coroutines)
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Lenguaje de programación nativo moderno y framework para ejecución asincrónica basada en corrutinas de alto rendimiento.

#### Jetpack Compose
- **Nombre:** Jetpack Compose (BOM - Bill of Materials)
- **Versión utilizada:** BOM `2024.11.00`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Framework oficial de Google para interfaces de usuario declarativas en aplicaciones nativas de Android.

#### Android Jetpack Core KTX
- **Nombre:** Android Jetpack Core KTX (`core-ktx`, `appcompat`)
- **Versión utilizada:** `core-ktx: 1.15.0` / `appcompat: 1.7.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Extensiones e interfaces de compatibilidad de Kotlin para interactuar de forma segura con el sistema operativo Android.

#### Jetpack Navigation Compose
- **Nombre:** Navigation Compose
- **Versión utilizada:** `2.8.5`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Sistema para definir y controlar el enrutamiento de pantallas y flujos de navegación dentro de la interfaz de la aplicación.

#### Jetpack Lifecycle Runtime
- **Nombre:** Lifecycle Runtime (`lifecycle-runtime-ktx`, `lifecycle-viewmodel-compose`, `lifecycle-runtime-compose`)
- **Versión utilizada:** `2.8.7`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Gestión reactiva del ciclo de vida de los componentes nativos (Activities y Composables) y retención segura de datos.

#### Dagger Hilt
- **Nombre:** Dagger Hilt
- **Versión utilizada:** `2.51.1`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Framework estándar de inyección de dependencias para simplificar la creación de objetos y arquitectura limpia desacoplada.

#### Room Database
- **Nombre:** Room Runtime & KTX
- **Versión utilizada:** `2.6.1`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Capa de mapeo y abstracción estructurada sobre base de datos relacional SQLite local.

#### SQLCipher
- **Nombre:** Android Database SQLCipher (`net.zetetic:android-database-sqlcipher`)
- **Versión utilizada:** `4.5.4`
- **Licencia asociada:** BSD 3-Clause License (Zetetic)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Encriptación completa transparente con algoritmo AES de 256 bits para la base de datos interna de la app, resguardando datos sensibles en reposo.

#### Jetpack DataStore Preferences
- **Nombre:** DataStore Preferences
- **Versión utilizada:** `1.1.1`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Almacenamiento seguro, reactivo y asincrónico para configuraciones simples y preferencias persistentes en el terminal.

#### Android Security Crypto
- **Nombre:** Android Security Crypto (`androidx.security:security-crypto`)
- **Versión utilizada:** `1.1.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Encapsulamiento seguro para encriptación de archivos locales y almacenamiento a través de claves de hardware administradas por el Android Keystore.

#### Jetpack WorkManager
- **Nombre:** WorkManager (`work-runtime-ktx`, `hilt-work`)
- **Versión utilizada:** WorkManager `2.10.0` / HiltWork `1.2.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Programación confiable de tareas críticas en segundo plano que deben ejecutarse incluso si la app se cierra o el dispositivo se reinicia.

#### Retrofit
- **Nombre:** Retrofit Core
- **Versión utilizada:** `2.11.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Cliente REST robusto de tipo seguro para mapear los endpoints de nuestra API web a interfaces nativas Kotlin.

#### OkHttp
- **Nombre:** OkHttp Core & Logging Interceptor
- **Versión utilizada:** `4.12.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Motor de red subyacente para realizar conexiones HTTP, controlar reintentos, políticas de caché y registro de peticiones de red.

#### Kotlinx Serialization
- **Nombre:** Kotlinx Serialization JSON (`kotlinx-serialization-json`, `retrofit-converter-kotlinx-serialization`)
- **Versión utilizada:** `1.8.0` / Retrofit integration `2.11.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Framework oficial de serialización de Kotlin para transformar objetos de negocio a cadenas de texto JSON.

#### Coil
- **Nombre:** Coil Compose (`coil-compose`)
- **Versión utilizada:** `2.7.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Cargador de imágenes reactivo integrado de manera nativa con Jetpack Compose para descargas y renderizados eficientes y asincrónicos.

#### Timber
- **Nombre:** Timber
- **Versión utilizada:** `5.0.1`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Utilitario extensible para centralizar logs y facilitar la depuración, previniendo la fuga involuntaria de mensajes de log en compilaciones de producción.

#### Google Play Billing Library
- **Nombre:** Google Play Billing (`com.android.billingclient:billing-ktx`)
- **Versión utilizada:** `7.1.1`
- **Licencia asociada:** Google Play Terms of Service & Developer License Agreement (Proprietaria)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Librería cliente oficial de Google para habilitar cobros en la tienda de aplicaciones de Google Play (compras in-app y suscripciones).

#### Google Play Services Auth & Credentials
- **Nombre:** Google Play Services Auth & Identity Provider (`play-services-auth`, `googleid`, `credentials`)
- **Versión utilizada:** Services Auth `21.0.0` / GoogleId `1.1.1` / Credentials `1.3.0`
- **Licencia asociada:** Google APIs Terms of Service (Proprietaria) & Apache-2.0 (Credentials interface)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Integración nativa del inicio de sesión único (Single Sign-On) utilizando cuentas de Google y gestión de credenciales a través del Credential Manager de Android.

#### Firebase SDK Core & Analytics
- **Nombre:** Firebase Analytics (`firebase-analytics`)
- **Versión utilizada:** Sincronizado vía Firebase BOM `33.6.0`
- **Licencia asociada:** Google APIs Terms of Service (Proprietaria)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Recolección de telemetría, eventos de negocio y análisis cuantitativo del comportamiento del usuario en la aplicación móvil.

#### Firebase Crashlytics
- **Nombre:** Firebase Crashlytics (`firebase-crashlytics`)
- **Versión utilizada:** Sincronizado vía Firebase BOM `33.6.0`
- **Licencia asociada:** Apache License 2.0 / Google APIs Terms
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Registro en tiempo real de excepciones del sistema, fallos inesperados de la aplicación móvil (crashes) y trazas de error para optimizar la estabilidad técnica.

#### Firebase Performance Monitoring
- **Nombre:** Firebase Performance (`firebase-perf`)
- **Versión utilizada:** Sincronizado vía Firebase BOM `33.6.0`
- **Licencia asociada:** Google APIs Terms of Service (Proprietaria)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** Monitoreo automatizado en producción de métricas de red y tiempo de procesamiento en el terminal móvil.

#### Firebase Authentication Client
- **Nombre:** Firebase Authentication Client SDK (`firebase-auth`)
- **Versión utilizada:** Sincronizado vía Firebase BOM `33.6.0`
- **Licencia asociada:** Google APIs Terms of Service (Proprietaria)
- **Repositorio y/o parte del sistema:** App Mobile
- **Plataforma:** Android
- **Finalidad o función general:** SDK de comunicación cliente para iniciar sesión y mantener activa la sesión del usuario.

---

### B. API / Backend (akit-platform/apps/api)

#### NestJS Framework
- **Nombre:** NestJS Core & Platform Express (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`)
- **Versión utilizada:** `11.0.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Framework central de arquitectura de backend estructurada y modular.

#### NestJS Config
- **Nombre:** NestJS Config Module (`@nestjs/config`)
- **Versión utilizada:** `4.0.3`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Provisión de configuraciones seguras basadas en entornos y tipado fuerte para variables críticas de producción.

#### TypeORM
- **Nombre:** TypeORM ORM Framework (`typeorm`, `@nestjs/typeorm`)
- **Versión utilizada:** ORM Core `0.3.28` / NestJS module `11.0.0`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Mapeador objeto-relacional (ORM) para la interacción directa con la base de datos SQL estructurada a nivel de negocio y migraciones automáticas.

#### PostgreSQL Node Driver
- **Nombre:** Postgres Node Driver (`pg`)
- **Versión utilizada:** `8.19.0`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Biblioteca de red e interfaz de bajo nivel para establecer conexión segura y transferir datos a la base de datos relacional PostgreSQL.

#### AWS SDK for JavaScript S3
- **Nombre:** AWS SDK S3 Client (`@aws-sdk/client-s3`, `@aws-sdk/lib-storage`)
- **Versión utilizada:** `3.1014.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Conexión y persistencia de archivos subidos por el usuario (como firmas, adjuntos o reportes) en buckets de almacenamiento en la nube compatibles con AWS S3.

#### BullMQ
- **Nombre:** BullMQ Queue System (`bullmq`)
- **Versión utilizada:** `5.33.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Framework de administración de colas asincrónicas y planificador de trabajos en segundo plano robusto. Habilita el procesamiento distribuido.

#### ioredis
- **Nombre:** ioredis Client (`ioredis`)
- **Versión utilizada:** `5.10.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Cliente Redis de alto rendimiento utilizado como capa subyacente para las colas distribuidas BullMQ y operaciones de caché rápida.

#### Pino Logger
- **Nombre:** Pino Logger Suite (`nestjs-pino`, `pino-http`, `pino-pretty`)
- **Versión utilizada:** `nestjs-pino: 4.6.0` / `pino-http: 11.0.0` / `pino-pretty: 13.1.3`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Sistema estructurado de logging centralizado ultrarrápido para el monitoreo en producción de excepciones técnicas y solicitudes entrantes.

#### Helmet
- **Nombre:** Helmet
- **Versión utilizada:** `8.1.0`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Middleware de seguridad HTTP que inyecta cabeceras especiales en las respuestas de la API para prevenir vulnerabilidades comunes como inyección, scripting entre sitios (XSS), robo de click e iframe hijack.

#### Class Validator & Class Transformer
- **Nombre:** Class Validator / Class Transformer
- **Versión utilizada:** `class-validator: 0.15.1` / `class-transformer: 0.5.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Validación sintáctica, tipado y transformación de datos en las solicitudes entrantes (cuerpos de POST/PUT, parámetros de consulta) mediante decoradores declarativos.

#### Resend SDK
- **Nombre:** Resend Node.js SDK (`resend`)
- **Versión utilizada:** `6.12.3`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** SDK de comunicación para conectar con el servicio externo Resend y despachar correos electrónicos transaccionales del sistema.

#### Puppeteer
- **Nombre:** Puppeteer
- **Versión utilizada:** `24.40.0`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Renderizador de navegador automatizado headless (Chromium) en backend para exportar informes de datos e historiales clínicos clínicos a documentos en formato PDF con diseño exacto.

#### RxJS
- **Nombre:** RxJS (`rxjs`)
- **Versión utilizada:** `7.8.1`
- **Licencia asociada:** Apache License 2.0
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Framework de programación reactiva basada en flujos y observables (es una dependencia mandatoria de NestJS).

#### Dotenv
- **Nombre:** Dotenv (`dotenv`)
- **Versión utilizada:** `17.3.1`
- **Licencia asociada:** BSD 2-Clause License
- **Repositorio y/o parte del sistema:** App Web (API/backend)
- **Plataforma:** Web (Servidor / Node.js runtime)
- **Finalidad o función general:** Componente auxiliar utilizado en desarrollo local para inyectar variables de configuración del archivo `.env` en las propiedades del entorno del sistema.

---

### C. Dashboard Administrativo (akit-platform/apps/web)

#### React Core
- **Nombre:** React & React DOM
- **Versión utilizada:** `18.3.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Dashboard administrativo)
- **Plataforma:** Web (Navegador cliente)
- **Finalidad o función general:** Biblioteca JavaScript core de renderizado reactivo basada en componentes para la interfaz del panel de control de administradores y terapeutas.

#### React Router DOM
- **Nombre:** React Router DOM
- **Versión utilizada:** `7.13.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Dashboard administrativo)
- **Plataforma:** Web (Navegador cliente)
- **Finalidad o función general:** Framework y gestor de rutas web de navegación en Single Page Application (SPA), previniendo recargas completas del navegador.

#### Tailwind CSS & Vite integration
- **Nombre:** Tailwind CSS Compiler & Vite integration (`@tailwindcss/vite`, `tailwindcss`)
- **Versión utilizada:** `4.2.1`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Dashboard administrativo)
- **Plataforma:** Web (Compilador / Navegador cliente)
- **Finalidad o función general:** Framework de estilos CSS utilitarios e integración con el empaquetador Vite para renderizar el sistema de diseño visual de la interfaz.

#### Recharts
- **Nombre:** Recharts Charting Library
- **Versión utilizada:** `3.7.0`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Dashboard administrativo)
- **Plataforma:** Web (Navegador cliente)
- **Finalidad o función general:** Librería de visualización y trazabilidad gráfica de datos analíticos (como perfiles conductuales, métricas de pacientes) integrada nativamente en React.

#### Lucide React Icons
- **Nombre:** Lucide React (`lucide-react`)
- **Versión utilizada:** `0.576.0`
- **Licencia asociada:** ISC License
- **Repositorio y/o parte del sistema:** App Web (Dashboard administrativo)
- **Plataforma:** Web (Navegador cliente)
- **Finalidad o función general:** Kit de iconos vectoriales ligeros en formato SVG embebidos como componentes visuales interactivos de React.

---

### D. Landing Page (akit-platform/apps/site)

*(Nota: Tal como fue solicitado por el departamento legal, se omitieron del análisis todos los recursos gráficos propios del diseño, fuentes o tipografías de terceros, documentando estrictamente el framework y componentes de base).*

#### Astro Web Framework
- **Nombre:** Astro Framework Core (`astro`)
- **Versión utilizada:** `6.3.3`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Landing page)
- **Plataforma:** Web (Generador estático / Servidor)
- **Finalidad o función general:** Framework de desarrollo moderno enfocado en máxima velocidad, compilando la landing page como HTML estático con un porcentaje de JS nulo en cliente (arquitectura de islas).

#### Tailwind CSS Astro/Vite Compiler
- **Nombre:** Tailwind CSS Astro compiler integration (`@tailwindcss/vite`, `tailwindcss`)
- **Versión utilizada:** `4.0.0`
- **Licencia asociada:** MIT License
- **Repositorio y/o parte del sistema:** App Web (Landing page)
- **Plataforma:** Web (Compilador)
- **Finalidad o función general:** Compilador y motor utilitario de diseño responsivo de la interfaz estática.

---

## 2. Matriz Legal Consolidada (Tabla Rápida)

Para una vista rápida e integrada del estado de propiedad intelectual del proyecto:

| Componente de Terceros | Versión | Licencia | Sistema Afectado | Plataforma | Función Principal |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Astro Framework** | `6.3.3` | MIT | Landing Page | Web (Compilador) | Renderizado estático optimizado |
| **React Core** | `18.3.1` | MIT | Dashboard | Web (Navegador) | UI y componentes del panel |
| **React Router DOM** | `7.13.1` | MIT | Dashboard | Web (Navegador) | Rutas y SPA interna |
| **Recharts** | `3.7.0` | MIT | Dashboard | Web (Navegador) | Gráficas analíticas de pacientes |
| **Lucide React** | `0.576.0` | ISC | Dashboard | Web (Navegador) | Set de iconos interactivos |
| **Tailwind CSS** | `4.x` | MIT | Dashboard + Landing | Web (Navegador) | Framework y motor de diseño visual |
| **NestJS Suite** | `11.0.1` | MIT | API / Backend | Web (Servidor) | Servidor de aplicación modular |
| **TypeORM** | `0.3.28` | MIT | API / Backend | Web (Servidor) | Mapeo de negocio a base de datos |
| **PostgreSQL Client (pg)**| `8.19.0` | MIT | API / Backend | Web (Servidor) | Conexión y driver de base de datos |
| **AWS SDK S3** | `3.1014.0`| Apache-2.0 | API / Backend | Web (Servidor) | Persistencia de adjuntos en la nube |
| **BullMQ** | `5.33.1` | MIT | API / Backend | Web (Servidor) | Cola de trabajos asincrónicos pesados |
| **ioredis** | `5.10.1` | MIT | API / Backend | Web (Servidor) | Conector ultrarrápido con Redis |
| **Pino Logger Suite** | `4.x/11.x`| MIT | API / Backend | Web (Servidor) | Logs estructurados de producción |
| **Helmet** | `8.1.0` | MIT | API / Backend | Web (Servidor) | Cabeceras de seguridad HTTP |
| **Puppeteer** | `24.40.0` | Apache-2.0 | API / Backend | Web (Servidor) | Exportación de informes médicos a PDF|
| **Resend Node SDK** | `6.12.3` | MIT | API / Backend | Web (Servidor) | Integración transaccional de mails |
| **Jetpack Compose Suite** | `2024.11` | Apache-2.0 | App Mobile | Android | UI e interacción nativa |
| **Dagger Hilt** | `2.51.1` | Apache-2.0 | App Mobile | Android | Inyección de dependencias |
| **Room Database** | `2.6.1` | Apache-2.0 | App Mobile | Android | Base de datos persistente local |
| **SQLCipher (Zetetic)** | `4.5.4` | BSD 3-Clause | App Mobile | Android | Encriptación AES-256 de base local |
| **Jetpack WorkManager** | `2.10.0` | Apache-2.0 | App Mobile | Android | Tareas de fondo persistentes |
| **Retrofit** | `2.11.0` | Apache-2.0 | App Mobile | Android | Cliente REST de red |
| **OkHttp** | `4.12.0` | Apache-2.0 | App Mobile | Android | Socket y motor de red HTTP |
| **Coil Compose** | `2.7.0` | Apache-2.0 | App Mobile | Android | Carga asincrónica de imágenes |
| **Google Play Billing** | `7.1.1` | Propietaria | App Mobile | Android | Pasarela de suscripción y pagos |
| **Google Play Services Auth**| `21.0.0` | Propietaria | App Mobile | Android | Inicio de sesión con Google |
| **Firebase SDK Client** | `33.6.0` | Propietaria/Apache| App Mobile | Android | Auth, Crashlytics y Métricas |
