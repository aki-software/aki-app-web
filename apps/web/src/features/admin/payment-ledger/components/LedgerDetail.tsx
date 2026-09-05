import type { AdminPaymentLedgerDetail } from "@akit/contracts";
import {
  formatPaymentAmount,
  formatPaymentTimestamp,
  paymentGatewayLabel,
} from "../../../payments/utils/payment-presenters";

interface LedgerDetailProps {
  entry: AdminPaymentLedgerDetail;
}

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente de envío",
  QUEUED: "En cola para enviar",
  SENT: "Enviada",
  RETRYABLE_FAILED: "No se pudo enviar; se reintentará",
  DEAD_LETTER: "No se pudo enviar",
};

const ERROR_CLASSIFICATION_LABELS: Record<string, string> = {
  RECIPIENT_UNRESOLVED: "No se encontró el destinatario",
  QUEUE_FAILURE: "No se pudo preparar el envío",
  RENDER_FAILURE: "No se pudo preparar el mensaje",
  TRANSPORT_TRANSIENT: "Problema temporal de envío",
  TRANSPORT_PERMANENT: "Problema permanente de envío",
};

function Value({ children }: { children: React.ReactNode }) {
  return (
    <dd className="mt-1 break-words text-sm text-app-text-main">{children}</dd>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="app-label !text-xs">{label}</dt>
      <Value>{children}</Value>
    </div>
  );
}

function Identifier({ label, value }: { label: string; value: string | null }) {
  return (
    <Field label={label}>
      {value ? (
        <code className="select-all rounded bg-app-surface px-1.5 py-1 text-xs">
          {value}
        </code>
      ) : (
        "Sin registro"
      )}
    </Field>
  );
}

function recipientName(recipient: { name: string; email: string } | null) {
  if (!recipient) return "Sin destinatario registrado";
  return recipient.name === recipient.email
    ? recipient.email
    : `${recipient.name} · ${recipient.email}`;
}

function Delivery({
  title,
  delivery,
}: {
  title: string;
  delivery: AdminPaymentLedgerDetail["notifications"]["buyer"];
}) {
  return (
    <section
      className="rounded-lg border border-app-border p-3"
      aria-label={title}
    >
      <h4 className="font-semibold text-app-text-main">{title}</h4>
      {delivery ? (
        <dl className="mt-3 grid gap-2 text-sm">
          <Field label="Estado del aviso">
            {DELIVERY_STATUS_LABELS[delivery.status] ?? delivery.status}
          </Field>
          <Field label="Destinatario">
            {recipientName(delivery.recipient)}
          </Field>
          <Field label="Intentos de envío">
            {delivery.attemptCount}{" "}
            {delivery.attemptCount === 1 ? "intento" : "intentos"}
            {" · "}
            {delivery.enqueueAttemptCount} en cola
          </Field>
          <Field label="Fechas del aviso">
            En cola:{" "}
            {delivery.queuedAt
              ? formatPaymentTimestamp(delivery.queuedAt)
              : "Sin registro"}
            <br />
            Último intento:{" "}
            {delivery.lastAttemptAt
              ? formatPaymentTimestamp(delivery.lastAttemptAt)
              : "Sin registro"}
            <br />
            Enviado:{" "}
            {delivery.sentAt
              ? formatPaymentTimestamp(delivery.sentAt)
              : "Sin registro"}
          </Field>
          {delivery.error ? (
            <Field label="Atención">
              {ERROR_CLASSIFICATION_LABELS[delivery.error.classification] ??
                delivery.error.classification}
              {": "}
              {delivery.error.message}
            </Field>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-sm text-app-text-muted">
          No se registró una notificación para esta compra.
        </p>
      )}
    </section>
  );
}

export function LedgerDetail({ entry }: LedgerDetailProps) {
  const buyerName = entry.buyer
    ? entry.buyer.name === entry.buyer.email
      ? "No se informó un nombre"
      : entry.buyer.name
    : "Sin datos";
  const accredited = entry.fulfillment.state === "FULFILLED";

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        <Field label="Institución">{entry.institution.name}</Field>
        <Field label="Comprador">{buyerName}</Field>
        <Field label="Correo del comprador">
          {entry.buyer?.email ?? "Sin datos"}
        </Field>
        <Field label="Plan">
          {entry.commercial.planName ?? "Plan no disponible"}
        </Field>
        <Field label="Total">
          {formatPaymentAmount(
            Number(entry.amount.value),
            entry.amount.currency,
          )}
        </Field>
        <Field label="Método de pago">
          {entry.payment
            ? paymentGatewayLabel(entry.payment.gateway)
            : "Sin pago liquidado"}
        </Field>
        <Field label="Fecha de pago">
          {entry.payment
            ? formatPaymentTimestamp(entry.payment.settledAt)
            : "Sin pago liquidado"}
        </Field>
        <Field label="Acreditación">
          <span className="block">
            {accredited ? "Acreditación completada" : "Acreditación pendiente"}
          </span>
          <span className="block">
            {entry.fulfillment.actualVoucherCount} vouchers acreditados
          </span>
        </Field>
        {entry.fulfillment.discrepancy !== 0 ? (
          <div className="sm:col-span-2" role="alert">
            <dt className="app-label !text-xs text-status-error">Atención</dt>
            <Value>
              Se esperaban {entry.fulfillment.expectedVoucherCount} vouchers y
              se acreditaron {entry.fulfillment.actualVoucherCount} (diferencia:{" "}
              {entry.fulfillment.discrepancy}).
            </Value>
          </div>
        ) : null}
        <Field label="Fecha de acreditación">
          {entry.fulfillment.fulfilledAt
            ? formatPaymentTimestamp(entry.fulfillment.fulfilledAt)
            : "Pendiente de acreditación"}
        </Field>
      </dl>

      <div className="grid gap-3 sm:grid-cols-2">
        <Delivery
          title="Notificación al comprador"
          delivery={entry.notifications.buyer}
        />
        <Delivery
          title="Notificación a administración"
          delivery={entry.notifications.platformAdmin}
        />
      </div>

      <details className="rounded-lg border border-app-border p-3">
        <summary className="cursor-pointer font-semibold text-app-text-main focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary">
          Datos técnicos
        </summary>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Identifier
            label="Referencia del proveedor"
            value={entry.payment?.externalReference ?? null}
          />
          <Identifier label="ID del lote" value={entry.voucherBatchId} />
          <Identifier
            label="ID de intento de checkout"
            value={entry.checkoutAttemptId}
          />
          <Identifier
            label="ID de evento de pago"
            value={entry.paymentEventId}
          />
          <Identifier label="ID de institución" value={entry.institution.id} />
          <Identifier
            label="ID de aviso al comprador"
            value={entry.notifications.buyer?.deliveryId ?? null}
          />
          <Identifier
            label="ID de aviso a administración"
            value={entry.notifications.platformAdmin?.deliveryId ?? null}
          />
        </dl>
      </details>
    </div>
  );
}
