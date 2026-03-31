# COTEJO APP - ARCHITECTURE & BACKEND BLUEPRINT

## 1. Contexto del Proyecto
**CotejoApp** es una aplicación móvil nativa (Android, Jetpack Compose, Kotlin) diseñada para realizar evaluaciones vocacionales interactivas mediante una mecánica de "Swiping" (Like/Dislike sobre tarjetas).
El objetivo es construir un Backend desde cero en un repositorio separado (Polyrepo) que sirva como fuente de verdad, motor de evaluación y capa de persistencia para la aplicación móvil.

---

## 2. Reglas Globales (Inmutables)
Cualquier desarrollador o AI Agent que trabaje en la inicialización o desarrollo de este backend **debe** adherirse estrictamente a estas políticas de la Arquitectura y del Tech Lead:

1. **Stack Tecnológico:**
   - Gestor de Paquetes: **`pnpm`** (si se usa Node/TS) o **`uv`** (si se usa Python). ESTRICTAMENTE PROHIBIDO usar `npm`, `yarn` o invocaciones directas a `pip`.
   - Base de Datos relacional: **PostgreSQL**.
2. **Estilo Arquitectónico:**
   - La arquitectura debe ser **Clean Architecture** y seguir principios de **Domain-Driven Design (DDD)**.
   - El código debe separarse rigurosamente en capas: `domain`, `application`, `infrastructure`, `presentation` (o equivalentes conceptuales fuertes).
   - El Dominio no debe conocer de frameworks web ni de bases de datos.
3. **Calidad y Seguridad:**
   - Tipado estricto habilitado (TypeScript Strict Mode o Python Type Hints con MyPy/Ruff).
   - **Zero Hardcoded Secrets**: Cualquier variable de entorno o string de conexión a DB debe inyectarse vía `.env`.
   - Incluir control global de excepciones y validación estricta de DTOs (Data Transfer Objects) en la entrada de las APIs.

---

## 3. Casos de Uso Principales (El MVP)

A nivel funcional, el backend debe proporcionar APIs RESTful (JSON) que la aplicación Android consumirá para lo siguiente:

### A. Gestión de Onboarding & Usuarios
*   **Entidad de Dominio:** `User`
*   **Objetivo:** Persistir el perfil básico de un usuario cuando abre la app por primera vez.
*   **Endpoints requeridos:**
    *   `POST /api/v1/users/register`: Recibir nombre y rol (ej: "estudiante"). En esta etapa MVP, generar un token o UUID anónimo vinculado al dispositivo.

### B. Motor del Test Vocacional ("Swiping Arena")
*   **Entidades de Dominio:** `OccupationalCard`, `Category`, `TestSession`, `Swipe`
*   **Objetivo:** Centralizar el contenido de las tarjetas en el servidor y registrar las respuestas.
*   **Endpoints requeridos:**
    *   `GET /api/v1/tests/cards`: Devolver la lista completa y barajada de tarjetas ocupacionales.
    *   `POST /api/v1/tests/sessions`: Crear el registro de que un `User` inició un test.
    *   `POST /api/v1/tests/sessions/{sessionId}/swipes`: Registrar un lote de respuestas (id_tarjeta, LIKE/DISLIKE, timestamp).

### C. Sistema de Resultados y Recomendación (Engine)
*   **Entidades de Dominio:** `VocationalResult`, `CareerRecommendation`, `MaterialTeorico`
*   **Objetivo:** Procesar los "Swipes", calcular y devolver el perfil vocacional del usuario.
*   **Endpoints requeridos:**
    *   `POST /api/v1/results/calculate`: Recibe o procesa la sesión finalizada. Ejecuta el algoritmo que retorna: Porcentajes de afinidad por categorías (Radar Chart), Top 3, Bottom 3 y listado de carreras/competencias sugeridas (Carreras Universitarias y Terciarias).
    *   `GET /api/v1/material-teorico/{categoryId}`: Obtiene el marco teórico exhaustivo de una categoría específica para el panel informativo de la app.

### D. Mejora Continua (Feedback)
*   **Entidad de Dominio:** `UserFeedback`
*   **Objetivo:** Recibir la puntuación y opinión sobre la aplicación.
*   **Endpoints requeridos:**
    *   `POST /api/v1/feedback`: Guardar rating (1-5 estrellas) y un comentario opcional enviado por el usuario al terminar.

---

## 4. Primeras Tareas Esperadas del Agente Backend
Cuando el Agente de IA asuma este rol en el nuevo repositorio, sus primeros entregables deberán ser:
1.  **Inicialización:** Ejecutar `nest new / fastapi` usando el gestor de paquetes definido (`pnpm` o `uv`).
2.  **Estructura Base:** Armar las carpetas según Clean Architecture.
3.  **Dockerización Local:** Entregar un `docker-compose.yml` que levante una instancia de PostgreSQL en el puerto 5432 con las credenciales locales de desarrollo.
4.  **Modelado y Migraciones:** Configurar el ORM elegido (Prisma, TypeORM o SQLAlchemy) armando los esquemas SQL para los casos de uso definidos y crear la primera migración o script de Seeders para inyectar las `OccupationalCard` fundacionales.

---

## 5. Referencia de Persistencia y Esquema
Para el estado real de persistencia detectado en el código, las brechas de datos actuales y la propuesta de esquema de base de datos recomendada, ver:

- `docs/backend/PERSISTENCIA_Y_ESQUEMA_BD.md`
