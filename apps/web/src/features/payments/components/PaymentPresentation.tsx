import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Modal } from "../../../components/atoms/Modal";
import { paymentStatusLabel } from "../utils/payment-presenters";

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-status-success/10 text-status-success border-status-success/20",
  REJECTED: "bg-status-error/10 text-status-error border-status-error/20",
  PENDING: "bg-status-warning/10 text-status-warning border-status-warning/20",
  EXPIRED: "bg-app-border text-app-text-muted border-app-border",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  PENDING: Clock,
  EXPIRED: Clock,
};

export function PaymentStatusBadge({ status }: { status: string }) {
  const Icon = STATUS_ICONS[status] ?? Clock;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.EXPIRED}`}
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {paymentStatusLabel(status)}
    </span>
  );
}

interface PaymentDialogProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export function PaymentDialog({
  title,
  subtitle,
  children,
  onClose,
}: PaymentDialogProps) {
  return (
    <Modal isOpen onClose={onClose} title={title} subtitle={subtitle} size="md">
      {children}
    </Modal>
  );
}
