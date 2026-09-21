# Runbook de base de datos

## Objetivo

Diagnosticar migraciones, índices, conexiones y degradación de PostgreSQL sin ejecutar cambios destructivos.

## Reglas

- Las migraciones aplicadas son históricas y no se editan.
- Toda corrección de esquema se implementa como una migración nueva.
- Las consultas de diagnóstico deben ser read-only salvo aprobación explícita.
- Backup, restore, RPO y RTO deben probarse y registrarse, no asumirse.
- Los datos de QA deben documentarse con fecha y entorno.

## Primera revisión ante incidente

1. Confirmar entorno y cadena de conexión.
2. Revisar estado de migraciones.
3. Revisar conexiones activas y bloqueos.
4. Revisar índices y estadísticas.
5. Capturar el plan de la consulta afectada.
6. Documentar impacto antes de cambiar esquema o configuración.

## Riesgos conocidos

- Hay migraciones con timestamp repetido.
- Hay índices únicos duplicados.
- Hay timestamps sin zona horaria.
- El `statement_timeout` efectivo debe verificarse.
- La configuración TLS efectiva debe verificarse.
