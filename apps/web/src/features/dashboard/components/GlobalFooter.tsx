import { Linkedin, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="-mx-8 mt-10 md:-mx-10 lg:-mx-12">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-app-primary/50 to-transparent" />
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-app-border/60 to-transparent" />

      <div className="px-8 pb-5 pt-6 md:px-10 lg:px-12">
        <div className="rounded-3xl border border-app-border/80 bg-black/25 px-5 py-5 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl md:px-6 md:py-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-app-border bg-black/35 shadow-[0_0_22px_rgba(204,255,0,0.2)] overflow-hidden">
                  <img
                    src="/logo2.fw.png"
                    alt="ORIENT A.KI"
                    className="h-full w-full object-contain object-center p-1"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-display font-bold tracking-tight text-app-text-main">
                    ORIENT A.KI
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-app-text-muted/85">
                    Plataforma Vocacional
                  </span>
                </div>
              </div>
              <p className="max-w-2xl text-xs leading-relaxed text-app-text-muted/90">
                © {currentYear} ORIENT A.KI. Todos los derechos reservados.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <SocialLink
                href="https://wa.me/"
                label="WhatsApp"
                icon={<MessageCircle className="h-4 w-4" />}
              />
              <SocialLink
                href="https://x.com"
                label="X"
                icon={<span className="text-[13px] font-bold">X</span>}
              />
              <SocialLink
                href="https://www.linkedin.com"
                label="LinkedIn"
                icon={<Linkedin className="h-4 w-4" />}
              />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-app-border/80 bg-black/20 px-3 py-1.5 text-[11px] font-medium text-app-text-muted transition-colors hover:border-app-primary/50 hover:text-app-text-main"
    >
      {icon}
      <span>{label}</span>
    </a>
  );
}
