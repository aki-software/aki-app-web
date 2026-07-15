import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert } from "../../../components/atoms/Alert";
import { Button } from "../../../components/atoms/Button";
import { Input } from "../../../components/atoms/Input";
import { Spinner } from "../../../components/atoms/Spinner";
import { APP_ROUTES } from "../../../router/routes.constants";
import { resolveResetTokenRequest, resetPasswordRequest } from "../api/auth";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Falta el token de recuperación.");
      setLoading(false);
      return;
    }

    resolveResetTokenRequest(token)
      .catch(() => setError("Enlace inválido o expirado."))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos una letra mayúscula.");
      return;
    }

    if (!/\d/.test(password)) {
      setError("La contraseña debe contener al menos un número.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await resetPasswordRequest({ token, password });
      setSuccess("Contraseña actualizada. Ya podés iniciar sesión.");
      window.setTimeout(() => {
        navigate(APP_ROUTES.AUTH.LOGIN, { replace: true });
      }, 1200);
    } catch {
      setError("No se pudo restablecer la contraseña.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold tracking-tight">Restablecer contraseña</h1>
      <p className="mt-2 text-sm text-app-text-muted">
        Definí una nueva contraseña para tu cuenta.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" className="border-app-primary" />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <Alert type="error" message={error || ""} />
          <Alert type="success" message={success || ""} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                id="reset-password"
                type="password"
                label="Nueva contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || !!success || !!error}
                required
              />
              {password.length > 0 && (
                <div className="rounded-xl border border-app-border bg-app-bg/50 p-3 space-y-2 text-xs">
                  <div className="font-medium text-app-text-muted">Requisitos de la contraseña:</div>
                  <div className="space-y-1.5">
                    <div className={`flex items-center gap-2 ${password.length >= 8 ? "text-green-600 dark:text-green-400" : "text-app-text-muted"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 ? "bg-green-500" : "bg-app-text-muted/40"}`} />
                      <span>Mínimo 8 caracteres</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? "text-green-600 dark:text-green-400" : "text-app-text-muted"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) ? "bg-green-500" : "bg-app-text-muted/40"}`} />
                      <span>Al menos una letra mayúscula</span>
                    </div>
                    <div className={`flex items-center gap-2 ${/\d/.test(password) ? "text-green-600 dark:text-green-400" : "text-app-text-muted"}`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${/\d/.test(password) ? "bg-green-500" : "bg-app-text-muted/40"}`} />
                      <span>Al menos un número</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Input
              id="reset-confirm-password"
              type="password"
              label="Repetir contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting || !!success || !!error}
              required
            />
            <Button type="submit" isLoading={submitting} disabled={!!success || !!error}>
              Guardar nueva contraseña
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
}
