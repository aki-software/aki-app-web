import { useState } from 'react';
import { useBillingHistory, usePricingPlans } from '../hooks/useBilling';
import { CurrentBalance } from '../components/CurrentBalance';
import { BillingHistoryTable } from '../components/BillingHistoryTable';
import { BuyVouchersModal } from '../components/BuyVouchersModal';
import { PlanCard } from '../components/PlanCard';
import { ShoppingCart } from 'lucide-react';
import { Spinner } from '../../../components/atoms/Spinner';

export function BillingDashboard() {
  const { data: history, isLoading: isLoadingHistory } = useBillingHistory();
  const { data: plans, isLoading: isLoadingPlans } = usePricingPlans();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const currentBalance = history?.currentBalance || 0;

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
            Adquirí nuevos lotes de vouchers para tu institución y consultá tus compras.
          </p>
        </div>
        <div className="flex-shrink-0">
          <CurrentBalance balance={currentBalance} />
        </div>
      </div>

      {/* 1. Plans */}
      <div>
        <div className="mb-5">
          <p className="app-label !text-app-primary mb-1">Lotes disponibles</p>
          <h3 className="text-xl font-display font-bold text-app-text-main">Planes de vouchers</h3>
        </div>

        {isLoadingPlans ? (
          <div className="flex items-center justify-center py-12 gap-3 text-app-text-muted">
            <Spinner size="md" className="border-app-primary" />
            <span className="app-label !text-xs tracking-[0.25em] animate-pulse">Cargando planes</span>
          </div>
        ) : !plans || plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 rounded-2xl border border-dashed border-app-border text-app-text-muted">
            <ShoppingCart className="w-9 h-9 opacity-30" />
            <p className="text-sm font-medium">No hay planes disponibles por el momento.</p>
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
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. History */}
      <div>
        <div className="app-card !p-0 overflow-hidden bg-app-surface/70 border border-app-border mt-4">
          <div className="px-5 py-4 border-b border-app-border bg-app-surface/40">
            <h3 className="text-base font-display font-semibold text-app-text-main">Compras realizadas</h3>
          </div>
          <div>
            {isLoadingHistory ? (
              <div className="flex h-48 flex-col items-center justify-center gap-4 text-app-text-muted">
                <Spinner size="md" className="border-app-primary" />
                <span className="app-label !text-xs tracking-[0.25em] animate-pulse">Cargando compras</span>
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
