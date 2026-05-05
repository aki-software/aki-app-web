import { CheckCircle2, Shield, Lock, RotateCcw } from "lucide-react";
import { useState } from "react";
import { changePasswordRequest } from "../../api/settings";
import { Input } from "../../../../components/atoms/Input";
import { Button } from "../../../../components/atoms/Button";
import { Alert } from "../../../../components/atoms/Alert";

export const SecuritySettings = () => {
  const [form, setForm] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!form.current || !form.new) return setError("Completa la contraseña actual y la nueva.");
    if (form.new.length < 8) return setError("La nueva contraseña debe tener al menos 8 caracteres.");
    if (form.new !== form.confirm) return setError("La confirmación de la contraseña no coincide.");

    setLoading(true);
    try {
      await changePasswordRequest(form.current, form.new);
      setForm({ current: "", new: "", confirm: "" });
      setSuccess("Contraseña actualizada correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cambiar contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Header de Sección */}
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-3 text-2xl font-black tracking-tight text-app-text-main uppercase">
          <Shield className="h-6 w-6 text-app-primary" />
          Cuenta operativa
        </h2>
        <p className="text-sm text-app-text-muted font-medium opacity-70">
          Gestioná tus credenciales de acceso y la seguridad de tu perfil.
        </p>
      </div>

      <div className="app-card !p-10 !rounded-[2.5rem] border-app-border shadow-2xl relative overflow-hidden">
        {/* Decoración de seguridad Lux */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
          <Lock className="h-32 w-32 rotate-12" />
        </div>

        <div className="flex items-center justify-between gap-4 mb-10 relative z-10">
          <div className="space-y-1">
            <p className="app-label !text-[10px] opacity-40 tracking-[0.3em] uppercase font-black">Módulo de Seguridad</p>
            <h3 className="text-xl font-black tracking-tight text-app-text-main">Cambiar contraseña</h3>
          </div>
          
          {success && (
            <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 animate-in zoom-in-90 duration-300">
              <CheckCircle2 className="h-3.5 w-3.5" /> Sesión Asegurada
            </div>
          )}
        </div>

        {/* Feedback Dinámico */}
        <div className="space-y-4 mb-8">
          {error && <Alert type="error" message={error} className="animate-in slide-in-from-top-2" />}
          {success && <Alert type="success" message={success} className="animate-in slide-in-from-top-2" />}
        </div>

        {/* Formulario con Input Atom */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 relative z-10">
          <Input
            id="curr-pass"
            label="Contraseña actual"
            type="password"
            value={form.current}
            onChange={(e) => setForm(prev => ({ ...prev, current: e.target.value }))}
            autoComplete="current-password"
            placeholder="••••••••"
          />
          <Input
            id="new-pass"
            label="Nueva contraseña"
            type="password"
            value={form.new}
            onChange={(e) => setForm(prev => ({ ...prev, new: e.target.value }))}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
          <Input
            id="conf-pass"
            label="Confirmar nueva"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm(prev => ({ ...prev, confirm: e.target.value }))}
            autoComplete="new-password"
            placeholder="Repetí la contraseña"
          />
        </div>

        {/* Acciones */}
        <div className="mt-10 flex items-center justify-end gap-4 border-t border-app-border/50 pt-8">
          <Button 
            variant="outline" 
            onClick={() => {
              setForm({ current: "", new: "", confirm: "" });
              setError(null);
              setSuccess(null);
            }} 
            disabled={loading}
            className="!px-6 group"
          >
            <RotateCcw className="h-4 w-4 mr-2 group-hover:rotate-[-120deg] transition-transform duration-500" />
            Limpiar
          </Button>
          
          <Button 
            onClick={handleSave} 
            isLoading={loading}
            className="!px-10 shadow-lg shadow-app-primary/20"
          >
            Actualizar Credenciales
          </Button>
        </div>
      </div>
    </div>
  );
};