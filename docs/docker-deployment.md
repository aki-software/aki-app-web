# Despliegue con Docker

Este proyecto está configurado para un modelo robusto de despliegue mediante Docker utilizando imágenes construidas con arquitectura *multi-stage*, lo que permite reducir drásticamente el tamaño e incrementa la seguridad en los entornos de producción.

## Estructura del turborepo
Al tener una estructura monorepo gestionada por Turborepo y `pnpm`, las construcciones extraen estratégicamente solo lo que cada app (`api` o `web`) requiere de los paquetes compartidos usando el comando `turbo prune`.

---

## 1. Construir la Imagen del Backend (`apps/api`)

El backend expone el servidor NestJS en el puerto `3000`.

**Comando de construcción:**
Ejecuta el siguiente comando **desde la raíz** del repositorio:
```bash
docker build -f apps/api/Dockerfile -t akit-api .
```

**Comando de ejecución local:**
```bash
docker run -p 3000:3000 --env-file .env akit-api
```
*(Nota: Asegúrate de tener un `.env` configurado que defina las variables necesarias como las credenciales a PostgreSQL en Render u otro servicio).*

---

## 2. Construir la Imagen del Frontend (`apps/web`)

El frontend está expuesto por el servidor web integrado de la aplicación (e.g. servidor de Node JS, Nginx, etc., en base a Vite o NextJS) en el respectivo puerto configurado.

**Comando de construcción:**
Ejecuta el siguiente comando **desde la raíz** del repositorio:
```bash
docker build -f apps/web/Dockerfile -t akit-web .
```

**Comando de ejecución local (ejemplo si expusiera en puerto 80):**
```bash
docker run -p 8080:80 akit-web
```
*(Revisa y adapta el puerto publicado dependiendo si usas Nginx para assets estáticos u otra tecnología de servidor)*.
