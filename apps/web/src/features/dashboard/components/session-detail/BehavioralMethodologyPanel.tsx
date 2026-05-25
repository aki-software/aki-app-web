import { useState } from "react";
import {
  X,
  BookOpen,
  HeartCrack,
  AlertCircle,
  Zap,
  ActivitySquare,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface Section {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    id: "selectividad",
    icon: <HeartCrack className="h-5 w-5 text-rose-400" />,
    iconBg: "bg-rose-500/10",
    title: "Selectividad",
    subtitle: "Explorador · Selectivo · Hiper-Selectivo",
    body: (
      <div className="space-y-3 text-sm text-app-text-muted leading-relaxed">
        <p>
          Durante el test, el paciente ve tarjetas con imágenes de actividades y
          decide si le gustan o no. El sistema cuenta cuántas aceptó y cuántas
          rechazó.
        </p>
        <div className="rounded-xl bg-app-bg border border-app-border p-4 space-y-2">
          <p className="font-semibold text-app-text-main text-xs uppercase tracking-wider mb-3">
            Cómo se interpreta
          </p>
          <p>
            <span className="font-bold text-rose-400">Perfil Explorador</span>{" "}
            — Acepta más del 75% de las tarjetas. Puede indicar dificultad para
            acotar intereses, o un fuerte deseo de complacer (aceptar todo para
            "quedar bien"). Vale la pena explorarlo en sesión.
          </p>
          <p>
            <span className="font-bold text-orange-400">
              Perfil Hiper-Selectivo
            </span>{" "}
            — Rechaza más del 75% de las tarjetas. Puede mostrar apatía,
            desinterés generalizado, o estándares muy rígidos sobre lo que
            considera "aceptable".
          </p>
          <p>
            <span className="font-bold text-emerald-400">
              Selectividad Saludable
            </span>{" "}
            — Acepta entre el 25% y el 75%. La persona discrimina con criterio:
            ni acepta todo ni rechaza todo. Es la zona esperada.
          </p>
        </div>
        <p className="text-xs text-app-text-muted/60 italic">
          Este indicador solo describe un patrón — no es un diagnóstico. Siempre
          contextualizarlo con la conversación clínica.
        </p>
      </div>
    ),
  },
  {
    id: "conflicto",
    icon: <AlertCircle className="h-5 w-5 text-yellow-400" />,
    iconBg: "bg-yellow-500/10",
    title: "Foco de Conflicto",
    subtitle: "Dudas y retrocesos por área",
    body: (
      <div className="space-y-3 text-sm text-app-text-muted leading-relaxed">
        <p>
          En el test, el paciente puede presionar "Deshacer" para cambiar una
          decisión que tomó. Cada vez que lo hace en una categoría (por ejemplo,
          "Social" o "Artístico"), el sistema lo registra.
        </p>
        <div className="rounded-xl bg-app-bg border border-app-border p-4 space-y-2">
          <p className="font-semibold text-app-text-main text-xs uppercase tracking-wider mb-3">
            Qué significa
          </p>
          <p>
            El área con más retrocesos es donde el paciente mostró mayor{" "}
            <span className="font-bold text-yellow-400">ambivalencia</span>:{" "}
            no pudo decidir con seguridad si le gusta o no le gusta. Esto no es
            un problema — es una señal valiosa. Suele ser un punto de partida
            excelente para la conversación clínica.
          </p>
          <p>
            Si los retrocesos se distribuyen entre varias categorías, el sistema
            muestra la que tuvo más, junto con el total de retrocesos para darte
            el contexto completo.
          </p>
        </div>
        <p className="text-xs text-app-text-muted/60 italic">
          Un paciente que nunca duda puede estar respondiendo de forma impulsiva
          o mecánica. Un poco de ambivalencia es completamente normal.
        </p>
      </div>
    ),
  },
  {
    id: "polarizados",
    icon: <Zap className="h-5 w-5 text-purple-400" />,
    iconBg: "bg-purple-500/10",
    title: "Intereses Polarizados",
    subtitle: "Aceptación o rechazo total en un área",
    body: (
      <div className="space-y-3 text-sm text-app-text-muted leading-relaxed">
        <p>
          Cuando el paciente ve varias tarjetas de la misma categoría y las
          acepta{" "}
          <span className="font-bold text-purple-400">todas sin excepción</span>
          , o las rechaza{" "}
          <span className="font-bold text-purple-400">todas sin excepción</span>
          , el sistema lo marca como un interés polarizado.
        </p>
        <div className="rounded-xl bg-app-bg border border-app-border p-4 space-y-2">
          <p className="font-semibold text-app-text-main text-xs uppercase tracking-wider mb-3">
            Condición técnica
          </p>
          <p>
            Solo se considera polarización cuando el paciente vio{" "}
            <span className="font-bold text-app-text-main">
              al menos 4 tarjetas
            </span>{" "}
            de esa categoría. Con menos tarjetas, el resultado puede ser
            aleatorio y no es confiable.
          </p>
          <p>
            <span className="font-bold text-emerald-400">
              100% de aceptación
            </span>{" "}
            → Afinidad muy sólida y consistente con esa área.
          </p>
          <p>
            <span className="font-bold text-rose-400">0% de aceptación</span>{" "}
            → Rechazo claro y consistente. Tampoco es necesariamente malo — puede
            simplificar el mapa vocacional.
          </p>
        </div>
        <p className="text-xs text-app-text-muted/60 italic">
          Los resultados polarizados son los más confiables del test: no hay
          ambigüedad en la señal.
        </p>
      </div>
    ),
  },
  {
    id: "fatiga",
    icon: <ActivitySquare className="h-5 w-5 text-orange-400" />,
    iconBg: "bg-orange-500/10",
    title: "Curva de Fatiga",
    subtitle: "Impulsividad o cansancio al final del test",
    body: (
      <div className="space-y-3 text-sm text-app-text-muted leading-relaxed">
        <p>
          El sistema registra el tiempo exacto de cada decisión. Al final del
          análisis, compara la velocidad del primer cuarto del test con la del
          último cuarto.
        </p>
        <div className="rounded-xl bg-app-bg border border-app-border p-4 space-y-2">
          <p className="font-semibold text-app-text-main text-xs uppercase tracking-wider mb-3">
            Cómo se calcula
          </p>
          <p>
            Se toma el tiempo promedio entre cada decisión al inicio, y se
            compara con el promedio al final. Si al final respondió a{" "}
            <span className="font-bold text-orange-400">
              menos de la mitad de velocidad
            </span>
            , se activa esta alerta.
          </p>
          <p>
            Esto puede indicar{" "}
            <span className="font-bold text-app-text-main">cansancio</span>{" "}
            (el test fue largo y perdió concentración) o{" "}
            <span className="font-bold text-app-text-main">apuro</span> (quería
            terminar rápido). En ambos casos, las últimas respuestas pueden
            tener menor calidad.
          </p>
        </div>
        <p className="text-xs text-app-text-muted/60 italic">
          Solo se activa con más de 20 swipes registrados, para tener suficientes
          datos estadísticos confiables.
        </p>
      </div>
    ),
  },
  {
    id: "fiabilidad",
    icon: <BrainCircuit className="h-5 w-5 text-app-primary" />,
    iconBg: "bg-app-primary/10",
    title: "Índice de Fiabilidad",
    subtitle: "Qué tan consistente fue el proceso",
    body: (
      <div className="space-y-3 text-sm text-app-text-muted leading-relaxed">
        <p>
          El índice de fiabilidad resume la calidad general del proceso de
          respuesta. Combina dos factores: cuántas veces el paciente cambió de
          opinión, y si su velocidad de respuesta fue razonable.
        </p>
        <div className="rounded-xl bg-app-bg border border-app-border p-4 space-y-2">
          <p className="font-semibold text-app-text-main text-xs uppercase tracking-wider mb-3">
            Fórmula en lenguaje simple
          </p>
          <p>
            <span className="font-bold text-app-text-main">
              70% dudas + 30% velocidad
            </span>
          </p>
          <p>
            Las dudas (retrocesos) pesan más porque son el indicador más directo
            de indecisión. La velocidad solo penaliza si fue extremadamente
            rápida (menos de 1 segundo por tarjeta), lo que sugiere que el
            paciente no estaba realmente leyendo ni reflexionando.
          </p>
          <p>
            Tomarse tiempo en cada tarjeta es{" "}
            <span className="font-bold text-emerald-400">completamente sano</span>{" "}
            y no baja la fiabilidad. La reflexión es deseable.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-1">
          {[
            { level: "Muy Alta", range: "85–100", color: "text-emerald-400" },
            { level: "Alta", range: "70–84", color: "text-sky-400" },
            { level: "Variable", range: "50–69", color: "text-yellow-400" },
            { level: "Baja", range: "0–49", color: "text-rose-400" },
          ].map(({ level, range, color }) => (
            <div
              key={level}
              className="rounded-lg border border-app-border bg-app-bg p-3"
            >
              <p className={`text-sm font-bold ${color}`}>{level}</p>
              <p className="text-xs text-app-text-muted/60">{range} puntos</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function AccordionItem({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface overflow-hidden transition-all">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-app-bg/50 transition-colors"
        aria-expanded={open}
      >
        <div className={`p-2.5 rounded-xl flex-shrink-0 ${section.iconBg}`}>
          {section.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-app-text-main">{section.title}</p>
          <p className="text-xs text-app-text-muted/70 mt-0.5 truncate">
            {section.subtitle}
          </p>
        </div>
        <div className="flex-shrink-0 text-app-text-muted">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-app-border/50">
          {section.body}
        </div>
      )}
    </div>
  );
}

interface BehavioralMethodologyPanelProps {
  open: boolean;
  onClose: () => void;
}

export function BehavioralMethodologyPanel({
  open,
  onClose,
}: BehavioralMethodologyPanelProps) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Metodología de Análisis Conductual"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col bg-app-bg shadow-2xl border-l border-app-border animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-app-border p-6">
          <div className="rounded-2xl bg-app-bg p-3 border border-app-border">
            <BookOpen className="h-6 w-6 text-app-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-app-text-main">
              ¿Cómo se calcula el Análisis Conductual?
            </h2>
            <p className="text-xs text-app-text-muted mt-0.5">
              Guía para el profesional — sin tecnicismos
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-app-text-muted hover:bg-app-bg hover:text-app-text-main transition-colors"
            aria-label="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Intro */}
        <div className="px-6 py-4 bg-app-primary/5 border-b border-app-border">
          <p className="text-sm text-app-text-muted leading-relaxed">
            El análisis conductual no evalúa <em>qué</em> le gusta al paciente,
            sino <em>cómo</em> respondió durante el test. Estos patrones ayudan
            a contextualizar la validez de los resultados y a detectar señales
            que pueden enriquecer la conversación clínica.
          </p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {SECTIONS.map((section) => (
            <AccordionItem key={section.id} section={section} />
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-app-border p-5 text-center">
          <p className="text-xs text-app-text-muted/50">
            Algoritmos calculados por A.kit · Lux 3.0
          </p>
        </div>
      </div>
    </>
  );
}
