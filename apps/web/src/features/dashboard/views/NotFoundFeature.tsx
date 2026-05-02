import { AlertCircle, ArrowLeft } from "lucide-react";
import { Link, useRouteError } from "react-router-dom";

export function NotFoundFeature() {
  const error = useRouteError() as {
    status?: number;
    statusText?: string;
    message?: string;
  };

  return (
    <div className="app-tech-grid min-h-full overflow-hidden p-8 text-center">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col items-center justify-center rounded-3xl border border-app-border bg-app-surface p-8 shadow-[0_24px_60px_-28px_rgba(63,52,41,0.35)] dark:shadow-[0_24px_60px_-28px_rgba(0,0,0,0.85)] backdrop-blur-xl">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-300">
          <AlertCircle className="w-10 h-10" />
        </div>

        <h1 className="mb-2 text-4xl font-display font-extrabold tracking-tight text-app-text-main">
          Modulo No Encontrado
        </h1>

        <p className="mx-auto mb-8 max-w-md text-lg text-app-text-muted">
          {error?.status === 404
            ? "Ups, parece que esta seccion todavia no esta construida en la plataforma o la URL es incorrecta."
            : "Ha ocurrido un error inesperado cargando este modulo."}
        </p>

        {error?.statusText && (
          <code className="mb-8 inline-block select-all rounded-md border border-app-border bg-app-bg px-3 py-1 text-sm text-app-text-muted">
            {error.statusText || error.message}
          </code>
        )}

        <Link
          to="/dashboard"
          className="app-button-primary inline-flex items-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}
