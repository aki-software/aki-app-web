import { PaymentGateway } from '@akit/contracts';
import { CreditCard, Wallet } from 'lucide-react';

interface GatewaySelectorProps {
  selectedGateway: PaymentGateway;
  onSelect: (gateway: PaymentGateway) => void;
}

export function GatewaySelector({ selectedGateway, onSelect }: GatewaySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => onSelect('STRIPE')}
        className={`relative overflow-hidden group p-6 rounded-2xl border-2 transition-all duration-300 ${
          selectedGateway === 'STRIPE'
            ? 'border-app-primary bg-app-primary/5 shadow-md shadow-app-primary/10'
            : 'border-app-border hover:border-app-primary/40 bg-app-surface'
        } text-left flex items-center gap-4`}
      >
        <div className={`p-3 rounded-xl transition-colors duration-300 ${selectedGateway === 'STRIPE' ? 'bg-app-primary text-white' : 'bg-app-surface border border-app-border text-app-text-muted group-hover:text-app-primary'}`}>
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-app-text-main text-lg">Stripe</h3>
          <p className="text-sm font-medium text-app-text-muted">Tarjetas (Internacional)</p>
        </div>
        {selectedGateway === 'STRIPE' && (
          <div className="absolute top-0 right-0 p-4">
            <div className="w-2 h-2 rounded-full bg-app-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
          </div>
        )}
      </button>

      <button
        onClick={() => onSelect('MERCADO_PAGO')}
        className={`relative overflow-hidden group p-6 rounded-2xl border-2 transition-all duration-300 ${
          selectedGateway === 'MERCADO_PAGO'
            ? 'border-app-primary bg-app-primary/5 shadow-md shadow-app-primary/10'
            : 'border-app-border hover:border-app-primary/40 bg-app-surface'
        } text-left flex items-center gap-4`}
      >
        <div className={`p-3 rounded-xl transition-colors duration-300 ${selectedGateway === 'MERCADO_PAGO' ? 'bg-app-primary text-white' : 'bg-app-surface border border-app-border text-app-text-muted group-hover:text-app-primary'}`}>
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-app-text-main text-lg">MercadoPago</h3>
          <p className="text-sm font-medium text-app-text-muted">Tarjetas y Saldo (AR)</p>
        </div>
        {selectedGateway === 'MERCADO_PAGO' && (
          <div className="absolute top-0 right-0 p-4">
            <div className="w-2 h-2 rounded-full bg-app-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
          </div>
        )}
      </button>
    </div>
  );
}
