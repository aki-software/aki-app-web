import { ShieldCheck, Cpu, Globe, Heart } from "lucide-react";

export function GlobalFooter() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="mt-20 pt-10 pb-16 border-t border-app-border/40">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
        
        {/* Info de Marca & Copyright */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
            <span className="app-label !text-[10px]">A.kit Platform v3.5.2</span>
          </div>
          <p className="text-[11px] font-medium text-app-text-muted">
            © {currentYear} A.kit Intelligence. Todos los derechos reservados. 
            <br />
            Tecnología de diagnóstico vocacional de alto rendimiento.
          </p>
        </div>

        {/* Status del Sistema */}
        <div className="flex items-center gap-8 bg-app-bg px-6 py-4 rounded-2xl border border-app-border shadow-sm">
            <div className="flex flex-col gap-1">
                <span className="app-label !text-[8px] opacity-40">ESTADO RED</span>
                <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-app-primary" />
                    <span className="text-[10px] font-black text-app-text-main uppercase">Operativo</span>
                </div>
            </div>
            <div className="h-8 w-[1px] bg-app-border" />
            <div className="flex flex-col gap-1">
                <span className="app-label !text-[8px] opacity-40">SEGURIDAD</span>
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] font-black text-app-text-main uppercase">Encriptado</span>
                </div>
            </div>
            <div className="h-8 w-[1px] bg-app-border" />
            <div className="flex flex-col gap-1">
                <span className="app-label !text-[8px] opacity-40">MOTOR</span>
                <div className="flex items-center gap-2">
                    <Cpu className="h-3 w-3 text-app-primary" />
                    <span className="text-[10px] font-black text-app-text-main uppercase">Lux 5.0</span>
                </div>
            </div>
        </div>

        {/* Links Rápidos */}
        <div className="flex items-center gap-6">
            <button className="app-label !text-[10px] hover:text-app-primary transition-colors cursor-pointer">Soporte</button>
            <button className="app-label !text-[10px] hover:text-app-primary transition-colors cursor-pointer">Privacidad</button>
            <div className="flex items-center gap-2 text-[10px] font-black text-app-text-muted opacity-40">
                <span>CON</span>
                <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
                <span>EN ARG</span>
            </div>
        </div>
      </div>
    </footer>
  );
}
