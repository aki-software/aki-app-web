import { ReactNode } from "react";
import { Button } from "../atoms/Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState = ({ 
  icon, 
  title, 
  description, 
  action, 
  className = "" 
}: EmptyStateProps) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center animate-in fade-in zoom-in-95 duration-500 ${className}`}>
      {icon && (
        <div className="mb-6 rounded-full bg-app-surface p-6 border border-app-border shadow-xl shadow-black/5 opacity-40">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-black text-app-text-main tracking-tight mb-2">
        {title}
      </h3>
      {description && (
        <p className="max-w-xs text-sm font-medium text-app-text-muted leading-relaxed opacity-60">
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant="outline"
          className="mt-8 !px-8 !py-3 border-app-primary/20 hover:border-app-primary/40 text-app-primary"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
