# Implementacion Informe Android — Plan por PR (PR1-PR5)

> Fecha: 2026-04-15
> Alcance: flujo de informe post-test para escenarios pago y voucher, con resiliencia ante caida de backend.

---

## 1) Objetivo funcional

- El test siempre debe quedar registrado (local y eventualmente backend).
- El informe debe quedar bloqueado hasta desbloqueo por una via valida:
  - pago aprobado, o
  - voucher valido canjeado.
- El envio de informe debe ser eventual (si backend/mail cae, se encola y reintenta).

---

## 2) Maquina de estados propuesta

### SessionSyncState

- `LOCAL_SAVED`: sesion guardada localmente.
- `SYNC_PENDING`: pendiente de subida al backend.
- `SYNCED`: backendSessionId confirmado.
- `SYNC_FAILED_RETRYING`: hubo error de red/backend y queda en reintento.

### ReportUnlockState

- `LOCKED`: informe no habilitado.
- `UNLOCKED_BY_VOUCHER`: informe habilitado por voucher.
- `UNLOCKED_BY_PAYMENT`: informe habilitado por pago.

### ReportDeliveryState

- `NOT_REQUESTED`: usuario no pidio envio.
- `QUEUED`: usuario pidio envio, pero falta condicion (sync/backend/mail).
- `SENDING`: envio en curso.
- `SENT`: envio exitoso.
- `FAILED`: error final (reintentar manual o automatico segun caso).

---

## 3) Reglas de transicion

### Fin de test

1. Guardar sesion local (`LOCAL_SAVED`).
2. Intentar sync inmediato a backend.
3. Si ok -> `SYNCED`.
4. Si falla -> `SYNC_FAILED_RETRYING` + encolar worker.

### Solicitar informe

1. Si `LOCKED` -> no enviar; mostrar CTA de desbloqueo.
2. Si `UNLOCKED_*` y `SYNCED` -> intentar envio (`SENDING` -> `SENT`/`FAILED`).
3. Si `UNLOCKED_*` y no `SYNCED` -> `QUEUED`.
4. Worker: cuando obtenga `backendSessionId`, drenar cola de envio pendiente.

### Desbloqueo por voucher

1. Usuario ingresa codigo.
2. Backend responde:
   - exito -> `UNLOCKED_BY_VOUCHER`.
   - `INVALID_CODE` -> error de negocio.
   - `ALREADY_USED` -> error de negocio.
3. Si usuario habia solicitado informe, pasar a `SENDING` o `QUEUED` segun sync.

### Desbloqueo por pago

1. Confirmacion de pago aprobada.
2. Set `UNLOCKED_BY_PAYMENT`.
3. Si usuario habia solicitado informe, pasar a `SENDING` o `QUEUED` segun sync.

---

## 4) UX en Android (propuesta)

No agregar pantalla completa nueva en esta fase. Resolver en Results con un bloque de estado.

### Bloque "Tu informe"

- Estado `LOCKED`: mostrar CTA dual
  - `Pagar informe`
  - `Usar voucher`
- Estado `UNLOCKED_*`: mostrar CTA principal
  - `Enviar informe por mail`
- Estado `QUEUED`: mensaje claro de cola y envio eventual.
- Estado `FAILED`: boton `Reintentar envio`.
- Estado `SENT`: confirmacion con timestamp.

### Entrada de voucher

- Modal/sheet simple con campo de codigo (8 chars) y accion canjear.
- Mostrar errores de negocio en mensaje explicito.

---

## 5) Plan por PR

## PR1 — Maquina de estados de informe

### Objetivo

Introducir modelo de estados y transiciones para sync/unlock/delivery.

### Cambios tecnicos

- Dominio:
  - `domain/model/ReportFlowState.kt` (nuevo)
  - `domain/model/SessionSyncState.kt` (nuevo o integrado)
- Use cases:
  - actualizar `FinalizeVocationalTestUseCase`
  - actualizar `SendEmailReportUseCase`
- UI:
  - actualizar `ResultsViewModel`
  - actualizar pantalla de resultados para reflejar estados reales

### Criterio de aceptacion

- Sin mensajes de exito falso.
- Con backend caido, estado `QUEUED` visible y consistente.

## PR2 — Desbloqueo por voucher

### Objetivo

Implementar canje de voucher desde Android para desbloquear informe.

### Cambios tecnicos

- Remote/API: `redeemVoucherProtected` + mapeo de errores.
- ViewModel: eventos y estado de canje.
- UI Results: modal/sheet de ingreso de voucher.

### Criterio de aceptacion

- Voucher valido desbloquea.
- `INVALID_CODE` y `ALREADY_USED` se muestran correctamente.

## PR3 — Desbloqueo por pago

### Objetivo

Integrar desbloqueo por confirmacion de pago.

### Cambios tecnicos

- Extender estado de desbloqueo con `UNLOCKED_BY_PAYMENT`.
- Integrar evento de pago aprobado en flujo de informe.

### Criterio de aceptacion

- Pago aprobado desbloquea y permite envio.

## PR4 — Resiliencia worker / entrega eventual

### Objetivo

Consolidar worker para drenar pendientes de sync y envio.

### Cambios tecnicos

- Worker: orden estricto
  1) sync session
  2) evaluar unlock
  3) envio si requested
- Persistencia local de banderas pendientes
- Backoff/retry idempotente

### Criterio de aceptacion

- Backend recuperado => pendientes se resuelven automaticamente.

## PR5 — QA E2E y cierre

### Objetivo

Evidencia final de calidad y salida.

### Matriz minima

- backend online/offline durante fin de test
- voucher valido/invalido/usado
- pago aprobado/rechazado
- envio mail ok/fallido

### Criterio de aceptacion

- Checklist go/no-go completo y documentado.

---

## 6) Seguridad y deuda tecnica conocida

- Actualmente `POST /sessions/:id/send-report` esta habilitado para mobile sin JWT backend para destrabar flujo dev.
- Este cambio es transitorio. Objetivo de hardening:
  - implementar exchange Firebase -> JWT backend para mobile,
  - restaurar guard JWT en `send-report`.

---

## 7) Evidencia actual (base ya resuelta)

- Sesion se guarda en DB backend en dispositivo real.
- Envio de informe operativo en dev con Mailtrap.
- UI de resultados corregida para estados reales de envio.
