import { AlertTriangle, CheckCircle, Loader2, Mail } from "lucide-react";
import { useState } from "react";

interface Props {
  sessionId: string;
}

export function SessionReportButton({ sessionId }: Props) {
  const [reportEmail, setReportEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleSendReport = async () => {
    if (!sessionId || !reportEmail.trim()) return;
    setSendingReport(true);
    setReportStatus("idle");
    try {
      const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
      const token = localStorage.getItem("akit_access_token");
      const res = await fetch(`${API_URL}/sessions/${sessionId}/send-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: reportEmail }),
      });
      setReportStatus(res.ok ? "success" : "error");
    } catch {
      setReportStatus("error");
    } finally {
      setSendingReport(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {!showEmailInput ? (
        <button
          onClick={() => setShowEmailInput(true)}
          className="app-button-primary inline-flex items-center gap-2"
        >
          <Mail className="h-4 w-4" />
          Enviar informe
        </button>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            placeholder="email@destino.com"
            className="w-full rounded-lg border border-app-border bg-app-bg/70 px-3 py-2 text-sm text-app-text-main placeholder:text-app-text-muted focus:border-app-primary focus:outline-none focus:ring-2 focus:ring-app-primary/35"
          />
          <button
            onClick={handleSendReport}
            disabled={sendingReport || !reportEmail.trim()}
            className="app-button-primary inline-flex min-w-24 items-center justify-center rounded-lg px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sendingReport ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Enviar"
            )}
          </button>
          <button
            onClick={() => {
              setShowEmailInput(false);
              setReportStatus("idle");
            }}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-app-text-muted transition hover:border-app-primary/45 hover:text-app-text-main"
          >
            Cancelar
          </button>
        </div>
      )}
      {reportStatus === "success" && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
          <CheckCircle className="h-3.5 w-3.5" /> Informe enviado correctamente
        </p>
      )}
      {reportStatus === "error" && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
          <AlertTriangle className="h-3.5 w-3.5" /> Error al enviar. Intentá de
          nuevo.
        </p>
      )}
    </div>
  );
}
