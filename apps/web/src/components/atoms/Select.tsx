import { SelectHTMLAttributes } from "react";

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
      <select
        id={id}
        className={`app-select h-[52px] w-full rounded-2xl border border-app-border bg-app-surface px-4 text-sm font-semibold text-app-text-main outline-none transition-all focus:border-app-primary focus:ring-4 focus:ring-app-primary/5 [color-scheme:dark] ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-[#0f1014] text-app-text-main">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};