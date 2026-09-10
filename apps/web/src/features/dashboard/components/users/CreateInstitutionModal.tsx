import { useState, type FormEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "../../../../components/atoms/Modal";
import { Button } from "../../../../components/atoms/Button";
import { Input } from "../../../../components/atoms/Input";
import { initialFormState, type EntityFormState } from "./CreateEntityForm.types";

interface CreateInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (form: EntityFormState) => Promise<boolean>;
  saving: boolean;
}

export function CreateInstitutionModal({
  isOpen,
  onClose,
  onSubmit,
  saving,
}: CreateInstitutionModalProps) {
  const [form, setForm] = useState<EntityFormState>(initialFormState);
  const [showBilling, setShowBilling] = useState(false);

  const update = (field: keyof EntityFormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const success = await onSubmit(form);
    if (success) {
      setForm(initialFormState);
      setShowBilling(false);
    }
  };

  const handleClose = () => {
    if (saving) return;
    setForm(initialFormState);
    setShowBilling(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nueva institución"
      subtitle="Gestión de Clientes"
      size="lg"
      isLoading={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            Crear institución
          </Button>
        </>
      }
    >
      <form id="create-institution-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="inst-name"
            label="Nombre de la institución"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoFocus
            placeholder="Ej. Centro de Orientación Norte"
          />
          <Input
            id="inst-email"
            label="Email de acceso"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            placeholder="admin@institucion.com"
          />
          <div className="sm:col-span-2">
            <Input
              id="inst-billing-email"
              label="Email de facturación (opcional)"
              type="email"
              value={form.billingEmail}
              onChange={(e) => update("billingEmail", e.target.value)}
              placeholder="facturacion@institucion.com"
            />
          </div>
        </div>

        <div className="rounded-xl border border-app-border">
          <button
            type="button"
            onClick={() => setShowBilling((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-app-text-main hover:bg-app-surface/60 transition-colors rounded-xl"
          >
            <span>
              Datos de facturación{" "}
              <span className="ml-1 text-xs font-normal text-app-text-muted">(opcional)</span>
            </span>
            {showBilling ? (
              <ChevronUp className="h-4 w-4 text-app-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-app-text-muted" />
            )}
          </button>

          {showBilling && (
            <div className="border-t border-app-border px-4 pb-4 pt-4">
              <p className="mb-4 text-xs text-app-text-muted">
                Si no los completás ahora, la institución deberá ingresarlos al momento de su primera compra.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="inst-legal-name"
                  label="Razón Social"
                  value={form.legalName}
                  onChange={(e) => update("legalName", e.target.value)}
                  placeholder="Ej. Asociación Civil..."
                />
                <Input
                  id="inst-tax-id"
                  label="CUIT"
                  value={form.taxId}
                  onChange={(e) => update("taxId", e.target.value)}
                  placeholder="Sin guiones"
                />
                <div className="space-y-1 text-sm">
                  <label
                    htmlFor="inst-tax-condition"
                    className="font-medium text-app-text-muted block"
                  >
                    Condición frente al IVA
                  </label>
                  <select
                    id="inst-tax-condition"
                    value={form.taxCondition}
                    onChange={(e) => update("taxCondition", e.target.value)}
                    className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Exento">Exento</option>
                    <option value="Consumidor Final">Consumidor Final</option>
                    <option value="Monotributo">Monotributo</option>
                  </select>
                </div>
                <Input
                  id="inst-billing-address"
                  label="Domicilio Fiscal"
                  value={form.billingAddress}
                  onChange={(e) => update("billingAddress", e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
