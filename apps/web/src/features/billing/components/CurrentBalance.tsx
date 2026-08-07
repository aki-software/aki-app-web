import { Ticket } from 'lucide-react';

interface CurrentBalanceProps {
  balance: number;
}

export function CurrentBalance({ balance }: CurrentBalanceProps) {
  return (
    <div className="flex flex-col items-end text-right">
      <span className="app-label !text-app-primary mb-1">Total de vouchers</span>
      <div className="flex items-center gap-3 px-4 py-2 bg-app-primary/5 border border-app-primary/20 rounded-2xl">
        <div className="p-1.5 bg-app-primary/10 rounded-lg">
          <Ticket className="w-5 h-5 text-app-primary" />
        </div>
        <p className="text-3xl font-display font-black text-app-text-main tracking-tight leading-none">
          {balance.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
