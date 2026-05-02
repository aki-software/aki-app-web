import { useRouteError } from "react-router-dom";

export const AppErrorBoundary = () => {
  const error = useRouteError() as Error;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">¡Ups! Algo salió mal.</h1>
      <p className="text-gray-600 mb-4">
        Ha ocurrido un error inesperado en la aplicación.
      </p>
      {/* En producción, puedes ocultar este detalle técnico */}
      <pre className="bg-gray-100 p-4 rounded text-sm text-left overflow-auto max-w-full">
        {error?.message || "Error desconocido"}
      </pre>
      <button 
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Recargar página
      </button>
    </div>
  );
};