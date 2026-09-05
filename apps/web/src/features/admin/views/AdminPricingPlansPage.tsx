import { useState } from 'react';
import { Plus, Edit2, Tags, Trash2, Check, X } from 'lucide-react';
import { useAdminPricingPlans, useDeletePricingPlan, PricingPlan } from '../api/pricing-plans.api';
import { PricingPlanModal } from '../components/PricingPlanModal';
import { Spinner } from '../../../components/atoms/Spinner';

export function AdminPricingPlansPage() {
  const { data: plans, isLoading, refetch } = useAdminPricingPlans();
  const { mutateAsync: deletePlan } = useDeletePricingPlan();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PricingPlan | undefined>(undefined);

  const handleOpenModal = (plan?: PricingPlan) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro que deseas eliminar este plan? Esta acción no se puede deshacer.')) {
      await deletePlan(id);
      refetch();
    }
  };

  return (
    <div className="space-y-12 animate-in pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-app-border pb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="app-label !text-app-primary">Configuración Administrativa</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-bold text-app-text-main tracking-tight leading-none max-w-3xl">
            Planes de Vouchers
          </h2>
          <p className="mt-3 text-sm font-medium text-app-text-muted max-w-lg leading-relaxed">
            Administrá los planes de vouchers que las instituciones pueden adquirir en la plataforma.
          </p>
        </div>
        
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-app-primary text-white text-sm font-semibold tracking-wide hover:bg-app-primary/90 transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span>Crear Plan</span>
        </button>
      </div>

      <div className="app-card !p-0 overflow-hidden flex flex-col bg-app-surface/70 border border-app-border">
        <div className="px-6 py-5 border-b border-app-border flex items-center justify-between bg-app-surface/40">
          <h3 className="text-lg font-display font-semibold text-app-text-main flex items-center gap-2">
            <Tags className="w-5 h-5 text-app-primary" />
            Catálogo de Planes Activos
          </h3>
        </div>
        
        <div className="flex-1 p-0">
          {isLoading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 text-app-text-muted">
              <Spinner size="md" className="border-app-primary" />
              <span className="app-label !text-xs tracking-[0.25em] animate-pulse">Cargando planes...</span>
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-app-text-muted">
              <p className="font-semibold">No hay planes creados todavía.</p>
              <p className="text-sm mt-1">Hacé clic en 'Crear Plan' para agregar el primero.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-app-border xl:hidden">
                {plans.map((plan) => (
                  <article key={plan.id} className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className="break-words text-sm font-semibold text-app-text-main">{plan.name}</h4>
                        <p className="mt-1 text-sm text-app-text-muted">{plan.voucherQuantity} vouchers</p>
                      </div>
                      {plan.isActive ? (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-status-success/20 bg-status-success/10 px-3 py-1 text-xs font-bold text-status-success"><Check className="h-3.5 w-3.5" aria-hidden="true" />Activo</span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-app-border bg-app-text-muted/10 px-3 py-1 text-xs font-bold text-app-text-muted"><X className="h-3.5 w-3.5" aria-hidden="true" />Inactivo</span>
                      )}
                    </div>
                    <p className="font-display text-lg font-bold text-app-primary">${plan.priceUsd}</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleOpenModal(plan)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-app-primary/10 hover:text-app-primary" aria-label={`Editar plan ${plan.name}`}><Edit2 className="h-4 w-4" aria-hidden="true" /></button>
                      <button onClick={() => handleDelete(plan.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-status-error/10 hover:text-status-error" aria-label={`Eliminar plan ${plan.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto xl:block">
                <table className="w-full text-left border-collapse">
                  <thead><tr className="border-b border-app-border bg-app-surface/20"><th className="py-4 px-6 app-label tracking-wider uppercase">Nombre del Plan</th><th className="py-4 px-6 app-label tracking-wider uppercase">Cantidad Vouchers</th><th className="py-4 px-6 app-label tracking-wider uppercase">Precio (USD)</th><th className="py-4 px-6 app-label tracking-wider uppercase">Estado</th><th className="py-4 px-6 app-label tracking-wider uppercase text-right">Acciones</th></tr></thead>
                  <tbody className="divide-y divide-app-border">
                    {plans.map((plan) => (
                      <tr key={plan.id} className="group hover:bg-app-surface/50 transition-colors">
                        <td className="py-4 px-6"><span className="text-sm font-semibold text-app-text-main">{plan.name}</span></td><td className="py-4 px-6"><span className="text-sm font-semibold text-app-text-main">{plan.voucherQuantity}</span></td><td className="py-4 px-6"><span className="font-display text-sm font-bold text-app-primary">${plan.priceUsd}</span></td>
                        <td className="py-4 px-6">{plan.isActive ? <span className="inline-flex items-center gap-1.5 rounded-full border border-status-success/20 bg-status-success/10 px-3 py-1 text-xs font-bold text-status-success"><Check className="h-3.5 w-3.5" aria-hidden="true" />Activo</span> : <span className="inline-flex items-center gap-1.5 rounded-full border border-app-border bg-app-text-muted/10 px-3 py-1 text-xs font-bold text-app-text-muted"><X className="h-3.5 w-3.5" aria-hidden="true" />Inactivo</span>}</td>
                        <td className="py-4 px-6 text-right"><div className="flex justify-end gap-3"><button onClick={() => handleOpenModal(plan)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-app-primary/10 hover:text-app-primary" aria-label={`Editar plan ${plan.name}`}><Edit2 className="h-4 w-4" aria-hidden="true" /></button><button onClick={() => handleDelete(plan.id)} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-app-text-muted transition-colors hover:bg-status-error/10 hover:text-status-error" aria-label={`Eliminar plan ${plan.name}`}><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <PricingPlanModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingPlan={editingPlan}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
