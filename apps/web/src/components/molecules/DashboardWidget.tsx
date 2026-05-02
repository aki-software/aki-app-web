import { ElementType, ReactNode } from "react";

interface DashboardWidgetProps {
  title: string;
  description: string;
  icon: ElementType;
  iconColorClass?: string;
  children: ReactNode;
  headerActions?: ReactNode; 
}

export const DashboardWidget = ({
  title,
  description,
  icon: Icon,
  iconColorClass = "text-app-primary",
  children,
  headerActions,
}: DashboardWidgetProps) => {
  return (
    <div className="app-card min-w-0 !p-6 sm:!p-8 xl:!p-10 ring-1 ring-app-border/50">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6 sm:mb-8 xl:mb-10 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${iconColorClass}`} />
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-[0.12em] text-app-text-muted truncate">
              {title}
            </span>
          </div>
          <p className="mt-2 text-sm text-app-text-muted/80 leading-relaxed">
            {description}
          </p>
        </div>
        {headerActions && <div>{headerActions}</div>}
      </div>
      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
};