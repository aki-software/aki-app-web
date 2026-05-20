import { type FormEvent, useState } from "react";
import { Input } from "../../../../components/atoms/Input";
import { Button } from "../../../../components/atoms/Button";
import { Modal } from "../../../../components/atoms/Modal";
import { type InstitutionOption } from "../../api/dashboard";

interface InstitutionEditModalProps {
  institution: InstitutionOption;
  onClose: () => void;
  onSave: (id: string, form: { name: string; billingEmail?: string }) => Promise<void>;
  saving: boolean;
}

export const InstitutionEditModal = ({ institution, onClose, onSave, saving }: InstitutionEditModalProps) => {
  const [form, setForm] = useState({ name: institution.name, billingEmail: institution.billingEmail || "" });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave(institution.id, { name: form.name, billingEmail: form.billingEmail || undefined });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Editar institución"
      subtitle="Gestión de Clientes"
      isLoading={saving}
      footer={
        <>
          <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} isLoading={saving}>Guardar cambios</Button>
        </>
      }
    >
      <div className="space-y-6">
        <p className="text-xs text-app-text-muted opacity-60">
          Solo podés editar el nombre de fantasía y el email de facturación de la institución.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2">
          <Input
            id="inst-name"
            label="Nombre de la Institución"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            required
            autoFocus
          />
          <Input
            id="inst-billing"
            label="Email de facturación"
            type="email"
            value={form.billingEmail}
            onChange={(e) => setForm(prev => ({ ...prev, billingEmail: e.target.value }))}
            placeholder="ejemplo@billing.com"
          />
        </div>
      </div>
    </Modal>
  );
};
