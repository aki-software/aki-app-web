import { useEffect, useState } from 'react';
import { X, Package } from 'lucide-react';
import { PricingPlan, useCreatePricingPlan, useUpdatePricingPlan } from '../api/pricing-plans.api';
import { Spinner } from '../../../components/atoms/Spinner';

interface PricingPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPlan?: PricingPlan;
  onSuccess: () => void;
}

export function PricingPlanModal({ isOpen, onClose, editingPlan, onSuccess }: PricingPlanModalProps) {
  const { mutateAsync: createPlan, isPending: isCreating } = useCreatePricingPlan();
  const { mutateAsync: updatePlan, isPending: isUpdating } = useUpdatePricingPlan();
  const isMutating = isCreating || isUpdating;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    voucherQuantity: 10,
    priceUsd: 10,
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (editingPlan) {
        setFormData({
          name: editingPlan.name,
          description: editingPlan.description ?? '',
          voucherQuantity: editingPlan.voucherQuantity,
          priceUsd: editingPlan.priceUsd,
          isActive: editingPlan.isActive,
        });
      } else {
        setFormData({ name: '', description: '', voucherQuantity: 10, priceUsd: 10, isActive: true });
      }
      setErrors({});
    }
  }, [isOpen, editingPlan]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'El nombre es obligatorio';
    if (formData.voucherQuantity < 1) e.voucherQuantity = 'Debe ser al menos 1';
    if (formData.priceUsd < 0) e.priceUsd = 'No puede ser negativo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        voucherQuantity: formData.voucherQuantity,
        priceUsd: formData.priceUsd,
        isActive: formData.isActive,
      };
      if (editingPlan) {
        await updatePlan({ id: editingPlan.id, ...payload });
      } else {
        await createPlan(payload);
      }
      onSuccess();
      onClose();
    } catch {
      alert('Ocurrió un error al guardar el lote');
    }
  };

  const isEditing = !!editingPlan;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 bg-app-primary/5 dark:bg-app-primary/10 border-b border-app-primary/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-app-primary/10 rounded-xl">
                <Package className="w-5 h-5 text-app-primary" />
              </div>
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-app-primary mb-0.5">
                  {isEditing ? 'Modificar lote' : 'Nuevo lote de vouchers'}
                </p>
                <h2 className="text-xl font-display font-bold text-app-text-main leading-tight">
                  {isEditing ? editingPlan.name : 'Configurar disponibilidad'}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-app-text-muted" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-[0.12em] uppercase text-app-text-muted">Nombre del lote</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                type="text"
                placeholder="Ej: Pack Inicial, Plan Empresa 50..."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all placeholder:text-neutral-400"
              />
              {errors.name && <p className="text-status-error text-xs font-semibold">{errors.name}</p>}
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-[0.12em] uppercase text-app-text-muted">
                Descripción <span className="normal-case font-normal opacity-60">(opcional)</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="Ej: Ideal para instituciones pequeñas. Incluye soporte prioritario."
                className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all placeholder:text-neutral-400 resize-none"
              />
            </div>

            {/* Cantidad + Precio */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-[0.12em] uppercase text-app-text-muted">Vouchers</label>
                <div className="relative">
                  <input
                    value={formData.voucherQuantity}
                    onChange={(e) => setFormData({ ...formData, voucherQuantity: Number(e.target.value) })}
                    type="number"
                    min="1"
                    className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all"
                  />
                </div>
                {errors.voucherQuantity && <p className="text-status-error text-xs font-semibold">{errors.voucherQuantity}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-[0.12em] uppercase text-app-text-muted">Precio (USD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-app-text-muted font-bold text-sm">$</span>
                  <input
                    value={formData.priceUsd}
                    onChange={(e) => setFormData({ ...formData, priceUsd: Number(e.target.value) })}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all"
                  />
                </div>
                {errors.priceUsd && <p className="text-status-error text-xs font-semibold">{errors.priceUsd}</p>}
              </div>
            </div>

            {/* Preview card */}
            {formData.name && (
              <div className="p-4 rounded-2xl border-2 border-app-primary/20 bg-app-primary/5">
                <p className="text-xs font-bold tracking-[0.15em] uppercase text-app-primary mb-1">Vista previa</p>
                <p className="font-display font-bold text-app-text-main">{formData.name}</p>
                {formData.description && <p className="text-sm text-app-text-muted mt-0.5">{formData.description}</p>}
                <p className="text-sm font-bold text-app-primary mt-2">{formData.voucherQuantity} vouchers &mdash; USD ${formData.priceUsd}</p>
              </div>
            )}

            {/* Activo */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  type="checkbox"
                  className="sr-only peer"
                  id="isActive"
                />
                <div className="w-10 h-6 bg-neutral-200 dark:bg-neutral-700 peer-checked:bg-app-primary rounded-full transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-app-text-main">Lote activo</p>
                <p className="text-xs text-app-text-muted">Las instituciones pueden adquirirlo</p>
              </div>
            </label>

          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-app-text-main hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isMutating}
              className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-app-primary hover:bg-app-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
            >
              {isMutating ? (
                <><Spinner size="sm" className="border-white" /> Guardando...</>
              ) : (
                isEditing ? 'Guardar cambios' : 'Crear lote'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

