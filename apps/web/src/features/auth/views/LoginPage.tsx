import { AlertCircle, Eye, EyeOff, LogIn } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirigir al lugar de origen si fue redirigido por ProtectedRoute
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ??
    "/dashboard";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-app-bg p-4 text-app-text-main">
      {/* Orbs decorativos */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 -left-44 h-[30rem] w-[30rem] rounded-full bg-[#131a2f]/55 blur-3xl" />
        <div className="absolute -bottom-44 -right-44 h-[30rem] w-[30rem] rounded-full bg-[#1a2238]/45 blur-3xl" />
        <div className="app-tech-grid absolute inset-0 opacity-45" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card principal */}
        <div className="app-card p-8 sm:p-9">
          {/* Logo / Marca */}
          <div className="mb-8 flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-app-border bg-white/[0.04] shadow-[0_0_14px_rgba(163,184,117,0.16)]">
              <span className="font-display text-3xl font-extrabold text-app-primary">
                A
              </span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-app-text-main">
                A.kit Admin
              </h1>
              <p className="mt-1 text-sm text-app-text-muted">
                Iniciá sesión para continuar
              </p>
            </div>
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="block text-sm font-medium text-app-text-muted"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@akit.com"
                className="w-full rounded-xl border border-app-border bg-white/[0.03] px-4 py-3 text-sm text-app-text-main placeholder:text-app-text-muted/80 outline-none transition-all duration-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/25 disabled:opacity-50"
                disabled={isSubmitting}
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-medium text-app-text-muted"
                >
                  Contraseña
                </label>
                <span className="text-xs text-app-text-muted/80">
                  Usuarios nuevos: activan su cuenta por enlace
                </span>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-app-border bg-white/[0.03] px-4 py-3 pr-12 text-sm text-app-text-main placeholder:text-app-text-muted/80 outline-none transition-all duration-200 focus:border-app-primary focus:ring-2 focus:ring-app-primary/25 disabled:opacity-50"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  title={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-app-text-muted transition-colors hover:text-app-text-main"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Botón de submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={isSubmitting || !email.trim() || !password}
              className="app-button-primary mt-2 flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-app-text-muted/80">
          © {new Date().getFullYear()} A.kit Platform · Todos los derechos
          reservados
        </p>
      </div>
    </div>
  );
}
