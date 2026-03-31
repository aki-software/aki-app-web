import { MessageSquare, Ticket, FileText, Send, UserCheck, ChevronRight } from "lucide-react";

export type ActivityEvent = {
  id: string;
  type: 'VOUCHER_REDEEMED' | 'VOUCHER_ASSIGNED' | 'EMAIL_SENT' | 'REPORT_GENERATED';
  title: string;
  description: string;
  timestamp: string;
  patientInitials?: string;
};

const MOCK_EVENTS: ActivityEvent[] = [
    {
        id: '1',
        type: 'VOUCHER_REDEEMED',
        title: 'Voucher Canjeado',
        description: 'Paciente J.P. inició el test vocacional con el código AK-9281',
        timestamp: 'hace 5 min',
        patientInitials: 'JP'
    },
    {
        id: '2',
        type: 'REPORT_GENERATED',
        title: 'Informe Generado',
        description: 'Se ha completado el procesamiento del test para M. García',
        timestamp: 'hace 42 min',
        patientInitials: 'MG'
    },
    {
        id: '3',
        type: 'EMAIL_SENT',
        title: 'Reporte Enviado',
        description: 'Se envió el informe PDF a mgarcia@email.com',
        timestamp: 'hace 1 hora',
    },
    {
        id: '4',
        type: 'VOUCHER_ASSIGNED',
        title: 'Código Asignado',
        description: 'Nuevo voucher asignado para Dr. Roberto Sanchez',
        timestamp: 'hace 3 horas',
    }
];

function getIcon(type: ActivityEvent['type']) {
    switch (type) {
        case 'VOUCHER_REDEEMED': return <Ticket className="h-4 w-4 text-emerald-500" />;
        case 'REPORT_GENERATED': return <FileText className="h-4 w-4 text-app-primary" />;
        case 'EMAIL_SENT': return <Send className="h-4 w-4 text-amber-500" />;
        case 'VOUCHER_ASSIGNED': return <UserCheck className="h-4 w-4 text-indigo-500" />;
        default: return <MessageSquare className="h-4 w-4 text-app-text-muted" />;
    }
}

export function ActivityFeed() {
  return (
    <div className="app-card !p-0 overflow-hidden shadow-2xl flex flex-col h-full border-app-border bg-app-surface">
      <div className="px-8 py-6 border-b border-app-border flex items-center justify-between bg-app-bg/10">
        <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="app-label !text-xs opacity-60">Actividad en Tiempo Real</h3>
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-app-primary hover:underline transition-all">Ver Historial</button>
      </div>

      <div className="divide-y divide-app-border overflow-y-auto max-h-[400px]">
        {MOCK_EVENTS.map((event) => (
          <div key={event.id} className="px-8 py-5 flex items-start gap-5 hover:bg-app-bg/30 transition-all cursor-pointer group">
            <div className="relative shrink-0">
                <div className="h-10 w-10 rounded-xl bg-app-bg border border-app-border flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-app-primary/20 transition-all">
                    {getIcon(event.type)}
                </div>
                {event.patientInitials && (
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-app-text-main border-2 border-app-surface flex items-center justify-center">
                        <span className="text-[8px] font-black text-app-surface">{event.patientInitials}</span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-app-text-main uppercase tracking-tight">{event.title}</span>
                    <span className="text-[9px] font-black text-app-text-muted opacity-40 uppercase tracking-widest">{event.timestamp}</span>
                </div>
                <p className="text-[11px] font-medium text-app-text-muted leading-relaxed line-clamp-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    {event.description}
                </p>
            </div>

            <ChevronRight className="h-4 w-4 text-app-text-muted opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        ))}
      </div>

      <div className="mt-auto px-8 py-5 bg-app-bg/5 border-t border-app-border flex items-center justify-center">
          <p className="app-label !text-[9px] opacity-40">Monitoreando 24/7 sistema de red A.kit</p>
      </div>
    </div>
  );
}
