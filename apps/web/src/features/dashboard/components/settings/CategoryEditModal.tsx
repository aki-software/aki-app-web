import { Save, X } from "lucide-react";
import { useState } from "react";
import { CategoryData } from "../../api/dashboard";
import { Button } from "../../../../components/atoms/Button";
import { Alert } from "../../../../components/atoms/Alert";
import { useEscapeKey } from "../../../../hooks/useEscapeKey";

interface ModalProps {
  category: CategoryData;
  onClose: () => void;
  onSave: (id: string, form: { title: string; description: string }) => Promise<boolean>;
}

export const CategoryEditModal = ({ category, onClose, onSave }: ModalProps) => {
  const [form, setForm] = useState({ title: category.title, description: category.description });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEscapeKey(onClose, saving);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const ok = await onSave(category.categoryId, form);
    if (!ok) setError("No se pudo guardar. Verificá tu conexión o volvé a intentar.");
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-app-bg/70 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl max-h-[85vh]">
        
        <div className="flex items-start justify-between border-b border-app-border bg-app-surface/95 px-6 py-5 backdrop-blur">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">Editar dimensión</p>
            <h3 className="mt-1 text-lg font-semibold text-app-text-main truncate">{category.title}</h3>
          </div>
          <button onClick={onClose} disabled={saving} className="p-2 text-app-text-muted hover:text-app-text-main">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Alert type="error" message={error || ""} />
          <label className="space-y-1 text-sm block">
            <span className="font-medium text-app-text-muted">Título</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 text-sm text-app-text-main outline-none focus:border-app-primary"
              autoFocus
            />
          </label>
          <label className="space-y-1 text-sm block">
            <span className="font-medium text-app-text-muted">Marco teórico</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
              rows={14}
              className="w-full rounded-xl border border-app-border bg-app-bg px-3 py-2 font-mono text-sm text-app-text-main outline-none focus:border-app-primary"
            />
          </label>
        </div>

        <div className="border-t border-app-border bg-app-surface/95 px-6 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} isLoading={saving}>
            <Save className="w-4 h-4 mr-2" /> Guardar
          </Button>
        </div>
      </div>
    </div>
  );
};