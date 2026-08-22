import { X } from "lucide-react";
import { ReactNode, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = "md",
  isLoading = false,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEscapeKey(onClose, !isOpen || isLoading);

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onClose();
      }
    },
    [onClose, isLoading],
  );

  useEffect(() => {
    if (isOpen) {
      previousFocus.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      document.body.style.overflow = "hidden";
      dialogRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      previousFocus.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 animate-in fade-in duration-300"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop con Blur Lux */}
      <div
        className="absolute inset-0 bg-app-bg/80 backdrop-blur-md transition-opacity"
        onClick={handleBackdropClick}
      />

      {/* Contenedor del Modal */}
      <div
        className={`relative flex max-h-[calc(100vh-2rem)] w-full ${sizeClasses[size]} flex-col overflow-hidden rounded-2xl border border-app-border bg-app-bg shadow-[0_24px_48px_-16px_rgba(0,0,0,0.45)] animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-app-border px-6 py-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-1.5 w-6 bg-app-primary rounded-full" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-app-text-muted">
                {subtitle || "Configuración"}
              </p>
            </div>
            <h3 className="text-xl font-black text-app-text-main truncate tracking-tight">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Cerrar modal"
            title="Cerrar modal"
            className="rounded-full p-2 text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors disabled:opacity-30"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 custom-scrollbar">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-4 border-t border-app-border px-6 py-4 sm:px-8">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
