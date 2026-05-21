# Estrategia de Documentación de API (Swagger / OpenAPI)

Una API profesional (y más aún un ecosistema B2B/B2C como A.kit) requiere tener sus contratos HTTP perfectamente documentados en formato OpenAPI (conocido históricamente como Swagger).

Normalmente, los tutoriales estándar de NestJS enseñan a lograr esto llenando los DTOs de decoradores (`@ApiProperty()`, `@ApiQuery()`), lo cual contamina visualmente el código. 

En **A.kit**, nosotros implementamos una regla arquitectónica superior: **Single Source of Truth (SSOT)** basado en Zod.

---

## 🚫 El Anti-patrón Clásico (A Evitar)

Si instaláramos el módulo de NestJS oficial para Swagger de la manera tradicional, tendríamos que duplicar código obligatoriamente. 

Observá esta redundancia arquitectónica (Deuda Técnica):

```typescript
// ❌ ESTO ESTÁ PROHIBIDO EN ESTE PROYECTO ❌

// 1. Zod (SSOT para React y Android)
export const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2)
});

// 2. Duplicación en NestJS para Swagger y class-validator
export class CreateUserDto {
  @ApiProperty({ description: 'Correo del usuario', example: 'dev@akit.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Nombre completo', minLength: 2 })
  @IsString()
  @MinLength(2)
  name: string;
}
```
Si mañana la validación de `email` cambia o se le añade una regla estricta en el paquete `contracts`, el desarrollador podría olvidarse de actualizar los decoradores `@ApiProperty` en la API, resultando en que la documentación pública de Swagger mienta sobre el verdadero comportamiento de la red.

---

## ✅ La Estrategia A.kit (Zod to OpenAPI)

Para mantener a `@akit/contracts` como la única fuente inmutable de la verdad, implementamos un puente dinámico generativo utilizando **`nestjs-zod`** (o equivalente).

### El Flujo de Autogeneración

1. **Mantener Zod intacto:** Escribimos la validación estricta y los ejemplos (`.openapi()`) directamente en el esquema Zod dentro de `packages/contracts/src`.
2. **Puente en tiempo de compilación:** NestJS consume ese mismo esquema de Zod en sus controladores, tanto para validar la request entrante (mediante un `ZodValidationPipe`) como para generar la página web interactiva de Swagger.

### Ejemplo de Implementación Correcta

```typescript
// 1. En packages/contracts/src/users.ts
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const CreateUserSchema = z.object({
  email: z.string().email().openapi({
    description: 'Correo electrónico válido',
    example: 'dev@akit.com',
  }),
  name: z.string().min(2).openapi({
    description: 'Nombre completo del usuario',
  }),
});
```

```typescript
// 2. En apps/api/src/users/users.controller.ts
import { Body, Controller, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe, createZodDto } from 'nestjs-zod';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { CreateUserSchema } from '@akit/contracts';

// Puente mágico: Crea un DTO de Nest compatible con Swagger SIN decoradores manuales
class CreateUserDto extends createZodDto(CreateUserSchema) {}

@Controller('users')
export class UsersController {
  
  @Post()
  @UsePipes(new ZodValidationPipe(CreateUserSchema))
  @ApiOperation({ summary: 'Crea un nuevo usuario en A.kit' })
  @ApiCreatedResponse({ type: CreateUserDto })
  async create(@Body() dto: CreateUserDto) {
    return { success: true, email: dto.email };
  }
}
```

### Resultados

1. Cero duplicación de reglas de validación.
2. Zod gobierna de forma suprema el frontend (React), la transpilación nativa (Kotlin) y el backend (NestJS).
3. El documento de Swagger alojado en `http://localhost:3000/api/docs` renderiza los campos y ejemplos automáticamente, derivándolos desde el esquema de validación maestro de contratos.
