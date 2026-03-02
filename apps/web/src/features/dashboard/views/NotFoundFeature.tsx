import { useRouteError, Link } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export function NotFoundFeature() {
  const error = useRouteError() as { status?: number, statusText?: string, message?: string };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
        Módulo No Encontrado
      </h1>
      
      <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        {error?.status === 404 
          ? "Ups, parece que esta sección todavía no está construida en la plataforma o la URL es incorrecta." 
          : "Ha ocurrido un error inesperado cargando este módulo."}
      </p>

      {error?.statusText && (
        <code className="text-sm bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1 rounded-md mb-8 inline-block select-all">
          {error.statusText || error.message}
        </code>
      )}

      <Link
        to="/dashboard"
        className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Volver al Dashboard
      </Link>
    </div>
  );
}
