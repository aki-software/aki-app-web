# Runbook: Backups de Base de Datos

## Arquitectura de Respaldo

La base de datos de producción (Neon PostgreSQL) cuenta con un sistema de backup diario automatizado a través de GitHub Actions. 
Este esquema nos permite sortear la limitación de la capa gratuita de Neon (que solo tiene 24hs de Point-in-Time Restore) garantizando retención a largo plazo.

### Componentes
1. **GitHub Actions (`.github/workflows/db-backup.yml`)**: Un cron job que se ejecuta todos los días a las 3:00 AM UTC.
2. **PostgreSQL Client (`pg_dump`)**: Herramienta utilizada por el runner para volcar la estructura y los datos. El volcado se comprime en formato `.sql.gz`.
3. **Cloudflare R2**: Bucket de almacenamiento (`akit-db-backups`) configurado con compatibilidad S3.

## Configuración y Secretos

El pipeline depende de 3 secretos en el repositorio:
- `DATABASE_URL`: Cadena de conexión de PostgreSQL (Producción).
- `R2_ACCESS_KEY_ID`: Token de lectura/escritura de Cloudflare R2.
- `R2_SECRET_ACCESS_KEY`: Clave secreta del token de Cloudflare R2.

### Rotación y Limpieza
El bucket de Cloudflare R2 debe tener configurada una **Object Lifecycle Rule** (Regla de ciclo de vida) que expire/elimine automáticamente los objetos que superen cierta antigüedad (ej: 15 días). Esto asegura que el bucket nunca consuma más almacenamiento del estrictamente necesario.

## Proceso de Restauración (Disaster Recovery)

Si se requiere recuperar la base de datos a partir de un backup:

1. **Descargar el backup:** Descargar el archivo `.sql.gz` correspondiente desde el panel de Cloudflare R2.
2. **Descomprimir:** 
   ```bash
   gunzip backup_prod_YYYY-MM-DD.sql.gz
   ```
3. **Restaurar (CUIDADO):** Utilizar `psql` para insertar los datos en la base de datos de destino.
   ```bash
   psql "postgres://usuario:contraseña@servidor:5432/nombre_base" < backup_prod_YYYY-MM-DD.sql
   ```
   *ADVERTENCIA:* Dependiendo del estado de la base de datos de destino, puede ser necesario hacer un `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` antes de inyectar el volcado para evitar conflictos de llaves foráneas y duplicidad.

