import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  unit?: string;
  colorClass?: string;
  bgColorClass?: string;
  borderColorClass?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  colorClass = "text-app-primary",
  bgColorClass = "from-app-surface to-app-bg/30",
  borderColorClass = "border-app-border",
}: StatCardProps) {
  return (
    <div className={`app-card !p-7 shadow-lg ${borderColorClass} bg-gradient-to-br ${bgColorClass} group relative overflow-hidden`}>
      <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
        <Icon className={`h-20 w-20 ${colorClass}`} />
      </div>
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shadow-sm ${colorClass.replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10')} ${borderColorClass.replace('border-app-border', 'border-app-border')}`}>
            <Icon className={`h-5 w-5 ${colorClass}`} />
          </div>
          <span className="app-label opacity-60 tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`app-value !text-3xl font-black tracking-tighter leading-none ${colorClass.includes('text-app-text-muted') ? 'text-app-text-main' : colorClass}`}>
            {value}
          </span>
          {unit && (
            <span className="text-[10px] font-black text-app-text-muted/60 uppercase tracking-widest">
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
