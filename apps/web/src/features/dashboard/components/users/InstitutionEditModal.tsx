import { X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Input } from "../../../../components/atoms/Input";
import { Button } from "../../../../components/atoms/Button";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";
import { type InstitutionOption } from "../../api/dashboard";

interface InstitutionEditModalProps {
  institution: InstitutionOption;
  onClose: () => void;
  onSave: (id: string, form: { name: string; billingEmail?: string }) => Promise<void>;
  saving: boolean;
}

export const InstitutionEditModal = ({ institution, onClose, onSave, saving }: InstitutionEditModalProps) => {
  const [form, setForm] = useState({ name: institution.name, billingEmail: institution.billingEmail || "" });

  useEscapeKey(onClose, saving);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSave(institution.id, { name: form.name, billingEmail: form.billingEmail || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-app-bg/70 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative w-full max-w-xl rounded-2xl border border-app-border bg-app-surface p-6 shadow-2xl">
        
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-app-text-main">Editar institución</h3>
            <p className="mt-1 text-xs text-app-text-muted">Solo podés editar nombre y email de facturación.</p>
          </div>
          <button onClick={onClose} disabled={saving} className="rounded-lg p-2 text-app-text-muted hover:text-app-text-main">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              id="inst-name"
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
              autoFocus
            />
            <Input
              id="inst-billing"
              label="Email de facturación (opcional)"
              type="email"
              value={form.billingEmail}
              onChange={(e) => setForm(prev => ({ ...prev, billingEmail: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" type="button" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" isLoading={saving}>Guardar</Button>
          </div>
        </form>
      </div>
    </div>
  );
};