import { ChevronDown } from "lucide-react";

interface PeriodOption {
  label: string;
  value: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { label: "Últimos 7 días", value: 7 },
  { label: "Últimos 15 días", value: 15 },
  { label: "Últimos 30 días", value: 30 },
  { label: "Últimos 90 días", value: 90 },
  { label: "Último año", value: 365 },
];

interface PeriodSelectorProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export const PeriodSelector = ({ value, onChange, className = "" }: PeriodSelectorProps) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="appearance-none pl-4 pr-10 py-3 rounded-2xl bg-app-surface border border-app-border text-xs font-bold text-app-text-main focus:outline-none focus:ring-2 focus:ring-app-primary/20 uppercase tracking-wider cursor-pointer hover:border-app-primary/30 transition-all"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} style={{ backgroundColor: 'var(--color-app-bg)' }}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <ChevronDown className="h-4 w-4" />
      </div>
    </div>
  );
};
