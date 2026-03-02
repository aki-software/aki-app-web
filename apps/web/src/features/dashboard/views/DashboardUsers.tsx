import { ShieldAlert, Users as UsersIcon } from "lucide-react";

export function DashboardUsers() {
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center mb-2">
          <UsersIcon className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Administración de Usuarios</h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Gestor de accesos para Colegios, Psicopedagogos y Administradores del sistema A.kit.
        </p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Psicopedagogos</h3>
            <p className="text-sm text-gray-500">12 activos</p>
          </div>
          <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Instituciones</h3>
            <p className="text-sm text-gray-500">4 registradas</p>
          </div>
          <div className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Estudiantes</h3>
            <p className="text-sm text-gray-500">1,248 app test users</p>
          </div>
        </div>

        <div className="mt-6 flex items-center p-4 text-sm text-yellow-800 border border-yellow-300 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-800" role="alert">
          <ShieldAlert className="flex-shrink-0 inline w-4 h-4 mr-3" />
          <span className="sr-only">Info</span>
          <div>
            <span className="font-medium">Work in Progress!</span> La gestión de roles (RBAC) está pauteada para desarrollarse tras estabilizar la sincronía de la App Móvil.
          </div>
        </div>
      </div>
    </div>
  );
}
