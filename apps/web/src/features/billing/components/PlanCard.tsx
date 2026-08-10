import { Ticket, CheckCircle2, Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description?: string | null;
  voucherQuantity: number;
  priceUsd: number;
}

interface PlanCardProps {
  plan: Plan;
  isSelected: boolean;
  onSelect: () => void;
  actionLabel?: string;
  actionIcon?: React.ReactNode;
}

export function PlanCard({ plan, isSelected, onSelect, actionLabel, actionIcon }: PlanCardProps) {
  // Parse description into a list if it contains newlines, otherwise just an array of one
  const descriptionLines = plan.description 
    ? plan.description.split('\n').filter(line => line.trim().length > 0)
    : [];

  return (
    <div className={`group relative w-full h-full flex flex-col transition-all duration-300 rounded-3xl border-2 overflow-hidden bg-app-surface ${
      isSelected
        ? 'border-app-primary shadow-2xl shadow-app-primary/20 scale-[1.02]'
        : 'border-transparent hover:border-app-primary/30 shadow-lg hover:shadow-xl hover:-translate-y-1'
    }`}>
      
      {/* Decorative gradient background */}
      <div className={`absolute top-0 inset-x-0 h-32 bg-gradient-to-b opacity-10 pointer-events-none ${
        isSelected ? 'from-app-primary to-transparent' : 'from-app-text-main to-transparent'
      }`} />
      
      <div className="relative z-10 p-7 sm:p-8 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className={`w-4 h-4 ${isSelected ? 'text-app-primary' : 'text-app-text-muted'}`} />
              <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-app-primary' : 'text-app-text-muted'}`}>
                {plan.voucherQuantity} Vouchers
              </span>
            </div>
            <p className="font-display font-bold text-2xl text-app-text-main leading-tight">
              {plan.name}
            </p>
          </div>
          {isSelected && (
            <CheckCircle2 className="w-7 h-7 text-app-primary flex-shrink-0 bg-app-surface rounded-full shadow-sm" />
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1 mb-6">
          <span className="text-5xl font-display font-black text-app-text-main">
            ${plan.priceUsd}
          </span>
          <span className="text-sm font-semibold text-app-text-muted uppercase tracking-wider">USD</span>
        </div>

        <hr className="border-app-border mb-6" />

        {/* Description List */}
        {descriptionLines.length > 0 && (
          <ul className="space-y-3.5 mb-8 flex-1">
            {descriptionLines.map((line, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-app-primary flex-shrink-0" />
                <span className="text-sm text-app-text-main font-medium leading-relaxed">{line.trim()}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Action Button */}
        <div className="mt-auto pt-4">
          <button
            onClick={onSelect}
            className={`relative w-full py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 overflow-hidden active:scale-95 ${
              isSelected 
                ? 'bg-app-primary text-white shadow-lg shadow-app-primary/30' 
                : 'bg-app-surface border-2 border-app-border text-app-text-main hover:border-app-primary hover:bg-app-primary hover:text-white hover:shadow-lg hover:shadow-app-primary/30'
            }`}
          >
            {/* Hover glare effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:animate-[glare_1.5s_ease-in-out_infinite] pointer-events-none" />
            
            {actionIcon}
            <span className="relative z-10">{actionLabel || (isSelected ? 'Seleccionado' : 'Seleccionar')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}



