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

  // Hook para cerrar con ESC
  useEscapeKey(onClose, saving);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop con Blur Lux */}
      <div 
        className="absolute inset-0 bg-app-bg/80 backdrop-blur-md transition-opacity" 
        onClick={() => !saving && onClose()} 
      />
      
      {/* Contenedor del Modal */}
      <div className="relative flex w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-app-border bg-app-surface shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-app-border bg-app-surface/95 px-8 py-6 backdrop-blur">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-6 bg-app-primary rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                Configuración de Dimensión
              </p>
            </div>
            <h3 className="text-xl font-black text-app-text-main truncate tracking-tight">
              {category.title}
            </h3>
          </div>
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="rounded-full p-2 text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6 custom-scrollbar">
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
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
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
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                rows={12}
                className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-4 font-mono text-xs leading-relaxed text-app-text-main outline-none focus:border-app-primary focus:ring-4 focus:ring-app-primary/10 transition-all resize-none"
                placeholder="Escribe la base científica o técnica aquí..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-app-border bg-app-surface/95 px-8 py-6 flex justify-end items-center gap-4">
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
        </div>
      </div>
    </div>
  );
};