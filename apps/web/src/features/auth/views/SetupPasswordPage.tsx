import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { resolveSetupTokenRequest, setupPasswordRequest } from "../api/auth";

export function SetupPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      setError("Falta el token de activacion.");
      setLoading(false);
      return;
    }

    resolveSetupTokenRequest(token)
      .then((response) => {
        setUserInfo(response.user);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "No se pudo validar el enlace.",
        );
      })
      .finally(() => {
        setLoading(false);
      });
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
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo activar la cuenta.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="app-tech-grid flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-app-primary/40 bg-app-primary/15 shadow-[0_0_14px_rgba(163,184,117,0.16)]">
            <KeyRound className="h-7 w-7 text-app-primary" />
          </div>
          <div className="text-center">
            <h1 className="font-display text-2xl font-bold tracking-tight text-app-text-main">
              Activar cuenta
            </h1>
            <p className="mt-1 text-sm text-app-text-muted">
              Defini tu contrasena inicial para entrar al panel.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-app-primary border-r-transparent" />
          </div>
        ) : (
          <div className="space-y-5">
            {userInfo ? (
              <div className="rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm text-app-text-muted">
                <div className="font-medium text-app-text-main">
                  {userInfo.name}
                </div>
                <div>{userInfo.email}</div>
                <div className="mt-1 text-app-text-muted/80">
                  {userInfo.institutionName ?? userInfo.role}
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            ) : null}

            {success ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                <p className="text-sm text-emerald-300">{success}</p>
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-app-text-muted">
                  Contrasena
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 pr-12 text-sm text-app-text-main outline-none transition-all focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-lg px-2 text-app-text-muted hover:text-app-text-main"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-app-text-muted">
                  Repetir contrasena
                </span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                    className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 pr-12 text-sm text-app-text-main outline-none transition-all focus:border-app-primary focus:ring-2 focus:ring-app-primary/25"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 inline-flex items-center justify-center rounded-lg px-2 text-app-text-muted hover:text-app-text-main"
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmación de contraseña"
                        : "Mostrar confirmación de contraseña"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </label>
              <button
                type="submit"
                disabled={submitting || !userInfo}
                className="app-button-primary flex w-full items-center justify-center disabled:opacity-50"
              >
                {submitting ? "Activando..." : "Activar cuenta"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
