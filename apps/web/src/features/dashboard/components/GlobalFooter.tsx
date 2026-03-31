import { Cpu, Globe, Heart, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="-mx-8 mt-4 border-t border-app-border/50 pt-3 md:-mx-10 lg:-mx-12">
      <div className="px-8 md:px-10 lg:px-12">
        <div className="grid gap-4 py-3 lg:grid-cols-[1.1fr_1.4fr_auto] lg:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-app-primary shadow-[0_0_12px_rgba(163,184,117,0.45)]" />
              <span className="text-[11px] font-semibold tracking-[0.1em] text-app-text-muted uppercase">
                A.kit Platform v3.5.2
              </span>
            </div>
            <p className="max-w-xl text-xs leading-relaxed text-app-text-muted/90">
              © {currentYear} A.kit Intelligence. Monitoreo operativo de
              vouchers, informes y sesiones.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <StatusPill
              icon={<Globe className="h-4 w-4 text-app-primary" />}
              label="Plataforma"
              value="Operativa"
            />
            <StatusPill
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
              label="Seguridad"
              value="TLS activo"
            />
            <StatusPill
              icon={<Cpu className="h-4 w-4 text-app-primary" />}
              label="Motor"
              value="Lux 5.0"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-start lg:justify-end">
            <FooterLink label="Soporte" />
            <FooterLink label="Privacidad" />
            <div className="ml-1 inline-flex items-center gap-1.5 rounded-full border border-app-border/70 bg-black/20 px-3 py-1 text-[11px] text-app-text-muted">
              <span>Hecho en ARG</span>
              <Heart className="h-3.5 w-3.5 text-rose-400 fill-rose-400" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function StatusPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-app-border/70 bg-black/15 px-3 py-1.5">
      <div className="mb-1 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-medium text-app-text-muted">
          {label}
        </span>
      </div>
      <p className="text-[13px] font-semibold text-app-text-main">{value}</p>
    </div>
  );
}

function FooterLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="rounded-full border border-app-border/80 bg-black/20 px-3 py-1 text-[11px] font-medium text-app-text-muted transition-colors hover:border-app-primary/50 hover:text-app-text-main"
    >
      {label}
    </button>
  );
}
