import { DivideIcon as LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: typeof LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="app-card border-none hover:shadow-2xl hover:shadow-app-primary/10 transition-all duration-500 group">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          {/* Clase Maestra de Etiqueta */}
          <h3 className="app-label transition-colors group-hover:text-app-primary">
            {title}
          </h3>
          {/* Clase Maestra de Valor */}
          <p className="app-value mt-4">
            {value}
          </p>
        </div>
        <div className="p-5 bg-app-bg border border-app-border rounded-2xl text-app-primary shadow-sm group-hover:shadow-app-primary/20 transition-all">
          <Icon className="w-6 h-6" />
        </div>
      </div>
      
      {trend && (
        <div className={`mt-6 flex items-center ${
          trend.isPositive ? "text-emerald-500" : "text-rose-500"
        }`}>
          <div className="app-tag flex items-center px-2 py-1 bg-emerald-500/5 border-emerald-500/20 text-emerald-500 lowercase tracking-normal font-black">
            {trend.isPositive ? (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            )}
            {Math.abs(trend.value)}%
          </div>
          {/* Clase Maestra de Subtítulo */}
          <span className="app-desc ml-3 text-[10px] font-black uppercase tracking-widest opacity-60">semanal</span>
        </div>
      )}
    </div>
  );
}
