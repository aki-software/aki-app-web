# Métricas locales de la API

Esta instrumentación es un piloto local de T05–T07. No exporta datos ni habilita un endpoint público en el puerto de la API.

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
