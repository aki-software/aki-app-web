import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Input } from "../../../components/atoms/Input";
import { Button } from "../../../components/atoms/Button";
import { Alert } from "../../../components/atoms/Alert";
import { requestPasswordResetRequest } from "../api/auth";
import { APP_ROUTES } from "../../../router/routes.constants";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Ingresá un email válido.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordResetRequest(email.trim());
      setSuccess(result.message);
    } catch {
      setError("No se pudo procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="font-display text-2xl font-bold tracking-tight">Recuperar contraseña</h1>
      <p className="mt-2 text-sm text-app-text-muted">
        Te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <div className="mt-6 space-y-4">
        <Alert type="error" message={error || ""} />
        <Alert type="success" message={success || ""} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="forgot-email"
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
          <Button type="submit" isLoading={loading} disabled={!email.trim()}>
            Enviar enlace
          </Button>
        </form>
        <p className="text-sm text-app-text-muted">
          <Link className="text-app-primary hover:underline" to={APP_ROUTES.AUTH.LOGIN}>
            Volver al login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
