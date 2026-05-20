# Single Source of Truth: Contratos (`packages/contracts`)

En arquitecturas cliente-servidor tradicionales, uno de los dolores de cabeza más comunes es la sincronización de modelos de datos. Si el equipo del backend cambia el nombre de una propiedad en una respuesta JSON, la aplicación cliente (ya sea web o móvil en Kotlin) se rompe en runtime sin previo aviso.

En **A.kit**, erradicamos este problema de raíz. El paquete de workspaces `packages/contracts` actúa como la **Única Fuente de la Verdad (Single Source of Truth - SSOT)** para todas las interfaces, enums y reglas de validación que fluyen entre el backend, el panel web y la aplicación móvil nativa.

---

## 🔄 El Pipeline de Generación de Código Trans-Lenguaje

En lugar de definir clases manualmente o depender de herramientas manuales de Swagger/OpenAPI, diseñamos un pipeline in-house ultra veloz que automatiza la transpilación de tipos de TypeScript/Zod a Data Classes de Kotlin listas para su consumo en **CotejoApp**.

```mermaid
graph TD
    subgraph 1. Monorepo (TS & Zod)
        ZodSrc["1. Definición Zod Schema<br/>(src/vouchers.ts)"]
        TypeInf["2. Inferencia de Tipos TS<br/>(type VoucherDto)"]
    end
    
    subgraph 2. Proceso de Exportación (JSON)
        Exporter["3. export-json-schemas.ts<br/>(zod-to-json-schema)"]
        JsonSchema["4. Archivos Schema .json<br/>(compatibles OpenAPI)"]
    end
    
    subgraph 3. Transpilación a Android
        Quicktype["5. generate-android-models.ts<br/>(quicktype-core)"]
        KotlinClasses["6. Kotlin Data Classes<br/>(@Serializable)"]
    end

    ZodSrc --> TypeInf
    ZodSrc --> Exporter
    Exporter -->|Genera| JsonSchema
    JsonSchema --> Quicktype
    Quicktype -->|Escribe directo a| KotlinClasses
    KotlinClasses -->|Importado en| CotejoApp["CotejoApp (Android App)"]
```

---

## 🛠️ Verificación y Detalle de los Scripts

El `package.json` de `@akit/contracts` cuenta con dos comandos robustos encargados de orquestar toda esta infraestructura de compilación de datos:

### 1. `pnpm run export:json`
* **Comando Real:** `tsx src/export-json-schemas.ts`
* **Cómo Funciona:** Utiliza `tsx` (TypeScript Execute) para correr en caliente el script de Node. Este script toma los esquemas de validación de **Zod** (`^3.24.1`) declarados en la carpeta `src/`, procesa sus validaciones internas (longitudes, patrones regex, obligatoriedad) y los convierte a especificaciones JSON Schema estándar utilizando `zod-to-json-schema`. Los esquemas JSON resultantes se guardan localmente en formato intermedio.

### 2. `pnpm run generate:android`
* **Comando Real:** `pnpm run export:json && tsx src/generate-android-models.ts`
* **Cómo Funciona:** Este es el comando definitivo. Primero corre la exportación a JSON. Luego ejecuta `src/generate-android-models.ts`, el cual inicializa programáticamente la API de **`quicktype-core`** (`^23.2.6`). Quicktype consume los JSON Schemas, resuelve las referencias circulares de datos e inyecta sintaxis nativa de Kotlin. Configura de forma automática:
  - Anotaciones `@Serializable` de la librería oficial **`kotlinx.serialization`**.
  - Tipos nulos y no nulos según la validación de Zod (ej. `z.string().nullable()` se transpila a `String?`).
  - Escritura directa sobre la ruta física de la app móvil: `c:\Dev\Personal\A.kit\CotejoApp\app\src\main\java\com\akit\app\contracts\`.

---

## 📝 Ejemplo Práctico de Definición Trans-Lenguaje

A continuación se muestra un ejemplo real de cómo se define un esquema de sesión vocacional y cómo se ve su equivalente autotranspilado en Kotlin.

### Definición en TypeScript con Zod (`packages/contracts/src/session.ts`):

```typescript
import { z } from 'zod';

// Esquema de validación en runtime y transpilación
export const VoucherValidationSchema = z.object({
  code: z.string().min(8).max(12),
  isActive: z.boolean(),
  expirationDate: z.string().datetime(),
  maxRedemptions: z.number().int().positive(),
  institutionId: z.string().uuid().nullable()
});

// Inferencia para tipado estático en NestJS y React
export type VoucherValidationDto = z.infer<typeof VoucherValidationSchema>;
```

### Clase de Kotlin Autogenerada en Android (`CotejoApp/.../contracts/VoucherValidationDto.kt`):

```kotlin
// ARCHIVO AUTOGENERADO POR QUICKTYPE - NO MODIFICAR MANUALMENTE
package com.akit.app.contracts

import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class VoucherValidationDto (
    @SerialName("code")
    val code: String,

    @SerialName("isActive")
    val isActive: Boolean,

    @SerialName("expirationDate")
    val expirationDate: String,

    @SerialName("maxRedemptions")
    val maxRedemptions: Long,

    @SerialName("institutionId")
    val institutionId: String? = null // Zod nullable mapeado a tipo opcional en Kotlin
)
```

---

## 🚀 Tutorial: Agregando un nuevo DTO al Ecosistema

Para agregar una nueva estructura de datos (ej. un nuevo Request de creación de sesión) seguí estos sencillos pasos:

1. **Creá o editá un archivo en `packages/contracts/src/`** (ej. `sessions.ts`).
2. **Definí y exportá tu validador Zod** (obligatorio para que la API de NestJS pueda usarlo para validación en runtime):
   ```typescript
   export const StartSessionSchema = z.object({
     voucherCode: z.string(),
     deviceUuid: z.string(),
   });
   ```
3. **Exportá el tipo estático de TS para el Front/Back:**
   ```typescript
   export type StartSessionDto = z.infer<typeof StartSessionSchema>;
   ```
4. **Agregá la exportación en el índice principal** (`src/index.ts`):
   ```typescript
   export * from './sessions';
   ```
5. **Ejecutá el compilador desde la raíz del monorepo:**
   ```bash
   # Posicionado en akit-platform/
   pnpm --filter @akit/contracts run generate:android
   ```
6. **¡Listo!** Tu clase `StartSessionDto` ya fue inyectada automáticamente en la aplicación Android en Kotlin y está lista para ser consumida con Retrofit, mientras que tu backend NestJS y tu panel web en React ya disponen de las nuevas validaciones estáticas.
