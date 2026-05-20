# Scripts y Automatización de Desarrollo

El ecosistema **A.kit** está compuesto por múltiples aplicaciones, servicios backend y paquetes compartidos. Para no ahogar al desarrollador en una maraña de terminales, centralizamos todos los comandos críticos mediante **Turborepo** y scripts de orquestación.

---

## 🚀 1. Arranque Global (Turborepo)

El monorepo está orquestado con `turbo`, lo que nos permite aprovechar la ejecución paralela y el cacheo agresivo de builds. 

Para levantar absolutamente todo el ecosistema (API, Panel Web y Sitio Público) al unísono, basta con correr en la raíz:

```bash
pnpm dev
```

Este comando dispara el script `dev` declarado en el `package.json` raíz (`turbo run dev`), que a su vez se propaga a todas las apps del workspace respetando su grafo de dependencias (por ejemplo, compilando primero `@akit/contracts` si fuera necesario).

---

## 🎯 2. Arranque Específico por Aplicación

A menudo no necesitás tener la RAM de tu computadora colapsada levantando aplicaciones que no vas a editar. Podés ejecutar scripts individuales mapeados en la raíz para aislar tu entorno de desarrollo:

| Comando Global | Comando Subyacente (`pnpm --filter`) | ¿Qué levanta? |
| :--- | :--- | :--- |
| `pnpm dev:api` | `pnpm --filter api dev` | Levanta **exclusivamente** el servidor NestJS (Backend) en el puerto `3000`. |
| `pnpm dev:web` | `pnpm --filter web dev` | Levanta **exclusivamente** el panel administrativo en React (Vite) en el puerto `5173`. |
| `pnpm dev:site` | `pnpm --filter @akit/site dev` | Levanta **exclusivamente** la landing page pública (Astro) en el puerto `4321`. |
| `pnpm dev:marketing` | `turbo run dev --filter=@akit/site --filter=web` | Levanta el conjunto de los clientes frontales sin el backend. |

---

## 🗄️ 3. Inicialización de la Base de Datos

La base de datos relacional de PostgreSQL (ya sea en Docker local o en Neon Serverless) necesita crear sus tablas mediante migraciones y poblarse de datos iniciales.

Contamos con dos scripts en la carpeta raíz `scripts/` que encapsulan los comandos internos de TypeORM:

* **En entornos Linux / macOS (Bash):**
  ```bash
  ./scripts/bootstrap-db.sh
  ```
* **En entornos Windows (PowerShell):**
  ```powershell
  ./scripts/bootstrap-db.ps1
  ```

Ambos scripts se encargan automáticamente de navegar hacia `apps/api` y ejecutar el comando `pnpm run db:bootstrap`, el cual está compuesto por la ejecución de migraciones (`migration:run`) y la siembra de usuarios, colegios y tipologías Holland (`seed:base`).

---

## 🧹 4. Calidad y Pipeline CI

Las herramientas de control de calidad también se centralizan en la raíz. Previo a subir un Pull Request, podés validar el monorepo completo con Turborepo:

* `pnpm run lint`: Corre ESLint y herramientas de estilo a través de todos los paquetes afectados.
* `pnpm run build`: Valida que el tipado de TypeScript sea correcto y genera los artefactos de distribución listos para producción.
* `pnpm run test`: Lanza en paralelo Jest (para la API) y Vitest (para el frontend web) consolidando los resultados.
