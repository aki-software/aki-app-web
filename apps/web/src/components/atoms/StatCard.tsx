import { type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  icon?: LucideIcon | ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  colorClass?: string;
  bgColorClass?: string;
  borderColorClass?: string;
  valueColor?: string;
  className?: string;
}

export function StatCard({
  icon,
  label,
  value,
  unit,
  description,
  colorClass = "text-app-primary",
  bgColorClass = "from-app-surface to-app-bg/30",
  borderColorClass = "border-app-border",
  valueColor: valueColorProp,
  className,
}: StatCardProps) {
  const resolvedColor = valueColorProp ?? colorClass;

  const renderIcon = (className: string) => {
    if (!icon) return null;
    if (typeof icon === "object" && "type" in icon) {
      // ReactNode element passed directly
      return <>{icon}</>;
    }
    const IconComponent = icon as LucideIcon;
    return <IconComponent className={className} aria-hidden="true" />;
  };

  return (
    <div className={`app-card !p-7 shadow-lg ${borderColorClass} bg-gradient-to-br ${bgColorClass} group relative overflow-hidden${className ? ` ${className}` : ""}`}>
      <div className="absolute -right-3 -bottom-3 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-700">
        {renderIcon(`h-20 w-20 ${resolvedColor}`)}
      </div>
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl border shadow-sm ${resolvedColor.replace('text-', 'bg-').replace('500', '500/10').replace('400', '400/10')} ${borderColorClass.replace('border-app-border', 'border-app-border')}`}>
            {renderIcon(`h-5 w-5 ${resolvedColor}`)}
          </div>
          <span className="app-label opacity-60 tracking-wider">{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`app-value !text-3xl font-black tracking-tighter leading-none ${resolvedColor.includes('text-app-text-muted') ? 'text-app-text-main' : resolvedColor}`}>
            {value}
          </span>
          {unit && (
            <span className="text-[10px] font-black text-app-text-muted/60 uppercase tracking-widest">
              {unit}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs font-medium text-app-text-muted/80 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
