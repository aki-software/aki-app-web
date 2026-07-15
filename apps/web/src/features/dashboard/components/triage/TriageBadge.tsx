import { AlertTriangle, BrainCircuit, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

type TriageFlag = "LOW_RELIABILITY" | "FATIGUE" | "RUSH";

interface TriageBadgeProps {
  flag: TriageFlag;
  sessionId?: string;
}

function getFlagConfig(flag: TriageFlag) {
  switch (flag) {
    case "LOW_RELIABILITY":
      return {
        label: "Baja Fiabilidad",
        icon: <BrainCircuit className="h-3.5 w-3.5" />,
        bg: "bg-status-error/15",
        text: "text-status-error",
        border: "border-status-error/30",
      };
    case "FATIGUE":
      return {
        label: "Fatiga",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        bg: "bg-orange-500/15",
        text: "text-orange-500",
        border: "border-orange-500/30",
      };
    case "RUSH":
      return {
        label: "Acelerado",
        icon: <Zap className="h-3.5 w-3.5" />,
        bg: "bg-yellow-500/15",
        text: "text-yellow-500",
        border: "border-yellow-500/30",
      };
  }
}

export function TriageBadge({ flag, sessionId }: TriageBadgeProps) {
  const navigate = useNavigate();
  const config = getFlagConfig(flag);

  const handleClick = () => {
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}`);
    }
  };

  return (
    <span
      onClick={handleClick}
      role={sessionId ? "button" : undefined}
      tabIndex={sessionId ? 0 : undefined}
      onKeyDown={(e) => {
        if (sessionId && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          navigate(`/dashboard/sessions/${sessionId}`);
        }
      }}
      className={`
        inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
        text-[11px] font-bold uppercase tracking-wider
        ${config.bg} ${config.text} ${config.border}
        ${sessionId ? "cursor-pointer hover:brightness-110 active:scale-95 transition-all" : ""}
      `}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
