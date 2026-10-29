# Métricas locales de la API

## Stack local unificado

Un único Compose levanta API, migraciones, PostgreSQL, Redis, SeaweedFS, Jaeger, Prometheus y Grafana. La observabilidad usa los mismos datos locales de desarrollo, no otra API ni otra base.

Desde la raíz, con las variables locales configuradas:

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml config --quiet
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml up -d --build
```

La API conserva la imagen con Chromium, pero Compose establece `NODE_ENV=development` para las métricas. PostgreSQL, Redis y S3 apuntan a los servicios locales. Revise las otras variables de `apps/api/.env`: correo y proveedores externos no quedan aislados automáticamente. No use credenciales de QA o producción.

### Validación manual

1. Confirme `api-migrate` terminado con código 0 y API healthy.
2. Consulte `http://127.0.0.1:3000/health/ready`: debe responder 200.
3. En `http://127.0.0.1:9090/targets`, confirme `api:9464` UP.
4. Abra `http://127.0.0.1:3001` y el dashboard `A.kit Local Observability`; genere solicitudes a `/health` y confirme actividad.
5. Confirme con `docker compose ps` que 9464 no tiene puerto publicado.
6. Reinicie normalmente y compruebe persistencia de datos.

Grafana es anónimo Viewer y solo local. No hay exportación ni notificaciones externas. Los umbrales de las alertas son heurísticos de desarrollo, no SLOs de producción. Consulte `/alerts` en Prometheus; ante fallos, revise salud de API y dependencias, sin purgar colas ni borrar volúmenes.

Antes del primer arranque, identifique y detenga los contenedores del antiguo stack si siguen ocupando 3001/9090. No elimine sus volúmenes.

```powershell
docker compose --env-file infra/docker/.env -f infra/docker/docker-compose.yml down
```

**Ahora `down` detiene todo el entorno local**, no solo observabilidad. Conserva los volúmenes. No ejecute `down -v` salvo que quiera eliminar los datos.

| Alerta | Umbral | Respuesta inicial |
|---|---|---|
| `AkitApiMetricsUnavailable` | scrape fallido durante 2 min | Revisar `docker compose logs api` y readiness. |
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
