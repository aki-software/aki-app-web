import { AlertTriangle, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../../components/atoms/Button";
import { API_URL } from "../../../../config/app-config";
import { getStoredToken } from "../../../../utils/storage";

interface Props {
  sessionId: string;
}

export function SessionReportButton({ sessionId }: Props) {
  const [reportEmail, setReportEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSendReport = async () => {
    if (!sessionId || !reportEmail.trim()) return;

    setStatus("loading");
    
    try {
      const token = getStoredToken();
      const res = await fetch(`${API_URL}/sessions/${sessionId}/send-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: reportEmail }),
      });

      if (!res.ok) throw new Error();
      
      setStatus("success");
      setTimeout(() => setShowEmailInput(false), 3000);
    } catch {
      setStatus("error");
    }
  };

  const isLoading = status === "loading";

  return (
    <div className="flex flex-col gap-3">
      {!showEmailInput ? (
        <Button
          onClick={() => setShowEmailInput(true)}
          className="group"
        >
          <Mail className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
          Enviar informe
        </Button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center animate-in fade-in slide-in-from-top-2 duration-300">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => {
              setReportEmail(e.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="email@destino.com"
            disabled={isLoading}
            className="w-full sm:w-64 rounded-xl border border-app-border bg-app-bg/40 px-4 py-2.5 text-sm text-app-text-main placeholder:text-app-text-muted focus:border-app-primary focus:outline-none focus:ring-2 focus:ring-app-primary/20 transition-all disabled:opacity-50"
          />
          
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSendReport}
              isLoading={isLoading}
              disabled={!reportEmail.trim()}
              className="min-w-[100px]"
            >
              {status === "success" ? "Enviado" : "Confirmar"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setShowEmailInput(false);
                setStatus("idle");
              }}
              disabled={isLoading}
              className="!px-3"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Mensajes de Feedback */}
      <div className="min-h-[20px]">
        {status === "success" && (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-500 uppercase tracking-wider animate-in zoom-in-95">
            <CheckCircle className="h-3.5 w-3.5" /> Informe enviado con éxito
          </p>
        )}
        {status === "error" && (
          <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-500 uppercase tracking-wider animate-in shake">
            <AlertTriangle className="h-3.5 w-3.5" /> Error en el envío
          </p>
        )}
      </div>
    </div>
  );
};