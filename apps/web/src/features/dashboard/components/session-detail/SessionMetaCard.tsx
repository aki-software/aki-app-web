import React from "react";

export function SessionMetaCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  description?: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm transition-all duration-300 hover:shadow-md dark:shadow-none">
      <div className="mt-0.5 rounded-xl bg-app-bg p-2.5 text-app-primary border border-app-border shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-app-text-muted truncate">
          {label}
        </p>
        <p className="mt-1 text-sm font-bold text-app-text-main">
          {value ?? "—"}
        </p>
        {description && (
          <p className="mt-1.5 text-[10px] leading-tight text-app-text-muted font-medium italic">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
