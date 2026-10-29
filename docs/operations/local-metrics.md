# Métricas locales de la API

Esta instrumentación es un piloto local de T05–T07. No exporta datos ni habilita un endpoint público en el puerto de la API.

## Dashboard desechable

Requiere Docker Compose. Este perfil levanta PostgreSQL y Redis efímeros con volúmenes propios; no lee `infra/docker/.env`, ni comparte bases, colas o credenciales del entorno habitual. Desde la raíz del repositorio, valide la configuración:

```powershell
docker compose --env-file infra/docker/.env.example -f infra/docker/docker-compose.observability.yml --profile observability config --quiet
```

Inicie el stack aislado:

```powershell
docker compose --env-file infra/docker/.env.example -f infra/docker/docker-compose.observability.yml --profile observability up -d --build
```

La primera ejecución construye la API y puede descargar imágenes y dependencias públicas. El contenedor API consulta una base de datos local vacía; no use este stack para pruebas de negocio que requieran migraciones o datos existentes. S3 usa valores de placeholder con un dominio `.invalid` y no tiene almacenamiento real detrás. Las contraseñas son valores locales de desarrollo y pueden cambiarse con variables `LOCAL_OBSERVABILITY_POSTGRES_*`; nunca las reutilice en QA o producción.

| Servicio | URL local |
|---|---|
| API | Sin puerto publicado; readiness se valida desde el contenedor |
| Prometheus y alertas | `http://127.0.0.1:9090` |
| Grafana (solo Viewer) | `http://127.0.0.1:3001` |
| Métricas API | Solo red interna Docker, `observability-api:9464/metrics` |
| PostgreSQL / Redis | Solo red interna Docker; no publican puertos del host |

Solo Prometheus y Grafana publican puertos, ambos ligados a loopback. API, PostgreSQL y Redis solo usan `observability`, marcada `internal: true`; Prometheus se conecta además a la red `observability-ui` para habilitar la interfaz local y hacer scraping por la red privada. No hay configuración de remote-write ni de notificaciones externas. El puerto 9464 no se publica. Grafana permite acceso anónimo de solo lectura porque es una herramienta desechable local; no reutilice esta configuración en QA o producción.

Genere tráfico sintético y revise el dashboard `A.kit Local Observability` en Grafana. Compruebe readiness, scrape y alertas:

```powershell
Invoke-WebRequest 'http://127.0.0.1:9090/targets'
Invoke-WebRequest 'http://127.0.0.1:9090/alerts'
docker compose --env-file infra/docker/.env.example -f infra/docker/docker-compose.observability.yml --profile observability exec -T observability-api node -e "fetch('http://127.0.0.1:3000/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"
```

Para detener y quitar únicamente los servicios de observabilidad sin detener PostgreSQL/Redis compartidos ni borrar datos:

```powershell
docker compose --env-file infra/docker/.env.example -f infra/docker/docker-compose.observability.yml --profile observability down
```

`down` quita los contenedores y la red, pero conserva los volúmenes. No use `down -v` salvo que quiera borrar la base, la serie temporal y los datos de Grafana de este perfil. Las reglas no envían notificaciones y sus umbrales son heurísticos para desarrollo, no SLOs de producción.

| Alerta | Umbral | Respuesta inicial |
|---|---|---|
| `AkitApiMetricsUnavailable` | scrape fallido durante 2 min | Revisar `docker compose logs observability-api` y readiness. |
| `AkitApiHigh5xxRate` | >5% durante 5 min | Revisar logs y reproducir con datos sintéticos. |
| `AkitApiHighP95Latency` | p95 >2.5 s durante 5 min | Revisar probes de PostgreSQL/Redis y logs antes de cambiar límites. |
| `AkitPostgresProbeDown`, `AkitRedisUnavailable` | probe fallido durante 2 min | Confirmar salud del servicio local; no borrar volúmenes como primer paso. |
| `AkitQueueReadFailed` | muestra de cola fallida durante 2 min | `queue_up=0` invalida conteos muestreados; recuperar el acceso antes de interpretar backlog. |
| `AkitQueueOldestJobTooOld` | job en espera >5 min durante 5 min | Identificar la cola y revisar logs del worker; no purgar jobs primero. |
| `AkitQueueHasFailedJobs` | jobs fallidos >0 durante 10 min | Inspeccionar diagnóstico seguro e idempotencia antes de reintentar. |

Las métricas HTTP usan método, plantilla de ruta y estado; las de dominio usan enums. No agregue IDs, correos, URLs completas, query strings, tokens ni payloads. Las pruebas unitarias verifican que rutas desconocidas no filtren URLs y que errores de sondeo marquen dependencias como no saludables sin propagar fallos de telemetría al tráfico de negocio.

## Activación

Configure `ENABLE_LOCAL_METRICS=true` en el entorno de la API. Opcionalmente, configure `LOCAL_METRICS_PORT=9464`. Reinicie la API y consulte:

```powershell
(Invoke-WebRequest -Uri 'http://127.0.0.1:9464/metrics').Content
```

El servidor de métricas escucha únicamente en `127.0.0.1` y no se inicia si `NODE_ENV=production`. No abra este puerto en Docker ni lo publique mediante un proxy. Desactive el piloto eliminando `ENABLE_LOCAL_METRICS` o estableciéndolo en `false`.

## Señales

- `akit_http_requests_total` y `akit_http_request_duration_seconds`: método, plantilla de ruta registrada y código HTTP. Las rutas no reconocidas se agrupan como `unmatched`; nunca se etiqueta con la URL recibida.
- Métricas predeterminadas `akit_process_*` y `akit_nodejs_*`: proceso y runtime Node.
- `akit_postgres_up`, `akit_postgres_connections` y `akit_postgres_probe_duration_seconds`: consulta de solo lectura a `pg_stat_database` para la base actual, con duración del sondeo. La conexión es una cifra de la base, no el tamaño del pool de TypeORM.
- `akit_redis_up`, `akit_queue_enabled`, `akit_queue_up`, `akit_queue_waiting`, `akit_queue_active`, `akit_queue_delayed`, `akit_queue_failed` y `akit_queue_oldest_waiting_age_seconds`: estado de las colas conocidas. La edad usa el primer job en espera, no un recorrido completo de la cola. Cuando BullMQ está deshabilitado, `queue_enabled=0`; no interprete `redis_up=0` como incidente de Redis en ese modo.
- `akit_heartbeat_timestamp_seconds`: momento de la última recolección local.
- `akit_domain_transitions_total{transition}`: primera transición persistida observada por el proceso para evaluación completada, reporte en generación/disponible/pendiente de almacenamiento/fallido, pago confirmado y fulfillment completado. Las reejecuciones idempotentes no vuelven a contar la transición.
- `akit_domain_attempts_total{operation,outcome}`: intentos de cálculo de evaluación, generación de reporte, liquidación de pago y fulfillment, separados por `success` o `failure`. Un retry fallido y su posterior éxito son dos intentos distintos. Una reejecución idempotente de pago o fulfillment cuenta como intento exitoso, pero no agrega una nueva transición.

Los gauges de colas se consultan únicamente durante el scrape. Un valor `queue_up=0` significa que la lectura de esa cola falló y sus conteos se ponen a cero; no interprete esos conteos como estado real hasta recuperar la lectura. Estas señales son efímeras, se reinician con el proceso y no sustituyen datos persistidos ni pruebas E2E. Los contadores de dominio se incrementan después del commit o guardado exitoso, pero no son un registro exactamente una vez entre caídas o reinicios del proceso; la fuente de verdad sigue siendo la base de datos.

## Verificación local

Ejecute solicitudes sintéticas a `/health` y a una ruta inexistente. Confirme que aparecen las series HTTP correspondientes y que no hay IDs, correos, tokens, parámetros de consulta ni URLs originales en las etiquetas. Para colas, habilite BullMQ solo contra Redis local; no use credenciales de QA/producción para este piloto.
