import { Globe, Mail, Linkedin, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import logoTransparent from "../../../assets/Logo app transparente.png";
import logoDark from "../../../assets/logo.png";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="-mx-4 mt-10 sm:-mx-6 lg:-mx-8 xl:-mx-10">
      <div className="h-px w-full bg-gradient-to-r from-transparent via-app-primary/50 to-transparent" />
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-app-border/60 to-transparent" />

      <div className="px-4 pb-5 pt-6 sm:px-6 lg:px-8 xl:px-10">
        <div className="rounded-3xl border border-app-border/80 bg-app-surface/80 px-4 py-7 shadow-[0_12px_40px_rgba(63,52,41,0.2)] backdrop-blur-xl dark:shadow-[0_12px_40px_rgba(0,0,0,0.28)] sm:px-5 md:px-8 md:py-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex flex-col gap-4">
              <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                <div className="flex h-20 w-32 items-center justify-center rounded-2xl border border-app-border bg-app-surface shadow-[0_0_26px_rgba(47,122,102,0.18)] dark:shadow-[0_0_26px_rgba(70,167,137,0.22)] overflow-hidden">
                  <img
                    src={logoTransparent}
                    alt="ORIENT A.KI"
                    className="h-full w-full object-contain object-center p-2 dark:hidden"
                  />
                  <img
                    src={logoDark}
                    alt="ORIENT A.KI"
                    className="h-full w-full object-contain object-center p-2 hidden dark:block"
                  />
                </div>
                <div className="min-w-0 flex flex-col">
                  <span className="truncate text-2xl font-display font-bold tracking-tight text-app-text-main">
                    ORIENT A.KI
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-text-muted/85">
                    Plataforma Vocacional
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-app-text-muted/90">
                  Cotejo ocupacional y orientación vocacional con enfoque
                  humano.
                </p>
                <p className="text-xs text-app-text-muted/80">
                  © {currentYear} ORIENT A.KI. Todos los derechos reservados.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
              <SocialLink
                href="https://akituespacio.com.ar"
                label="akituespacio.com.ar"
                icon={<Globe aria-hidden="true" className="h-4 w-4 shrink-0" />}
              />
              <SocialLink
                href="mailto:akituvocacion@gmail.com"
                label="akituvocacion@gmail.com"
                icon={<Mail aria-hidden="true" className="h-4 w-4 shrink-0" />}
              />
              <SocialLink
                href="https://wa.me/"
                label="WhatsApp"
                icon={
                  <MessageCircle
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0"
                  />
                }
              />
              <SocialLink
                href="https://www.linkedin.com"
                label="LinkedIn"
                icon={
                  <Linkedin aria-hidden="true" className="h-4 w-4 shrink-0" />
                }
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
  const isExternal = href.startsWith("http");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noreferrer" : undefined}
      aria-label={isExternal ? `${label} (abre en una pestaña nueva)` : label}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-app-border/80 bg-app-surface/70 px-3 py-1.5 text-left text-[11px] font-medium text-app-text-muted transition-colors hover:border-app-primary/50 hover:text-app-text-main"
    >
      {icon}
      <span className="min-w-0 break-all">{label}</span>
    </a>
  );
}
