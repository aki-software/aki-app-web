import React, { useState, useEffect } from 'react';
import { Package, Ticket, ArrowRight, Loader2 } from 'lucide-react';
import { createCheckoutSession, getPricingPlans } from '../api/payments.api';

interface Plan {
  id: string;
  name: string;
  description?: string;
  priceArs: number;
  priceUsd?: number;
  voucherQuantity: number;
}

export const PricingPage: React.FC = () => {
  const [loading, setLoading] = useState<{ planId: string, gateway: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);

  useEffect(() => {
    let mounted = true;
    getPricingPlans()
      .then((data) => {
        if (mounted) {
          setPlans(data);
          setLoadingPlans(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setError('No se pudieron cargar los paquetes disponibles.');
          setLoadingPlans(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  const handleSubscribe = async (planId: string, gateway: 'stripe' | 'mercadopago'): Promise<void> => {
    setLoading({ planId, gateway });
    setError(null);
    try {
      const successUrl = `${window.location.origin}/dashboard/vouchers?success=1`;
      const cancelUrl = `${window.location.origin}/pricing`;
      const { checkoutUrl } = await createCheckoutSession(planId, gateway, successUrl, cancelUrl);
      window.location.href = checkoutUrl;
    } catch {
      setError('Ocurrió un error al procesar el pago.');
      setLoading(null);
    }
  };

  return (
    <div className="space-y-10 animate-in max-w-5xl mx-auto p-4 md:p-8">
      <div className="text-center mb-12 space-y-4">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight">Paquetes de Vouchers</h1>
        <p className="text-lg text-app-text-muted">Adquirí vouchers para ofrecer tests vocacionales a tus alumnos o pacientes.</p>
      </div>

      {error && (
        <div className="bg-status-error/10 border border-status-error text-status-error p-4 rounded-xl text-center mb-8">
          {error}
        </div>
      )}

      {loadingPlans ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-app-primary" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.id} className="app-card flex flex-col relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
              <Package className="h-32 w-32 text-app-text-muted" />
            </div>
            
            <div className="relative z-10 flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Ticket className="h-5 w-5 text-app-primary" />
                <span className="app-label">{plan.name}</span>
              </div>
              
              <div className="mb-8">
                <div className="app-value mb-2">
                  $ {plan.priceArs.toLocaleString()}
                </div>
                <div className="app-desc">Incluye {plan.voucherQuantity} vouchers completos</div>
                {plan.description && <div className="text-sm text-app-text-muted mt-2">{plan.description}</div>}
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-4 relative z-10">
              <button
                onClick={() => { void handleSubscribe(plan.id, 'mercadopago'); }}
                disabled={loading !== null}
                className="app-button-primary w-full flex items-center justify-center gap-2"
              >
                {loading?.planId === plan.id && loading?.gateway === 'mercadopago' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Pagar con Mercado Pago</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <button
                onClick={() => { void handleSubscribe(plan.id, 'stripe'); }}
                disabled={loading !== null}
                className="app-button-secondary w-full flex items-center justify-center gap-2"
              >
                {loading?.planId === plan.id && loading?.gateway === 'stripe' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <span>Pagar con Stripe</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};
