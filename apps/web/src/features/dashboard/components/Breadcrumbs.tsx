import { useLocation, useNavigate } from "react-router-dom";

interface BreadcrumbsProps {
  labels?: Record<string, string>;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  results: "Resultados",
  sessions: "Resultados",
  vouchers: "Vouchers",
  users: "Usuarios",
  institutions: "Instituciones",
  settings: "Configuración",
  activity: "Actividad",
};

const DYNAMIC_LABELS: Record<string, string> = {
  sessions: "Sesión",
  institutions: "Institución",
};

export function Breadcrumbs({ labels = {} }: BreadcrumbsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split("/").filter(Boolean);

  // No breadcrumb for root dashboard
  if (segments.length <= 1 || segments[0] !== "dashboard") return null;

  const crumbs = segments.map((segment, index) => {
    const resolvedLabel =
      labels[segment] ??
      SEGMENT_LABELS[segment] ??
      (index > 0 ? DYNAMIC_LABELS[segments[index - 1]] : undefined) ??
      segment;

    const path = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    return { label: resolvedLabel, path, isLast };
  });

  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold text-app-text-muted/70 uppercase tracking-[0.15em]">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex items-center gap-2">
          {index > 0 && <span className="opacity-30">/</span>}
          {crumb.isLast ? (
            <span className="text-app-text-muted/80 truncate max-w-[250px]">
              {crumb.label}
            </span>
          ) : (
            <button
              onClick={() => navigate(crumb.path)}
              className="hover:text-app-primary transition-colors"
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
