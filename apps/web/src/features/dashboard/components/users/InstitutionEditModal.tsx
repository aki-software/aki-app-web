import { type FormEvent, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "../../../../components/atoms/Input";
import { Button } from "../../../../components/atoms/Button";
import { Modal } from "../../../../components/atoms/Modal";
import { type InstitutionOption } from "../../api/dashboard";

interface EditForm {
  name: string;
  billingEmail: string;
  legalName: string;
  taxId: string;
  taxCondition: string;
  billingAddress: string;
}

interface InstitutionEditModalProps {
  institution: InstitutionOption;
  onClose: () => void;
  onSave: (
    id: string,
    form: {
      name: string;
      billingEmail?: string;
      legalName?: string;
      taxId?: string;
      taxCondition?: string;
      billingAddress?: string;
    }
  ) => Promise<void>;
  saving: boolean;
}

export const InstitutionEditModal = ({
  institution,
  onClose,
  onSave,
  saving,
}: InstitutionEditModalProps) => {
  const [form, setForm] = useState<EditForm>({
    name: institution.name,
    billingEmail: institution.billingEmail || "",
    legalName: institution.legalName || "",
    taxId: institution.taxId || "",
    taxCondition: institution.taxCondition || "",
    billingAddress: institution.billingAddress || "",
  });
  const [showBilling, setShowBilling] = useState(false);

  const update = (field: keyof EditForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave(institution.id, {
      name: form.name,
      billingEmail: form.billingEmail || undefined,
      legalName: form.legalName || undefined,
      taxId: form.taxId || undefined,
      taxCondition: form.taxCondition || undefined,
      billingAddress: form.billingAddress || undefined,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar institución"
      subtitle="Gestion de Clientes"
      size="lg"
      isLoading={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="edit-inst-name"
            label="Nombre de la institución"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
            autoFocus
          />
          <Input
            id="edit-inst-email"
            label="Email de facturación"
            type="email"
            value={form.billingEmail}
            onChange={(e) => update("billingEmail", e.target.value)}
            placeholder="facturacion@institucion.com"
          />
        </div>

        {/* Billing accordion */}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  id="edit-inst-legal-name"
                  label="Razon Social"
                  value={form.legalName}
                  onChange={(e) => update("legalName", e.target.value)}
                  placeholder="Ej. Asociacion Civil..."
                />
                <Input
                  id="edit-inst-tax-id"
                  label="CUIT"
                  value={form.taxId}
                  onChange={(e) => update("taxId", e.target.value)}
                  placeholder="Sin guiones"
                />
                <div className="space-y-1 text-sm">
                  <label
                    htmlFor="edit-inst-tax-condition"
                    className="font-medium text-app-text-muted block"
                  >
                    Condicion frente al IVA
                  </label>
                  <select
                    id="edit-inst-tax-condition"
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
                  id="edit-inst-billing-address"
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
};
