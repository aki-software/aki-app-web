import { Activity, ClipboardList, MessageSquare, Ticket, LucideIcon } from "lucide-react";
import { AdminActivityEvent } from "@akit/contracts";

interface EventIconProps {
  type: AdminActivityEvent["type"];
  className?: string;
}

const ICON_MAP: Record<AdminActivityEvent["type"], { icon: LucideIcon; colorClass: string }> = {
  VOUCHER_REDEEMED: { icon: Ticket, colorClass: "text-emerald-500" },
  VOUCHER_ISSUED: { icon: Ticket, colorClass: "text-app-primary" },
  SESSION_COMPLETED: { icon: ClipboardList, colorClass: "text-emerald-500" },
  SESSION_STARTED: { icon: Activity, colorClass: "text-amber-500" },
};

export function EventIcon({ type, className = "h-4 w-4" }: EventIconProps) {
  const config = ICON_MAP[type] || { icon: MessageSquare, colorClass: "text-app-text-muted" };
  const Icon = config.icon;

  return <Icon className={`${className} ${config.colorClass}`} />;
}
