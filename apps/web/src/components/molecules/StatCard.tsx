import { ReactNode } from "react";

export interface StatCardProps {
  label: string;
  value: string | number;
  description?: string;    
  valueColor?: string;      
  icon?: ReactNode;         
  className?: string;       
}

export const StatCard = ({
  label,
  value,
  description,
  valueColor = "text-app-text-main",
  icon,
  className = "app-card py-5 px-6", 
}: StatCardProps) => {
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        {icon && icon}
        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-app-text-muted/70">
          {label}
        </p>
      </div>
      
      <p className={`mt-2 text-3xl md:text-2xl font-black tracking-tight ${valueColor}`}>
        {value}
      </p>
      
      {description && (
        <p className="mt-2 text-xs text-app-text-muted/80">
          {description}
        </p>
      )}
    </div>
  );
};