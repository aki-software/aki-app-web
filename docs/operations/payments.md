# Runbook de pagos

## Objetivo

Diagnosticar pagos, webhooks, fulfillment e idempotencia sin duplicar beneficios ni cobros.

## Flujo esperado

```text
Checkout → proveedor → webhook → validación de firma → pago persistido
→ fulfillment idempotente → voucher o unlock disponible
```

## Diagnóstico seguro

1. Identificar `paymentId`, proveedor y clave de idempotencia.
2. Confirmar firma y evento recibido.
3. Comparar estado del proveedor con el estado local.
4. Verificar si el fulfillment ya fue ejecutado.
5. Reconciliar antes de reintentar.

## Reglas

- Nunca cumplir dos veces una misma compra.
- Nunca confiar únicamente en la respuesta del cliente.
- Los webhooks deben tolerar duplicados y reordenamiento.
- Las claves y secretos no deben aparecer en logs ni documentación.
