import { useState, useEffect } from "react";
import { PaymentGateway } from "@akit/contracts";
import { X, Ticket, ShoppingCart, ArrowLeft } from "lucide-react";
import { GatewaySelector } from "./GatewaySelector";
import { usePricingPlans, useCheckout } from "../hooks/useBilling";
import { Spinner } from "../../../components/atoms/Spinner";

export const CHECKOUT_ATTEMPT_STORAGE_KEY = "akit.billing.checkoutAttemptId";

interface BuyVouchersModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedPlanId?: string | null;
}

export function BuyVouchersModal({
  isOpen,
  onClose,
  preselectedPlanId,
}: BuyVouchersModalProps) {
  const { data: plans, isLoading: isLoadingPlans } = usePricingPlans();
  const { mutateAsync: checkout, isMutating } = useCheckout();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    preselectedPlanId ?? null,
  );
  const [selectedGateway, setSelectedGateway] =
    useState<PaymentGateway>("STRIPE");
  const [error, setError] = useState<string | null>(null);

  // Sync preselected plan when modal opens
  useEffect(() => {
    if (isOpen && preselectedPlanId) {
      setSelectedPlanId(preselectedPlanId);
      setError(null);
    }
  }, [isOpen, preselectedPlanId]);

  if (!isOpen) return null;

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId);

  const handleCheckout = async () => {
    if (!selectedPlanId) return;
    setError(null);
    try {
      const response = await checkout({
        planId: selectedPlanId,
        gateway: selectedGateway,
      });
      sessionStorage.setItem(
        CHECKOUT_ATTEMPT_STORAGE_KEY,
        response.checkoutAttemptId,
      );
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initiate checkout. Please try again.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-app-bg shadow-[-20px_0_50px_rgba(0,0,0,0.3)] flex flex-col h-full border-l border-app-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 sm:p-8 border-b border-app-border flex items-start justify-between bg-app-surface/50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-app-primary font-bold text-xs tracking-widest uppercase">
                Checkout
              </span>
            </div>
            <h2 className="text-3xl font-display font-bold text-app-text-main">
              Completar compra
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 bg-app-surface hover:bg-app-border/50 border border-transparent rounded-full transition-colors group"
          >
            <X className="w-5 h-5 text-app-text-muted group-hover:text-app-text-main" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 bg-app-bg">
          {error && (
            <div className="p-4 bg-status-error/10 text-status-error rounded-xl border border-status-error/20 font-semibold text-sm flex items-center gap-2">
              <X className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Resumen del Plan Seleccionado */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-display font-bold text-app-text-main">
                Resumen de tu lote
              </h3>
              <button
                onClick={onClose}
                className="text-sm font-semibold text-app-primary hover:text-app-primary/80 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Volver
              </button>
            </div>

            <div className="p-6 rounded-2xl border-2 border-app-primary/20 bg-app-primary/5 relative overflow-hidden">
              {isLoadingPlans ? (
                <div className="flex justify-center py-4">
                  <Spinner size="sm" className="border-app-primary" />
                </div>
              ) : selectedPlan ? (
                <div className="flex flex-col relative z-10">
                  <div className="mb-6">
                    <h4 className="text-2xl font-display font-bold text-app-text-main mb-2">
                      {selectedPlan.name}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-app-primary" />
                      <span className="text-sm font-semibold text-app-text-main">
                        {selectedPlan.voucherQuantity} vouchers incluidos
                      </span>
                    </div>
                  </div>

                  {/* Desglose de Facturación */}
                  <div className="w-full space-y-3 pt-6 border-t border-app-border">
                    <div className="flex justify-between text-sm text-app-text-muted">
                      <span>Subtotal</span>
                      <span className="font-semibold text-app-text-main">
                        ${selectedPlan.priceUsd} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-sm text-app-text-muted">
                      <span>Impuestos</span>
                      <span className="font-semibold text-app-text-main">
                        --
                      </span>
                    </div>
                    <p className="text-[11px] text-app-text-muted/70 text-right mt-[-4px]">
                      Calculado en el checkout final
                    </p>

                    <div className="pt-4 mt-2 border-t border-app-border flex justify-between items-end">
                      <span className="text-sm font-bold text-app-text-main uppercase tracking-widest mb-1">
                        Total a pagar
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-display font-black text-app-primary">
                          ${selectedPlan.priceUsd}
                        </span>
                        <span className="text-sm font-bold text-app-text-muted">
                          USD
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-app-text-muted text-center py-4">
                  No se encontró el plan seleccionado.
                </p>
              )}
            </div>
          </div>

          {/* Método de Pago */}
          <div>
            <h3 className="text-lg font-display font-bold text-app-text-main mb-4">
              Método de pago
            </h3>
            <div className="flex flex-col gap-3">
              <GatewaySelector
                selectedGateway={selectedGateway}
                onSelect={setSelectedGateway}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 sm:p-8 border-t border-app-border bg-app-surface/50 flex flex-col gap-3">
          <button
            onClick={handleCheckout}
            disabled={!selectedPlanId || isMutating}
            className="w-full py-4 rounded-xl font-bold text-white bg-app-primary hover:bg-app-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg shadow-app-primary/20 active:scale-95"
          >
            {isMutating ? (
              <>
                <Spinner size="sm" className="border-white" />
                <span>Generando checkout...</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                <span>Pagar e ir al checkout</span>
              </>
            )}
          </button>
          <p className="text-center text-[11px] text-app-text-muted font-medium px-4">
            Al proceder, serás redirigido a una página segura para completar tu
            pago con tarjeta o billetera virtual.
          </p>
        </div>
      </div>
    </div>
  );
}
