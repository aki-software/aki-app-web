# 📊 Auditoría de Optimización y Estrategia de Crecimiento: A.kit Platform
*(Versión Premium 2026 — Foco en Terapia Ocupacional, Accesibilidad, CotejoApp y Cumplimiento Clínico)*

---

## 🏛️ Prefacio del Arquitecto
Mirá, la plataforma A.kit hoy está en un punto clave. El MVP funciona, pero al estar **enfocados en el uso de Terapistas Ocupacionales y orientados a discapacidades y neurodivergencias**, la exigencia de accesibilidad, estabilidad clínica y privacidad de datos no es opcional: es la columna vertebral de tu producto.

El ecosistema de A.kit está compuesto por dos grandes mundos que deben dialogar de forma robusta y fluida:
1. **`akit-platform` (Monorepo backend/web):** El cerebro API NestJS en Neon, la Landing Astro y el dashboard de terapeutas.
2. **`CotejoApp` (Android nativo Kotlin):** La interfaz móvil nativa de alto rendimiento desarrollada en Jetpack Compose, donde los estudiantes y pacientes realizan el test en vivo.

Un test tradicional lineal de 100 preguntas es una barrera cognitiva y motriz gigantesca para un paciente con discapacidad. Aquí, la tecnología móvil nativa y el procesamiento asíncrono no son solo para "hacer linda la app", son **herramientas de accesibilidad clínica indispensables**.

---

## 📈 1. Benchmarking Competitivo y Estado del Arte (Mercado 2026)

### 🔍 1.1 Radiografía de la Competencia e i18n
*   **Naviance (PowerSchool) — El gigante vulnerable:**
    *   *El Problema:* Legacy obsoleto con interfaces complejas. En 2026 pagó **$17.25 millones de dólares** en una demanda colectiva por vulnerar la privacidad de estudiantes mediante analíticas de terceros.
    *   *Privacidad en A.kit hoy:* Actualmente estamos parados en un nivel básico: la privacidad se maneja a nivel de código de aplicación (filtros WHERE en las consultas ORM/Prisma). **La plataforma NO está lista en base de datos para una auditoría estricta de salud/educación.** Necesitamos migrar a **Row-Level Security (RLS)** nativo y encriptación en reposo para ePHI.
*   **YouScience (Brightpath) — El estándar de aptitud:**
    *   *Su Foco:* Mide aptitudes duras.
    *   *Nuestra Diferenciación de Terapia Ocupacional:* A.kit no busca solo orientar a "carreras universitarias de élite" de forma fría, sino que ayuda a los terapistas ocupacionales a mapear **potencialidades de autonomía, destrezas motrices/cognitivas y encaje de actividades adaptadas** en base al comportamiento psicométrico del paciente.
*   **i18n (Multidioma):**
    *   *Estado Actual:* **La aplicación de A.kit NO está preparada para i18n.** Los textos de UI están hardcodeados en español. Para competir con Xello (130+ idiomas) y expandirse, implementaremos un sistema de internacionalización basado en **i18next** en React Native/Web y archivos de traducción (`es.json`, `en.json`) en paquetes del monorepo compartidos.

---

### 💡 1.2 El Módulo IRT-Adaptive Testing (CAT): ¿Cómo funciona y cómo se implementa?

En lugar de aburrir al paciente con una encuesta estática, implementamos un **Test Adaptativo Computarizado (CAT)** usando **Teoría de Respuesta al Ítem (IRT)**.

```
       [ Inicio del Test (Habilidad Estimada θ = 0) ]
                            │
                            ▼
              ┌───────────────────────────┐
              │  API: Selecciona pregunta │◄────────────────────────┐
              │   más informativa (MFI)   │                         │
              └─────────────┬─────────────┘                         │
                            │                                       │
                            ▼                                       │
              ┌───────────────────────────┐                         │
              │  Paciente responde (0/1)  │                         │ (Iteración)
              └─────────────┬─────────────┘                         │
                            │                                       │
                            ▼                                       │
              ┌───────────────────────────┐                         │
              │  API: Recalcula θ y Error │                         │
              │  Estándar de Estimación   │                         │
              └─────────────┬─────────────┘                         │
                            │                                       │
                            ▼                                       │
                 ¿Error < 0.3 o Preguntas = 20?                     │
                 /                          \                       │
              [SÍ]                          [NO] ───────────────────┘
               │
               ▼
   [ Finalizar Test y Guardar θ ]
```

#### Paso a Paso de la Integración:
1. **Item Bank Calibrado:** En base de datos, cada carta/pregunta tiene tres parámetros psicométricos:
   * **Dificultad (b):** Qué tan representativa es la carta de una destreza.
   * **Discriminación (a):** Qué tan bien diferencia a los usuarios con esa destreza.
   * **Adivinación (c):** Probabilidad de respuesta afirmativa al azar.
2. **Endpoint de Selección:** La app móvil llama a `POST /api/v1/sessions/:id/next-item` enviando las respuestas anteriores.
3. **Cálculo con `@bdelab/jscat`:** NestJS calcula la habilidad actual ($\theta$) y devuelve el ID del siguiente ítem que maximiza la información para ese nivel específico de aptitud.
4. **Regla de Parada:** Si el error de medición psicométrica cae por debajo de un umbral (ej. 0.3) o llegamos a 20 preguntas, la API finaliza la prueba de manera adaptativa. **Menos fatiga cognitiva, mayor accesibilidad para discapacidades.**

---

## 🛠️ 2. Auditoría de Arquitectura Técnica, Monorepo y Workers

### 🚀 2.1 Transición del Monorepo a Ecosistema Desacoplado
No necesitamos separar el código en repositorios independientes. Mantendremos el monorepo pero dividiremos la ejecución:

```
akit-platform/
├── apps/
│   ├── api/            # Servidor HTTP NestJS (API REST para Frontend y Mobile)
│   ├── site/           # Astro Landing Page (B2C)
│   ├── web/            # React SPA (Dashboard Terapeutas)
│   └── worker/         # [NUEVO] NestJS App Context (BullMQ Workers - Sin HTTP)
├── packages/
│   ├── database/       # Cliente Prisma compartido (Neon Postgres)
│   └── contracts/      # Tipado e interfaces TypeScript compartidos
```

*   **Comando de Desarrollo:** Correr ambos en local usando `turbo` o pnpm workspaces:
    ```bash
    pnpm --filter api dev
    pnpm --filter worker dev
    ```

---

### 📦 2.2 Despliegue en Render, Railway y AWS (Comando a Comando)

*   **En Render (Hoy):**
    1. Creás un **Web Service** para `apps/api` con el comando de inicio: `node dist/apps/api/main.js` y puerto expuesto.
    2. Creás un **Background Worker** para `apps/worker` con el comando de inicio: `node dist/apps/worker/main.js`. Render no le expone puertos ni balanceadores de carga, costando la mitad de precio y corriendo de forma aislada.
*   **En Railway:**
    1. Creás dos servicios en tu proyecto apuntando al mismo repo.
    2. En el de la API configuras el start command habitual expuesto a la red.
    3. En el del Worker configuras el start command apuntando al bundle del worker, desactivando la generación de puerto público.
*   **En AWS (Futuro):**
    *   Desplegar como dos contenedores Fargate en **ECS**. La API detrás de un ALB (Application Load Balancer) y el Worker corriendo en una subred privada consumiendo trabajos de la cola.

---

### 🛡️ 2.3 El Contenedor Gotenberg (PDF Sidecar)

Gotenberg se despliega como una imagen oficial Docker de forma aislada.
*   **Render:** Lo creás como un **Private Service** (servicio web privado) usando la imagen `gotenberg/gotenberg:8`. Se comunicará en la red interna de Render mediante su host privado (ej. `http://gotenberg:3000`), sin exponerse a internet.
*   **Railway:** Clic en "+ Add Service" -> "Docker Image" -> escribís `gotenberg/gotenberg:8` y listo. Autogenera el puerto y host interno de inmediato.
*   **AWS:** Corren en la misma definición de tarea ECS como **sidecars**, permitiendo a la API/Worker llamarlo localmente en `http://127.0.0.1:3000` con latencia casi nula.

---

### 📡 2.4 Server-Sent Events (SSE) Detallado

Para evitar la sobrecarga bidireccional de WebSockets, SSE usa HTTP estándar manteniendo un canal abierto de lectura:

```
[ Paciente en CotejoApp ] ─────► (POST Swipe) ─────► [ NestJS API ]
                                                            │
                                                     (Redis PubSub)
                                                            │
                                                            ▼
[ Terapeuta en Web ] ◄──────── (SSE Stream) ◄─────── [ NestJS API ]
```

1. Cada swipe del paciente en **CotejoApp** envía un `POST` HTTP normal a la API.
2. La API procesa el swipe, lo guarda en la base de datos y publica un evento en **Redis Pub/Sub** en el canal `session:{id}`.
3. El dashboard del terapeuta tiene una conexión abierta a un endpoint SSE `GET /api/sessions/:id/live-feed`.
4. El servidor NestJS escucha a Redis y le empuja instantáneamente el JSON de actualización al navegador del terapeuta usando RxJS Observables. Si se cae la red, el navegador se reconecta solo de forma nativa.

---

### 📊 2.5 Trazabilidad con OpenTelemetry (OTel)
Cuando la API encola una tarea de generación de reporte (asíncrona) y responde `202 Accepted` de inmediato, la llamada se divide en dos servidores. Si el worker falla 15 segundos después, ¿cómo lo depuramos?
*   OpenTelemetry inyecta un **Trace ID** único global en el payload del trabajo en Redis.
*   El Worker extrae ese id al procesar la tarea.
*   En **Sentry v8**, verás un único gráfico unificado: desde la llamada HTTP del usuario hasta el log de error exacto dentro del Worker asíncrono.

---

## 📱 3. CotejoApp (Android Nativo Kotlin): Arquitectura y Sincronización

`CotejoApp` es la pieza fundamental que interactúa con el paciente final. Su desarrollo nativo en **Kotlin 2.0** con **Jetpack Compose (Material 3)**, **Dagger Hilt** y **WorkManager** le da un rendimiento inigualable en dispositivos de gama media-baja de escuelas públicas.

```
       CotejoApp (Kotlin Native Architecture)
┌──────────────────────────────────────────────────┐
│              Jetpack Compose (UI)                │
└───────────────────────▲──────────────────────────┘
                        │ (MVI State / Flows)
┌───────────────────────┴──────────────────────────┐
│              ReportViewModel / MVI               │
└───────────────────────▲──────────────────────────┘
                        │
       WorkManager (Background Sync Job)
                        │ (Offline Queue)
┌───────────────────────┴──────────────────────────┐
│        Room DB + SQLCipher (Encrypted Local)     │
└───────────────────────▲──────────────────────────┘
                        │ (Retrofit API verify)
                        ▼
               NestJS API (Neon Postgres)
```

### 🔒 3.1 Blindaje y Privacidad Local en CotejoApp
Al trabajar con menores de edad en salud ocupacional, los datos del dispositivo deben estar protegidos frente a robos o intrusiones de red:
1.  **Room + SQLCipher (Encriptación Local):** Los swipes, resultados y datos locales de la sesión no se persisten en texto plano en SQLite. Room está configurado con **SQLCipher** (`net.zetetic:android-database-sqlcipher`) cifrando en disco en caliente a 256 bits con llaves generadas dinámicamente en el Android KeyStore.
2.  **EncryptedSharedPreferences:** Almacenar de manera segura tokens JWT de Firebase y claves utilizando el esquema AES-256-GCM.
3.  **SSL/Certificate Pinning:** Activado estrictamente en los compilados de QA y Release (a través del OkHttpClient de Retrofit) para mitigar de raíz ataques Man-in-the-Middle en redes Wi-Fi públicas y no confiables de colegios o instituciones de rehabilitación.

---

### 🔄 3.2 Sincronización Resiliente y Offline con WorkManager
En muchas escuelas la red oscila o no existe. No podemos perder las respuestas del paciente bajo ningún concepto.
*   **Encolamiento Local en Room:** La aplicación funciona de manera 100% offline. Cada respuesta se persiste localmente de forma transaccional.
*   **WorkManager + Dagger Hilt:** Al finalizar o durante la prueba, un Worker en segundo plano programado con `WorkManager` (utilizando `androidx.hilt.work` para inyectar los repositorios) se encarga de subir las respuestas a la API NestJS de forma resiliente. Si la red cae, WorkManager reprograma el reintento de sincronización automáticamente con política de *exponential backoff* sin interrumpir el flujo visual del paciente.

---

## 🧠 4. Capa de Datos, RAG de IA y Clínico

### 🗄️ 4.1 Neon vs. Supabase (Mapeo de Base de Datos)
**No es necesario migrar a Supabase.**
*   **Neon** soporta **pgvector** de forma nativa para buscar datos semánticos de la IA.
*   **Neon** es PostgreSQL 100% estándar, por lo cual soporta **Row-Level Security (RLS) perfectamente**. La seguridad se escribe en código SQL nativo en tus migraciones de Prisma.
*   *Recomendación:* **Seguí con Neon.** Su capacidad de ramificaciones de desarrollo (branching) te va a ahorrar dolores de cabeza infinitos en esta etapa.

---

### 🤖 4.2 Arquitectura del Copiloto RAG con LangGraph y HITL

Para generar informes psicopedagógicos precisos y evitar alucinaciones de IA:

```
[ Generar Reporte ] (Cola BullMQ)
        │
        ▼
┌─────────────────────────────────┐
│  AI Node 1: pgvector Retrieval  │ ◄── Busca guías DSM-5, artículos de terapia
└───────────────┬─────────────────┘     ocupacional y reportes pasados.
                │
                ▼
┌─────────────────────────────────┐
│   AI Node 2: LLM Draft Gen      │ ◄── Gemini/Claude redacta borrador estructurado.
└───────────────┬─────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│  AI Node 3: Interrupt (HITL)    │ ◄── Guarda en DB como DRAFT. Pausa la ejecución.
└─────────────────────────────────┘
                │
         [ Terapista edita ]
         [ y pulpa el borrador ]
                │
                ▼
┌─────────────────────────────────┐
│   Endpoint POST: Finalize       │ ◄── Encola trabajo para Gotenberg (PDF Final).
└─────────────────────────────────┘
```

#### Cambios a realizar en el Código:
1. **Base de Datos:** Crear la tabla `clinical_notes_embeddings` para la búsqueda semántica e informes clínicos modelo.
2. **Modulo AI NestJS:** Crear `apps/api/src/ai/` con soporte para LangGraph.js y cliente de embeddings de OpenAI/Gemini.
3. **HITL:** La tabla `assessment_reports` gana el estado `status: 'DRAFT' | 'FINAL'`. La IA solo escribe `DRAFT`. El endpoint `/finalize` cambia el estado a `FINAL` tras la validación y edición interactiva del terapeuta.

---

## 💳 5. Flujo B2C, Vouchers y Monetización In-App

### 🛒 5.1 Google Play Billing en CotejoApp y Endpoint de Verificación
La monetización del informe B2C para alumnos particulares que no poseen voucher institucional se orquesta desde la app móvil, pero **la autoridad real del pago reside en tu backend**:

```
[ CotejoApp ] ─────────► (Inicia Google Play Billing Flow)
      │
      ▼
(Play Billing aprueba → Retorna purchaseToken)
      │
      ▼
[ CotejoApp ] ──► POST /payments/google-play/verify ──► [ NestJS API ]
                                                              │
                                                        (Google API Verify)
                                                              │
                                                              ▼
[ CotejoApp ] ◄── Unlocked & Dispara envío PDF ◄──── [ Marca PAID en DB ]
```

1.  **Fase Paywall:** Si el usuario no tiene voucher de canje al finalizar, la pantalla `ReportUnlockScreen` en `CotejoApp` abre un Paywall.
2.  **Verificación Server-Side (Obligatoria):** `CotejoApp` utiliza el SDK `billing-ktx` para procesar la transacción. Una vez que Google Play aprueba el pago local, la app **no desbloquea el informe directamente**. 
    *   Envía el `purchaseToken + productId + sessionId` a tu API: `POST /api/v1/payments/google-play/verify`.
    *   El backend NestJS verifica la compra con las APIs de desarrollo de Google Play Developer y recién ahí marca la sesión en la base de datos (Neon) como `PAID` y con derecho (*entitlement*) desbloqueado.
3.  **Canje de Vouchers:** La pantalla de paywall ofrece en paralelo el botón *"Tengo un Voucher Institucional"* para saltarse el pago validándolo contra tu base de datos de vouchers escolares B2B.

---

### 📱 5.2 Portal Estudiantil y Clínico Longitudinal (Retención)

*   **Historial Longitudinal:** En Terapia Ocupacional, medir la evolución es vital. El portal del paciente guardará el historial gráfico de sus pruebas realizadas a lo largo del tiempo.
*   **Panel Comparativo para Terapeutas:** El profesional podrá superponer las gráficas de consistencia, latencia y destrezas motrices/cognitivas de hace 6 meses con las actuales para **comprobar científicamente la efectividad del tratamiento de rehabilitación**.

---

## 📅 Plan de Acción Recomendado (Roadmap de Implementación)

### Fase 1: Cimientos de Robustez y Gotenberg (Q1)
- [ ] Extraer Puppeteer a un contenedor Docker de **Gotenberg** sidecar en Render.
- [ ] Configurar **BullMQ** asíncrono en un proceso worker independiente.

### Fase 2: Sincronización y Google Play Billing en CotejoApp (Q2)
- [ ] Implementar la librería **Google Play Billing** en `CotejoApp` reemplazando la simulación del delay.
- [ ] Construir el endpoint NestJS de verificación server-side: `POST /api/v1/payments/google-play/verify` conectando la API de Google Play Developer.
- [ ] Refactorizar la sincronización de `CotejoApp` con **WorkManager** para tolerar offline y subida diferida.

### Fase 3: Categoría Superior, IRT e IA RAG (Q3)
- [ ] Integrar el motor adaptativo (CAT) en NestJS con `@bdelab/jscat` e IRT para accesibilidad de discapacidades.
- [ ] Configurar el pipeline de IA **LangGraph con pgvector** para el borrador del reporte clínico (con revisión humana).

### Fase 4: Blindaje, RLS e Integración Escolar (Q4)
- [ ] Habilitar **Row-Level Security (RLS)** en Neon Postgres con composite indexes de rendimiento.
- [ ] Completar encriptación local Room con **SQLCipher** en `CotejoApp`.
- [ ] Construir la importación masiva escolar y el dashboard de analíticas de cohortes.

---
*¿Cómo ves la integración total del ecosistema ahora, che? ¿Vemos que CotejoApp es una maravilla de ingeniería y se complementa perfecto con el monorepo?*
