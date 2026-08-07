import { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
}

export const Select = ({ label, options, className = "", id, ...props }: SelectProps) => {
  return (
    <label htmlFor={id} className="block w-full">
      {label && <span className="app-label mb-2 block">{label}</span>}
      <div className="relative">
        <select
          id={id}
          className={`app-select h-[52px] w-full rounded-2xl border border-app-border bg-app-surface pl-4 pr-10 text-sm font-semibold text-app-text-main outline-none appearance-none transition-all focus:border-app-primary focus:ring-4 focus:ring-app-primary/5 [color-scheme:dark] ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-[#0f1014] text-app-text-main">
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-app-text-muted/60">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </label>
  );
};