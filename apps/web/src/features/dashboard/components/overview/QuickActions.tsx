import { Plus, Search, FileDown, HelpCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  isAdmin?: boolean;
}

export function QuickActions({ isAdmin }: Props) {
  const navigate = useNavigate();

  const actions = [
    {
      id: 'emit',
      title: 'Emitir Lote',
      desc: 'Generar nuevos vouchers.',
      icon: Plus,
      color: 'text-app-primary bg-app-primary/5 border-app-primary/10',
      path: '/vouchers?create=true',
      show: isAdmin
    },
    {
      id: 'search',
      title: 'Buscar Paciente',
      desc: 'Localizar por nombre/email.',
      icon: Search,
      color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/10',
      path: '/vouchers',
      show: true
    },
    {
      id: 'report',
      title: 'Reporte Global',
      desc: 'Exportar analítica en PDF.',
      icon: FileDown,
      color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/10',
      path: '/results',
      show: true
    },
    {
      id: 'support',
      title: 'Centro de Ayuda',
      desc: 'Manuales y tickets.',
      icon: HelpCircle,
      color: 'text-amber-500 bg-amber-500/5 border-amber-500/10',
      path: '/settings',
      show: true
    }
  ].filter(a => a.show);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => navigate(action.path)}
          className="app-card-interactive !p-6 flex flex-col items-center text-center gap-4 border-app-border bg-app-surface/50 group relative overflow-hidden active:scale-95 transition-all"
        >
          <div className={`p-3 rounded-xl ${action.color} border shadow-inner group-hover:scale-110 transition-transform`}>
              <action.icon className="h-5 w-5" />
          </div>

          <div className="space-y-1">
              <h4 className="text-[13px] font-black text-app-text-main tracking-tight leading-none uppercase group-hover:text-app-primary transition-colors">
                  {action.title}
              </h4>
              <p className="text-[10px] font-medium text-app-text-muted opacity-60 leading-tight">
                  {action.desc}
              </p>
          </div>
        </button>
      ))}
    </div>
  );
}
