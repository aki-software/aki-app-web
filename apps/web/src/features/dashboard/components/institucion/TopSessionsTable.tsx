import { ArrowRight, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type InstitutionOverviewResponse } from "../../api/dashboard";

type TopSession = InstitutionOverviewResponse["topSessions"][number];

const toMs = (val: string | Date | number | null | undefined): number | null => { 
  if (!val) return null;
  const ms = new Date(val).getTime(); 
  return Number.isFinite(ms) ? ms : null; 
};

const formatShortDate = (val: string | Date | number | null | undefined): string => { 
  const ms = toMs(val); 
  return ms 
    ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(ms)) 
    : "--"; 
};

// 3. El resto de los helpers ya estaban bien tipados
const getSessionChannel = (s: TopSession) => s.voucherCode || s.paymentStatus === "VOUCHER_REDEEMED" ? "VOUCHER" : "INDIVIDUAL";
const getSessionStatusLabel = (s: TopSession) => s.reportUnlockedAt ? "Informe desbloqueado" : (s.resultsCount ?? 0) > 0 ? "Completado" : "Iniciado";

export const TopSessionsTable = ({ sessions }: { sessions: TopSession[] }) => {
  const navigate = useNavigate();

  return (
    <div className="app-card !p-0 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-app-bg/50 border-b border-app-border">
            <tr>
              <th className="px-6 py-5 app-label opacity-40">Paciente</th>
              <th className="px-6 py-5 app-label opacity-40">Fecha</th>
              <th className="px-6 py-5 app-label opacity-40">Código</th>
              <th className="px-6 py-5 app-label opacity-40">Canal</th>
              <th className="px-6 py-5 app-label opacity-40">Estado</th>
              <th className="px-6 py-5 app-label opacity-40 text-right">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border bg-app-surface">
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center opacity-40">
                  <div className="flex flex-col items-center gap-4">
                     <Filter className="h-10 w-10" />
                     <p className="app-label">Todavía no hay tests registrados.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sessions.map((s) => (
                <tr key={s.id} className="hover:bg-app-surface/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-app-text-main">{s.patientName}</td>
                  <td className="px-6 py-4 text-xs text-app-text-muted">{formatShortDate(s.sessionDate ?? s.createdAt)}</td>
                  <td className="px-6 py-4 text-xs font-black tracking-widest text-app-text-main">{s.hollandCode}</td>
                  <td className="px-6 py-4 text-xs text-app-text-muted">{getSessionChannel(s) === "VOUCHER" ? "Con voucher" : "Pago individual"}</td>
                  <td className="px-6 py-4 text-xs text-app-text-muted">{getSessionStatusLabel(s)}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => navigate(`/dashboard/sessions/${s.id}`)}
                      className="inline-flex items-center rounded-xl border border-app-border bg-app-bg px-4 py-2 text-[10px] font-black uppercase tracking-widest text-app-text-main hover:border-app-primary hover:text-app-primary transition-all"
                    >
                      Abrir <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};