import { useEffect, useState } from "react";
import {
  useBillingHistory,
  usePricingPlans,
  useCheckoutAttemptStatus,
  isTerminalCheckoutStatus,
} from "../hooks/useBilling";
import { CHECKOUT_ATTEMPT_STORAGE_KEY } from "../components/BuyVouchersModal";
import { Alert } from "../../../components/atoms/Alert";
import { Button } from "../../../components/atoms/Button";
import { CurrentBalance } from "../components/CurrentBalance";
import { BillingHistoryTable } from "../components/BillingHistoryTable";
import { BuyVouchersModal } from "../components/BuyVouchersModal";
import { PlanCard } from "../components/PlanCard";
import { ShoppingCart } from "lucide-react";
import { Spinner } from "../../../components/atoms/Spinner";
import { formatMoney } from "../utils/money";

export function BillingDashboard() {
  const { data: history, isLoading: isLoadingHistory } = useBillingHistory();
  const { data: plans, isLoading: isLoadingPlans } = usePricingPlans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isTrackingDismissed, setIsTrackingDismissed] = useState(false);
  const [checkoutAttemptId] = useState(
    () =>
      new URLSearchParams(window.location.search).get("checkoutAttemptId") ||
      sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY),
  );
  const {
    data: checkoutStatus,
    isLoading: isLoadingCheckout,
    isExhausted,
    error: checkoutError,
    refetch: refreshCheckout,
  } = useCheckoutAttemptStatus(checkoutAttemptId);

  const currentBalance = history?.currentBalance || 0;
  const isCheckoutTerminal = Boolean(
    checkoutStatus && isTerminalCheckoutStatus(checkoutStatus),
  );
  const isPurchaseLocked = Boolean(
    checkoutAttemptId && !isCheckoutTerminal && !isTrackingDismissed,
  );
  const isPaidFulfillmentPendingAfterPolling = Boolean(
    checkoutStatus?.paymentState === "PAID" &&
      isExhausted &&
      !checkoutError,
  );

  const handleDismissTracking = () => {
    if (
      checkoutAttemptId &&
      sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) === checkoutAttemptId
    ) {
      sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    }
    setIsTrackingDismissed(true);
  };

  useEffect(() => {
    if (
      checkoutAttemptId &&
      checkoutStatus &&
      isTerminalCheckoutStatus(checkoutStatus) &&
      sessionStorage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) === checkoutAttemptId
    ) {
      sessionStorage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    }
  }, [checkoutAttemptId, checkoutStatus]);

  const handleBuyPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-10 animate-in pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-8">
        <div>
          <span className="app-label !text-app-primary">Operaciones</span>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none mt-2">
            Saldo y Vouchers
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-lg leading-relaxed">
            Adquirí nuevos lotes de vouchers para tu institución y consultá tus
            compras.
          </p>
        </div>
        <div className="flex-shrink-0">
          <CurrentBalance balance={currentBalance} />
        </div>
      </div>

      {checkoutAttemptId && (
        <section
          aria-live="polite"
          className="app-card p-5 border border-app-border"
          aria-label="Estado del pago"
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <h3 className="text-base font-display font-semibold text-app-text-main">
              Estado de la compra
            </h3>
            <div className="flex items-center gap-2">
              {(checkoutError || isExhausted) && (
                <Button
                  variant="outline"
                  className="px-4 py-2 text-sm"
                  onClick={refreshCheckout}
                  isLoading={isLoadingCheckout}
                >
                  Reintentar consulta
                </Button>
              )}
              {!isCheckoutTerminal &&
                !isTrackingDismissed &&
                (checkoutError || isExhausted) && (
                  <Button
                    variant="outline"
                    className="px-4 py-2 text-sm"
                    onClick={handleDismissTracking}
                  >
                    Descartar seguimiento
                  </Button>
                )}
            </div>
          </div>
          {isLoadingCheckout && !checkoutStatus && (
            <div className="flex items-center gap-2 text-sm text-app-text-muted">
              <Spinner size="sm" /> Confirmando pago…
            </div>
          )}
          {(checkoutError ||
            (isExhausted && !isPaidFulfillmentPendingAfterPolling)) && (
            <Alert
              type="error"
              message="No pudimos confirmar el pago automáticamente. Reintentá la consulta o verificá el estado en tu medio de pago."
            />
          )}
          {isPaidFulfillmentPendingAfterPolling && (
            <Alert
              type="warning"
              message="Pago confirmado. La emisión de vouchers sigue pendiente. Reintentá la consulta y no realices otro pago."
            />
          )}
          {!checkoutError &&
            !checkoutStatus &&
            !isLoadingCheckout &&
            !isExhausted && (
              <Alert
                type="warning"
                message="No se encontró el estado de esta compra."
              />
            )}
          {checkoutStatus && (
            <div className="space-y-2 text-sm text-app-text-main">
              <p className="font-semibold">
                {checkoutStatus.paymentState === "PAID"
                  ? checkoutStatus.fulfillmentState === "FULFILLED"
                    ? "Vouchers disponibles"
                    : checkoutStatus.fulfillmentState === "BLOCKED"
                      ? "Emisión bloqueada. Contactá a soporte."
                      : checkoutStatus.fulfillmentState === "REVOKED"
                        ? "Vouchers revocados."
                        : "Pago confirmado. Emitiendo vouchers…"
                  : ["FAILED", "EXPIRED", "CANCELLED", "REFUNDED"].includes(
                        checkoutStatus.paymentState,
                      )
                    ? "El pago no pudo completarse. Podés intentar una nueva compra."
                    : "Confirmando pago…"}
              </p>
              {checkoutStatus.chargedTotal && (
                <p>
                  <strong>Total cobrado:</strong>{" "}
                  {formatMoney(checkoutStatus.chargedTotal)}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 1. Plans */}
      <div>
        <div className="mb-5">
          <p className="app-label !text-app-primary mb-1">Lotes disponibles</p>
          <h3 className="text-xl font-display font-bold text-app-text-main">
            Planes de vouchers
          </h3>
        </div>

        {isPurchaseLocked && (
          <p className="mb-4 text-sm font-medium text-app-text-muted">
            Confirmación en curso. Esperá antes de iniciar otra compra.
          </p>
        )}

        {isLoadingPlans ? (
          <div className="flex items-center justify-center py-12 gap-3 text-app-text-muted">
            <Spinner size="md" className="border-app-primary" />
            <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
              Cargando planes
            </span>
          </div>
        ) : !plans || plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-app-border text-app-text-muted">
            <ShoppingCart className="w-9 h-9 opacity-30" />
            <p className="text-sm font-medium">
              No hay planes disponibles por el momento.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isSelected={false}
                onSelect={() => handleBuyPlan(plan.id)}
                actionLabel="Adquirir lote"
                actionIcon={<ShoppingCart className="w-4 h-4" />}
                isDisabled={isPurchaseLocked}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. History */}
      <div>
        <div className="app-card !p-0 overflow-hidden bg-app-surface/70 border border-app-border mt-4">
          <div className="px-5 py-4 border-b border-app-border bg-app-surface/40">
            <h3 className="text-base font-display font-semibold text-app-text-main">
              Compras realizadas
            </h3>
          </div>
          <div>
            {isLoadingHistory ? (
              <div className="flex h-48 flex-col items-center justify-center gap-4 text-app-text-muted">
                <Spinner size="md" className="border-app-primary" />
                <span className="app-label !text-xs tracking-[0.25em] animate-pulse">
                  Cargando compras
                </span>
              </div>
            ) : (
              <BillingHistoryTable transactions={history?.transactions || []} />
            )}
          </div>
        </div>
      </div>

      <BuyVouchersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        preselectedPlanId={selectedPlanId}
      />
    </div>
  );
}
