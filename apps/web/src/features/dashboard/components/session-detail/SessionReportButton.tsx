import { useState } from "react";
import { Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface Props {
  sessionId: string;
}

export function SessionReportButton({ sessionId }: Props) {
  const [reportEmail, setReportEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [reportStatus, setReportStatus] = useState<"idle" | "success" | "error">("idle");

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
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          <Mail className="h-4 w-4" />
          Enviar informe
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            placeholder="email@destino.com"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <button
            onClick={handleSendReport}
            disabled={sendingReport || !reportEmail.trim()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
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
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
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
          <AlertTriangle className="h-3.5 w-3.5" /> Error al enviar. Intentá de nuevo.
        </p>
      )}
    </div>
  );
}
