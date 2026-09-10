import { useEffect, useState } from 'react';
import { PricingPlan, useCreatePricingPlan, useUpdatePricingPlan } from '../api/pricing-plans.api';
import { ApiError } from '../../../api/client';
import { Modal } from '../../../components/atoms/Modal';
import { Spinner } from '../../../components/atoms/Spinner';

const toFiniteNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

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
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (editingPlan) {
        setFormData({
          name: editingPlan.name,
          description: editingPlan.description ?? '',
          voucherQuantity: toFiniteNumber(editingPlan.voucherQuantity, 10),
          priceUsd: toFiniteNumber(editingPlan.priceUsd, 10),
          isActive: editingPlan.isActive,
        });
      } else {
        setFormData({ name: '', description: '', voucherQuantity: 10, priceUsd: 10, isActive: true });
      }
      setErrors({});
      setSubmitError(null);
    }
  }, [isOpen, editingPlan]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'El nombre es obligatorio';
    if (!Number.isFinite(formData.voucherQuantity) || formData.voucherQuantity < 1) e.voucherQuantity = 'Debe ser al menos 1';
    if (!Number.isFinite(formData.priceUsd) || formData.priceUsd < 0) e.priceUsd = 'No puede ser negativo';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
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
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.data.message : 'No se pudo guardar el plan.',
      );
    }
  };

  const isEditing = !!editingPlan;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? editingPlan.name : 'Configurar plan'}
      subtitle={isEditing ? 'Modificar plan' : 'Nuevo plan de vouchers'}
      size="md"
      isLoading={isMutating}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isMutating}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-app-text-main hover:bg-app-surface border border-app-border transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="pricing-plan-form"
            disabled={isMutating}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-app-primary hover:bg-app-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
          >
            {isMutating ? (
              <><Spinner size="sm" className="border-white" /> Guardando...</>
            ) : (
              isEditing ? 'Guardar cambios' : 'Crear plan'
            )}
          </button>
        </>
      }
    >
      <form id="pricing-plan-form" onSubmit={onSubmit} className="space-y-5">
        {submitError && (
          <p role="alert" className="text-status-error text-sm font-semibold">
            {submitError}
          </p>
        )}

        {/* Nombre */}
        <div className="space-y-1.5">
          <label htmlFor="pricing-plan-name" className="text-xs font-bold tracking-[0.12em] uppercase text-app-text-muted">
            Nombre del plan
          </label>
          <input
            id="pricing-plan-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            type="text"
            placeholder="Ej: Pack Inicial, Plan Empresa 50..."
            className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all placeholder:text-neutral-400"
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
            className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all placeholder:text-neutral-400 resize-none"
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
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all"
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
                className="w-full pl-8 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-app-text-main text-sm focus:ring-2 focus:ring-app-primary/40 focus:border-app-primary outline-none transition-all"
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
            <div className="w-10 h-6 bg-app-border peer-checked:bg-app-primary rounded-full transition-colors" />
            <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-app-text-main">Plan activo</p>
            <p className="text-xs text-app-text-muted">Las instituciones pueden adquirirlo</p>
          </div>
        </label>
      </form>
    </Modal>
  );
}

