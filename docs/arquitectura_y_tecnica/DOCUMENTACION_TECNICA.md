# Documentación Técnica Global de A.kit & CotejoApp

## 1. Visión General
**A.kit Platform** y **CotejoApp** conforman un ecosistema de software destinado a la evaluación vocacional y gestión de pacientes y terapeutas. La arquitectura se basa en modernos estándares de desarrollo, enfocándose en escalabilidad, seguridad y una clara separación de responsabilidades usando Clean Architecture y Domain-Driven Design (DDD).

## 2. Stack Tecnológico

### Backend (A.kit API)
* **Framework:** NestJS
* **Lenguaje:** TypeScript (Strict Mode)
* **Runtime:** Node.js
* **Package Manager:** `pnpm`
* **Base de Datos:** PostgreSQL
* **ORM:** Prisma / TypeORM (Según definición final de infraestructura)

### Frontend (A.kit Web - Dashboard)
* **Librería/Framework:** React + Vite
* **Lenguaje:** TypeScript
* **Package Manager:** `pnpm`
* **Styling:** CSS Modules / Styled-Components (Aproximación moderna sin framework pesado de CSS por defecto, salvo definición)

### Mobile (CotejoApp)
* **OS:** Android Nativo
* **Lenguaje:** Kotlin
* **UI Toolkit:** Jetpack Compose
* **Arquitectura Interna:** MVVM / Clean Architecture (Domain, Data, Presentation)

## 3. Principios Arquitectónicos Inmutables (Tech Lead / Arquitecto Senior)

1. **Gestión de Paquetes Unificada:**
   - Todo módulo en ecosistema JS/TS utilizará obligatoriamente `pnpm` (Workspace).
   - Aplicaciones nativas utilizan sus respectivos gestores (`gradle` para Android).

2. **Domain-Driven Design (DDD) y Clean Architecture:**
   - **Independencia del Framework:** Las reglas de negocio (Dominio) no conocen sobre HTTP, NestJS o React.
   - **Testabilidad:** Toda lógica core es testeable en aislamiento.
   - **Capas:** Domain (Entidades/Reglas), Application (Casos de uso), Infrastructure (DB, APIs externas), Interface/Presentation (Controladores, Resolvers).

3. **Seguridad "Zero Hardcoded Secrets":**
   - Ninguna credencial de servicios, tokens, ni strings de conexión reside en el código, todos provienen estrictamente de variables de entorno `.env`.

4. **Reglas de Base de Datos y Persistencia:**
   - La Single Source of Truth es la API Backend (Base de Datos PostgreSQL).
   - Mobile persistirá datos con estrategia Offline-First usando Room DB integrando WorkManager para sync, solo donde sea requerido (Ej. Respuestas del Swipe offline transitorias).

## 4. Repositorios y Monorepo
* La capa web y API están organizadas en un esquema de **Monorepo** bajo la carpeta `akit-platform/` usando `pnpm workspace` y (potencialmente) Turborepo para gestión centralizada de dependencias y scripts.
* La app móvil nativa, **CotejoApp**, se compila y maneja a través de su propio entorno Gradle.

## 5. Documentos Técnicos Clave
* Persistencia actual, brechas de captura de datos y esquema recomendado de base de datos: `docs/backend/PERSISTENCIA_Y_ESQUEMA_BD.md`
