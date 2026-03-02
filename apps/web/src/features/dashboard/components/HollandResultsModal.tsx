import { X, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { SessionData } from "../api/dashboard";
import { useState } from "react";

interface HollandResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionData | null;
}

export function HollandResultsModal({ isOpen, onClose, session }: HollandResultsModalProps) {
  const [expandedDesc, setExpandedDesc] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  // ... (category info setup)

  const categoryInfo: Record<string, { label: string; color: string; desc: string }> = {
    ART: { label: "Artístico", color: "bg-purple-500", desc: "Producción manual, visual o escénica; creatividad y sensibilidad." },
    HUM: { label: "Humanitario", color: "bg-pink-500", desc: "Cuidado, empatía y apoyo a otras personas en sus dimensiones físicas o emocionales." },
    SERV: { label: "Servicios y Acomodación", color: "bg-teal-500", desc: "Atención directa, hospitalidad y satisfacción de necesidades concretas." },
    PROT: { label: "Protección", color: "bg-slate-700", desc: "Cuidado, vigilancia y protección de personas, bienes y espacios comunitarios." },
    PHYS: { label: "Desempeño Físico", color: "bg-red-500", desc: "Movimiento corporal, actividad física y esfuerzo práctico al aire libre." },
    IND: { label: "Industrial", color: "bg-gray-500", desc: "Procesos de producción, manufactura y trabajo estructurado en fábricas." },
    MECH: { label: "Mecánica", color: "bg-amber-600", desc: "Trabajo práctico con máquinas, herramientas y sistemas técnicos." },
    NAT: { label: "Plantas y Animales", color: "bg-green-600", desc: "Cuidado, producción y manejo de recursos naturales o trabajo rural." },
    LEAD: { label: "Liderazgo", color: "bg-indigo-600", desc: "Organización, toma de decisiones y conducción de equipos de trabajo." },
    SCI: { label: "Científico", color: "bg-blue-600", desc: "Investigación, análisis y aplicación sistemática de métodos comprobables." },
    SAL: { label: "Ventas", color: "bg-rose-500", desc: "Promoción, comercialización, negociación e influencia sobre clientes." },
    BUS: { label: "Negocios y Detalle", color: "bg-sky-500", desc: "Tareas organizadas, administrativas o contables con atención a la exactitud." }
  };

  const categories = ["ART", "HUM", "SERV", "PROT", "PHYS", "IND", "MECH", "NAT", "LEAD", "SCI", "SAL", "BUS"];
  
  const resultsMap: Record<string, number> = {};
  if (session.results) {
    session.results.forEach((r) => {
      resultsMap[r.categoryId.toUpperCase()] = r.percentage;
    });
  }

  const sortedCategories = [...categories].sort((a, b) => {
    return (resultsMap[b] || 0) - (resultsMap[a] || 0);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm transition-opacity">
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80 rounded-t-2xl shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Perfil Vocacional RIASEC Extendido (12 Áreas)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Reporte del Paciente: <span className="font-medium text-gray-700 dark:text-gray-300">{session.patientName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full p-1 transition-colors bg-white dark:bg-gray-700"
          >
            <span className="sr-only">Cerrar</span>
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto overflow-x-hidden flex-1 space-y-4">
          {sortedCategories.map((cat) => {
            const percentage = resultsMap[cat] || 0;
            const info = categoryInfo[cat] || { label: cat, color: "bg-gray-500", desc: "No hay descripción disponible." };
            const isExpanded = expandedDesc === cat;

            return (
              <div key={cat} className="bg-white dark:bg-gray-800/40 p-3 rounded-xl border border-gray-100 dark:border-gray-700/60 hover:border-blue-200 dark:hover:border-blue-800/40 transition-colors">
                <div 
                  className="flex justify-between items-center mb-2 cursor-pointer group"
                  onClick={() => setExpandedDesc(isExpanded ? null : cat)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {info.label}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {cat}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-black text-gray-900 dark:text-white">
                      {percentage}%
                    </span>
                    <button className="text-gray-400 group-hover:text-blue-500 focus:outline-none transition-colors">
                      {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>

                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden mb-1">
                  <div
                    className={`${info.color} h-2 rounded-full transition-all duration-700 ease-out`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                {isExpanded && (
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg flex items-start">
                    <BookOpen className="w-4 h-4 mr-2 shrink-0 text-blue-500 mt-0.5" />
                    <span>{info.desc}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
          >
            Cerrar Reporte
          </button>
        </div>
      </div>
    </div>
  );
}
