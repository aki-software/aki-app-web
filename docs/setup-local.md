# Setup del Entorno Local (akit-platform)

¡Bienvenido al entorno de desarrollo de A.kit! En esta guía vas a encontrar toda la información necesaria para configurar, levantar y dejar corriendo todo el ecosistema de la plataforma en tu máquina local. Prestale atención a cada sección, porque un buen entorno local es la base de un desarrollo sólido.

---

## 🛠️ Prerrequisitos Obligatorios

Antes de clonar e intentar levantar el proyecto, asegurate de tener instaladas las siguientes herramientas en sus versiones correctas:

1. **Node.js**: Versión **v20 o superior** (LTS recomendada).
2. **pnpm**: Nuestro gestor de paquetes de preferencia, en versión **v8 o superior** (si no lo tenés, corré `npm install -g pnpm`).
3. **Docker & Docker Compose**: Indispensable para no tener que instalar bases de datos ni servicios de mensajería de forma global. Asegurate de que el demonio de Docker esté corriendo.

---

## 🐳 1. Levantar la Infraestructura Base (Docker Compose)

El backend NestJS depende de bases de datos relacionales, colas de mensajería asíncronas y servidores de correo de prueba. Todo esto está empaquetado en un archivo `docker-compose.yml` dentro de la carpeta `infra/docker`.

### Pasos para iniciar los servicios:

1. Abrí tu terminal favorita y navegá hasta el directorio de infraestructura:
   ```bash
   cd akit-platform/infra/docker
   ```
2. Levantá los contenedores en segundo plano (detached mode):
   ```bash
   docker compose up -d
   ```
   *(Nota: Si tenés una versión antigua de Docker, es posible que debas usar `docker-compose up -d`, pero te recomendamos actualizar).*

### 📋 Servicios Levantados y Puertos Expuestos

| Servicio | Tecnología | Puerto Local | Propósito en el Ecosistema |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | Postgres 15-alpine | `5432` | Base de datos relacional principal para persistencia de usuarios, sesiones, categorías y auditorías. |
| **Redis** | Redis 7-alpine | `6379` | Broker de mensajería y persistencia en memoria para la cola de workers asíncronos administrada por **BullMQ**. |
| **MailHog** | SMTP Mail Catcher | `1025` (SMTP)<br>`8025` (Web UI) | Captura y previsualiza correos electrónicos salientes en desarrollo local sin enviar e-mails reales. Podés ver la bandeja en `http://localhost:8025`. |
| **pgAdmin 4** | PostgreSQL Admin UI | `5050` | Interfaz gráfica web para administrar y ver la base de datos de Postgres. Accedé mediante `http://localhost:5050` (Email: `admin@akit.com` / Clave: `admin123`). |

---

## 🔑 2. Configuración de Variables de Entorno (`.env`)

Cada aplicación e infraestructura necesita configuraciones específicas. En la raíz de `apps/api/` y en `infra/docker/` tenés archivos `.env.example`.

### Configuración del Monorepo

Copiá el archivo de configuración en `apps/api/` (que es el que se conecta directamente a los recursos levantados en Docker):

```bash
cd akit-platform/apps/api
cp .env.example .env
```

Abrí el archivo `.env` que acabás de crear y verificá que las credenciales apunten de manera precisa a los servicios de Docker:

```env
# Configuración del servidor de la API
PORT=3000
NODE_ENV=development

# Conexión a la Base de Datos (PostgreSQL)
# Formato: postgresql://[usuario]:[clave]@[host]:[puerto]/[nombre_db]
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/akit"

# Conexión a la cola (Redis)
REDIS_URL="redis://localhost:6379"

# Configuración del servidor SMTP (MailHog local)
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="no-reply@akit.com"

# AWS S3 (Para subida de PDFs en desarrollo se puede usar LocalStack o mockear las credenciales)
AWS_ACCESS_KEY_ID="mock_access_key"
AWS_SECRET_ACCESS_KEY="mock_secret_key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="akit-vouchers-dev"
```

---

## 📦 3. Instalación de Dependencias

Volvé a la raíz del monorepo (`akit-platform/`) y ejecutá la instalación de pnpm. Esto instalará y linkeará de manera interna todas las aplicaciones y paquetes del workspace (`apps/api`, `apps/web`, `apps/site`, `packages/contracts`, `packages/design-tokens`):

```bash
cd ../../
pnpm install
```

---

## 🗄️ 4. Inicializar y Poblar la Base de Datos (TypeORM Bootstrap)

> [!WARNING]
> **Ojo con esto:** El proyecto **NO** utiliza Prisma. Toda la persistencia y migraciones están desarrolladas sobre **TypeORM** utilizando PostgreSQL. No utilices comandos de Prisma ya que no están configurados en el proyecto.

Tenemos un pipeline automatizado de base de datos. Para correr las migraciones (crear las tablas) y poblar los datos semilla iniciales de forma directa, podés correr nuestro script de bootstrap.

### Método 1: Usando los scripts de desarrollo centralizados (Recomendado)
Desde la raíz del monorepo, ejecutá el script según tu sistema operativo:

* **En macOS/Linux (Bash):**
  ```bash
  ./scripts/bootstrap-db.sh
  ```
* **En Windows (PowerShell):**
  ```powershell
  ./scripts/bootstrap-db.ps1
  ```

### Método 2: Manualmente usando comandos de pnpm
Si preferís hacerlo de manera manual o querés entender qué pasa por detrás:

```bash
# Navegar a la app de la API
cd apps/api

# Ejecutar las migraciones pendientes y poblar las tablas semilla
pnpm run db:bootstrap
```

El script `db:bootstrap` ejecutará los siguientes comandos secuenciales:
1. `pnpm migration:run`: Corre las migraciones de TypeORM compiladas en la carpeta `dist/`.
2. `pnpm seed:base`: Levanta el inicializador de semillas que inserta los usuarios de administración (`admin-seed.js`), las instituciones iniciales (`institution-seed.js`) y las combinaciones complejas del Holland Code (`tres-areas-combinations-seed.js`).

Si en algún momento metés la pata y querés reiniciar la base de datos a cero absoluto:
```bash
pnpm run db:reset
```
*Este comando borra todas las tablas (schema:drop), vuelve a correr las migraciones y vuelve a insertar las semillas.*

---

## 🚀 5. Ejecución del Entorno de Desarrollo

Gracias al uso de **Turborepo**, no necesitás abrir tres terminales diferentes para levantar los servicios. Con un solo comando en la raíz del monorepo, Turborepo analiza las dependencias internas y levanta en paralelo todas las aplicaciones de desarrollo con Hot Module Replacement (HMR):

```bash
# Desde la raíz del monorepo
pnpm dev
```

Esto levantará los siguientes servicios locales de forma simultánea:
* 🔙 **API Backend (NestJS)**: `http://localhost:3000` (Conexiones REST prontas para responder).
* 🎨 **Admin Web Dashboard (React + Vite)**: `http://localhost:5173` (Panel administrativo con Tailwind v4).
* 🌐 **Landing Page Pública (Astro)**: `http://localhost:4321` (Sitio web estático).

### 🛠️ ¿Querés levantar solo un servicio individual?
Si estás corto de recursos de hardware o simplemente estás enfocado únicamente en un componente, podés usar los scripts específicos mapeados en la raíz:

```bash
pnpm dev:api    # Levanta únicamente la API NestJS
pnpm dev:web    # Levanta únicamente el panel administrativo React
pnpm dev:site   # Levanta únicamente la landing page Astro
```

---

## 📱 6. Conexión de CotejoApp (Android) con tu API Local

Uno de los mayores dolores de cabeza en el desarrollo mobile es conectar el emulador o un celular físico al servidor NestJS que corre localmente en tu computadora. En A.kit resolvimos esto de manera elegante.

El proyecto de Android `CotejoApp` cuenta con un helper en gradle que detecta automáticamente tu IP local en la red e inyecta la URL de conexión de forma dinámica en la variante de `debug`.

1. Asegurate de que tu computadora y tu celular de pruebas estén conectados a la **misma red Wi-Fi**. (Si usás el emulador oficial de Android Studio, se conecta mediante la IP loopback del emulador: `10.0.2.2`).
2. En el proyecto `CotejoApp`, ejecutá el comando de Gradle de depuración para validar qué IP está detectando el sistema:
   ```bash
   # En el directorio CotejoApp/
   ./gradlew debugBuildInfo
   ```
3. Al compilar la app en variante `debug`, la constante de red `BACKEND_BASE_URL` apuntará automáticamente al puerto `3000` de esa IP local (ej. `http://192.168.1.15:3000`), permitiendo pruebas en vivo inmediatas con tu backend local.
