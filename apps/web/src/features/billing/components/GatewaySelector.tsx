import { PaymentGateway } from "@akit/contracts";
import { CreditCard, Wallet } from "lucide-react";

interface GatewaySelectorProps {
  selectedGateway: PaymentGateway;
  availableGateways: readonly PaymentGateway[];
  onSelect: (gateway: PaymentGateway) => void;
}

const gatewayDetails: Record<
  PaymentGateway,
  { name: string; description: string; Icon: typeof CreditCard }
> = {
  STRIPE: {
    name: "Stripe",
    description: "Tarjetas (Internacional)",
    Icon: CreditCard,
  },
  MERCADO_PAGO: {
    name: "MercadoPago",
    description: "Tarjetas y Saldo (AR)",
    Icon: Wallet,
  },
};

export function GatewaySelector({
  selectedGateway,
  availableGateways,
  onSelect,
}: GatewaySelectorProps) {
  return (
    <div className="flex flex-col gap-3">
      {availableGateways.map((gateway) => {
        const { name, description, Icon } = gatewayDetails[gateway];
        const isSelected = selectedGateway === gateway;

        return (
          <button
            key={gateway}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(gateway)}
            className={`relative overflow-hidden group p-6 rounded-2xl border-2 transition-all duration-300 ${
              isSelected
                ? "border-app-primary bg-app-primary/5 shadow-md shadow-app-primary/10"
                : "border-app-border hover:border-app-primary/40 bg-app-surface"
            } text-left flex items-center gap-4`}
          >
            <div
              className={`p-3 rounded-xl transition-colors duration-300 ${
                isSelected
                  ? "bg-app-primary text-white"
                  : "bg-app-surface border border-app-border text-app-text-muted group-hover:text-app-primary"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-app-text-main text-lg">{name}</h3>
              <p className="text-sm font-medium text-app-text-muted">
                {description}
              </p>
            </div>
            {isSelected ? (
              <div className="absolute top-0 right-0 p-4">
                <div className="w-2 h-2 rounded-full bg-app-primary shadow-[0_0_8px_rgba(var(--color-primary),0.8)]" />
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
