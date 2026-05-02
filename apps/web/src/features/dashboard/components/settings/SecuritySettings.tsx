import { CheckCircle2, Shield } from "lucide-react";
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
    if (form.new !== form.confirm) return setError("La confirmación no coincide.");

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
    <div className="space-y-10">
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-display font-bold tracking-tight text-app-text-main">
          Cuenta operativa <Shield className="h-5 w-5 text-app-primary" />
        </h2>
        <p className="mt-1 text-app-text-muted">Seguridad de acceso y ajustes de la cuenta.</p>
      </div>

      <div className="app-card !p-8 !rounded-2xl border-app-border shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="app-label opacity-60 tracking-[0.2em]">Seguridad</p>
            <h3 className="mt-2 text-lg font-black tracking-tight text-app-text-main">Cambiar contraseña</h3>
          </div>
          {success && (
             <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200">
               <CheckCircle2 className="h-4 w-4" /> Actualizado
             </div>
          )}
        </div>

        <Alert type="error" message={error || ""} />
        <Alert type="success" message={success || ""} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input
            id="curr-pass"
            label="Contraseña actual"
            type="password"
            value={form.current}
            onChange={(e) => setForm(prev => ({ ...prev, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            id="new-pass"
            label="Nueva contraseña"
            type="password"
            value={form.new}
            onChange={(e) => setForm(prev => ({ ...prev, new: e.target.value }))}
            autoComplete="new-password"
          />
          <Input
            id="conf-pass"
            label="Confirmar"
            type="password"
            value={form.confirm}
            onChange={(e) => setForm(prev => ({ ...prev, confirm: e.target.value }))}
            autoComplete="new-password"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={() => setForm({ current: "", new: "", confirm: "" })} disabled={loading}>
            Limpiar
          </Button>
          <Button onClick={handleSave} isLoading={loading}>
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
};