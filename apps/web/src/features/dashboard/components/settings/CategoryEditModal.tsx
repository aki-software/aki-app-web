import { Save } from "lucide-react";
import { useState } from "react";
import { Alert } from "../../../../components/atoms/Alert";
import { Button } from "../../../../components/atoms/Button";
import { Modal } from "../../../../components/atoms/Modal";
import { CategoryData } from "../../api/dashboard";

interface ModalProps {
  category: CategoryData;
  onClose: () => void;
  onSave: (
    id: string,
    form: { title: string; description: string },
  ) => Promise<boolean>;
}

export const CategoryEditModal = ({
  category,
  onClose,
  onSave,
}: ModalProps) => {
  const [form, setForm] = useState({
    title: category.title,
    description: category.description,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    setSaving(true);
    setError(null);
    const ok = await onSave(category.categoryId, form);

    if (ok) {
      onClose();
    } else {
      setError("No se pudo guardar. Verificá tu conexión o volvé a intentar.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={category.title}
      subtitle="Configuración de Dimensión"
      size="lg"
      isLoading={saving}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-transparent hover:bg-app-bg !text-app-text-muted hover:!text-app-text-main"
          >
            Descartar cambios
          </Button>

          <Button
            onClick={handleSubmit}
            isLoading={saving}
            className="!px-8 !py-3 shadow-lg shadow-app-primary/20"
          >
            <Save className="w-4 h-4 mr-2" />
            Actualizar Dimensión
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {error && (
          <Alert
            type="error"
            message={error}
            className="animate-in slide-in-from-top-2"
          />
        )}

        <div className="space-y-6">
          {/* Input de Título */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-app-text-muted ml-1">
              Título de la Categoría
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text-main outline-none focus:border-app-primary focus:ring-4 focus:ring-app-primary/10 transition-all font-bold"
              placeholder="Ej: Naturalista"
              autoFocus
            />
          </div>

          {/* Textarea de Marco Teórico */}
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[11px] font-black uppercase tracking-widest text-app-text-muted">
                Marco Teórico / Descripción
              </label>
              <span className="text-[10px] font-medium text-app-text-muted opacity-50">
                Formato Monoespaciado
              </span>
            </div>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={12}
              className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-4 font-mono text-xs leading-relaxed text-app-text-main outline-none focus:border-app-primary focus:ring-4 focus:ring-app-primary/10 transition-all resize-none"
              placeholder="Escribe la base científica o técnica aquí..."
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};
