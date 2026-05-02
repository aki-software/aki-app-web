import { KeyRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resolveSetupTokenRequest, setupPasswordRequest } from "../api/auth";
import { APP_ROUTES } from "../../../router/routes.constants";
import { Input } from "../../../components/atoms/Input";
import { Button } from "../../../components/atoms/Button";
import { Spinner } from "../../../components/atoms/Spinner";
import { Alert } from "../../../components/atoms/Alert";
import { AuthLayout } from "./AuthLayout";

export function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    email: string;
    role: string;
    institutionName?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Falta el token de activación.");
      setLoading(false);
      return;
    }

    resolveSetupTokenRequest(token)
      .then((response) => setUserInfo(response.user))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "No se pudo validar el enlace.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);

    try {
      await setupPasswordRequest({ token, password });
      setSuccess("Cuenta activada. Ya podés iniciar sesión.");
      window.setTimeout(() => {
        navigate(APP_ROUTES.AUTH.LOGIN, { replace: true });
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar la cuenta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-app-primary/40 bg-app-primary/15 shadow-sm">
          <KeyRound className="h-7 w-7 text-app-primary" />
        </div>
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-tight text-app-text-main">
            Activar cuenta
          </h1>
          <p className="mt-1 text-sm text-app-text-muted">
            Definí tu contraseña inicial para entrar al panel.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="lg" className="border-app-primary" />
        </div>
      ) : (
        <div className="space-y-5">
          {userInfo && (
            <div className="rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text-muted">
              <div className="font-medium text-app-text-main">{userInfo.name}</div>
              <div>{userInfo.email}</div>
              <div className="mt-1 text-app-text-muted/80">
                {userInfo.institutionName ?? userInfo.role}
              </div>
            </div>
          )}
          <Alert type="error" message={error || ""} />
          <Alert type="success" message={success || ""} />
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="setup-password"
              type="password" 
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting || !!success}
              required
            />

            <Input
              id="setup-confirm-password"
              type="password"
              label="Repetir contraseña"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting || !!success}
              required
            />
            <Button
              type="submit"
              isLoading={submitting}
              disabled={!userInfo || !!success}
            >
              Activar cuenta
            </Button>
          </form>
        </div>
      )}
    </AuthLayout>
  );
};