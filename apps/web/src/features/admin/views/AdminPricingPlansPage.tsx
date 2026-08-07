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
        
        <div className="flex-1 p-0 overflow-x-auto">
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
            <table className="w-full text-left border-collapse min-w-max">
              <thead>
                <tr className="border-b border-app-border bg-app-surface/20">
                  <th className="py-4 px-6 app-label tracking-wider uppercase">Nombre del Plan</th>
                  <th className="py-4 px-6 app-label tracking-wider uppercase">Cantidad Vouchers</th>
                  <th className="py-4 px-6 app-label tracking-wider uppercase">Precio (USD)</th>
                  <th className="py-4 px-6 app-label tracking-wider uppercase">Estado</th>
                  <th className="py-4 px-6 app-label tracking-wider uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border">
                {plans.map((plan) => (
                  <tr key={plan.id} className="group hover:bg-app-surface/50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-app-text-main">{plan.name}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-semibold text-app-text-main">{plan.voucherQuantity}</span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-sm font-bold text-app-primary font-display">${plan.priceUsd}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5">
                        {plan.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-status-success/10 text-status-success border border-status-success/20">
                            <Check className="w-3.5 h-3.5" /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-app-text-muted/10 text-app-text-muted border border-app-border">
                            <X className="w-3.5 h-3.5" /> Inactivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => handleOpenModal(plan)}
                          className="p-2 rounded-xl text-app-text-muted hover:text-app-primary hover:bg-app-primary/10 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 rounded-xl text-app-text-muted hover:text-status-error hover:bg-status-error/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
