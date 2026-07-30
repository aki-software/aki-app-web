import React, { useState, useEffect } from 'react';
import { Package, Ticket, ArrowRight, Loader2 } from 'lucide-react';
import { createCheckoutSession, getPricingPlans } from '../api/payments.api';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  voucherQuantity: number;
}

export const PricingPage: React.FC = () => {
  const [loading, setLoading] = useState<string | null>(null);
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

  const handleSubscribe = async (planId: string): Promise<void> => {
    setLoading(planId);
    setError(null);
    try {
      const successUrl = `${window.location.origin}/dashboard/vouchers?success=1`;
      const cancelUrl = `${window.location.origin}/pricing`;
      const { url } = await createCheckoutSession(planId, successUrl, cancelUrl);
      window.location.href = url;
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
                  {plan.currency === 'USD' ? 'US$ ' : '$ '}
                  {plan.price.toLocaleString()}
                </div>
                <div className="app-desc">Incluye {plan.voucherQuantity} vouchers completos</div>
              </div>
            </div>

            <button
              onClick={() => { void handleSubscribe(plan.id); }}
              disabled={loading !== null}
              className="app-button-primary w-full flex items-center justify-center gap-2 mt-4 relative z-10"
            >
              {loading === plan.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <span>Comprar vouchers</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
};
