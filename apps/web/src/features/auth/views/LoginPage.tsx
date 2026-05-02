import { LogIn, Moon, Sun } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../../../components/atoms/Input";
import { Button } from "../../../components/atoms/Button";
import { Alert } from "../../../components/atoms/Alert";
import logoTransparent from "../../../assets/Logo app transparente.png";
import logoDark from "../../../assets/logo.png";
import { AuthLayout } from "./AuthLayout";
import { useTheme } from "../../../hooks/useTheme";

export function LoginPage() {
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true); 
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/dashboard";

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof Error && err.message === 'UNAUTHORIZED' 
        ? "Credenciales incorrectas. Verificá tu email y contraseña." 
        : "Ocurrió un error inesperado al iniciar sesión.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-24 items-center justify-center rounded-2xl border border-app-border bg-app-surface shadow-sm overflow-hidden">
            <img src={darkMode ? logoDark : logoTransparent} alt="ORIENT A.KI" className="h-full w-full object-contain p-2" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">ORIENT A.KI</h1>
            <p className="mt-1 text-sm text-app-text-muted">Iniciá sesión para continuar</p>
          </div>
        </div>
        <button 
          onClick={toggleTheme} 
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-app-border bg-app-surface/80 hover:text-app-primary"
          title={theme === 'dark' ? "LUMEN MODE" : "NOX MODE"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
      <Alert type="error" message={error || ""} />
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <Input
          id="login-email"
          label="Email"
          type="email"
          placeholder="admin@akit.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />

        <Input
          id="login-password"
          label="Contraseña"
          type="password"
          hint="Usuarios nuevos: activan su cuenta por enlace"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={!email.trim() || !password}
        >
          <LogIn className="h-4 w-4" />
          <span>Iniciar sesión</span>
        </Button>
      </form>
    </AuthLayout>
  );
};