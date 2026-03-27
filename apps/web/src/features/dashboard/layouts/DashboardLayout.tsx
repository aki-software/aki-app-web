import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Settings, LogOut, ChartPie, Ticket } from "lucide-react";
import { useAuth } from "../../auth/hooks/useAuth";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { name: "Resumen", path: "/dashboard", icon: LayoutDashboard },
    { name: "Resultados", path: "/dashboard/results", icon: ChartPie },
    { name: "Vouchers", path: "/dashboard/vouchers", icon: Ticket },
    { name: "Instituciones y terapeutas", path: "/dashboard/users", icon: Users },
    { name: "Material teórico", path: "/dashboard/settings", icon: Settings },
  ];

  const currentItem = navItems.find((item) => location.pathname === item.path);
  const headerTitle = currentItem?.name ?? "Dashboard";
  const roleLabel =
    user?.role === "ADMIN"
      ? "Administrador plataforma"
      : user?.institutionId
        ? "Owner institucional"
        : "Usuario autenticado";
  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "AK";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:flex flex-col">
        <div className="px-6 py-6 border-b border-gray-200 dark:border-gray-700 flex items-center">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
            <span className="text-white font-bold text-xl">A</span>
          </div>
          <span className="text-gray-900 dark:text-white text-xl font-bold tracking-tight">A.kit Panel MVP</span>
        </div>

        <div className="flex-1 px-4 py-6 overflow-y-auto">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white"
                  }`}
                >
                  <item.icon
                    className={`flex-shrink-0 w-5 h-5 mr-3 ${
                      isActive
                        ? "text-blue-700 dark:text-blue-400"
                        : "text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300"
                    }`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-white transition-colors"
          >
            <LogOut className="flex-shrink-0 w-5 h-5 mr-3 text-gray-400" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 z-10">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white">{headerTitle}</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{user?.name ?? "Usuario"}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{user?.email ?? "Sin email"}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium border border-blue-200 dark:border-blue-800">
              {initials}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
