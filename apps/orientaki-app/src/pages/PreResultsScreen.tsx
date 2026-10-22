import { useNavigate } from 'react-router-dom';
import { Lock, FileText, CheckCircle2, Award, ArrowRight } from 'lucide-react';

export default function PreResultsScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      <div className="flex flex-col gap-6 my-auto">
        {/* Header */}
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-[#B7ECE7]/40 text-[#0F6B68] text-xs font-bold uppercase tracking-wider font-small-caps mb-3">
            ¡Evaluación Completada!
          </span>
          <h2 className="text-2xl font-bold text-[#1F2523] font-small-caps">
            Tus Afinidades Vocacionales
          </h2>
          <p className="text-sm text-[#7A8783] mt-1">
            Detectamos una marcada inclinación en las áreas Artística e Investigativa.
          </p>
        </div>

        {/* Blurred radar teaser */}
        <div className="relative w-full h-52 rounded-3xl bg-[#FAF6F0] border border-[#7A8783]/20 flex items-center justify-center overflow-hidden shadow-inner p-4">
          {/* Simulated radar background */}
          <div className="absolute inset-0 flex items-center justify-center filter blur-md opacity-40">
            <div className="w-36 h-36 rounded-full border-4 border-dashed border-[#0F6B68] flex items-center justify-center">
              <div className="w-20 h-20 bg-[#4E7F52]/40 rounded-full" />
            </div>
          </div>

          {/* Foreground lock hook */}
          <div className="relative z-10 flex flex-col items-center gap-2 bg-[#FAF6F0]/90 backdrop-blur-sm p-4 rounded-2xl border border-[#7A8783]/20 text-center shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#8E5A12]/15 text-[#8E5A12] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[#1F2523] font-small-caps">
              Informe Completo Bloqueado
            </span>
            <span className="text-xs text-[#7A8783]">
              Canjeá tu voucher institucional para ver tu reporte oficial.
            </span>
          </div>
        </div>

        {/* Benefits List */}
        <div className="bg-[#FAF6F0] p-4 rounded-2xl border border-[#7A8783]/15 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase text-[#0F6B68] tracking-wider font-small-caps">
            ¿Qué incluye el informe?
          </span>
          <div className="flex items-start gap-2.5 text-xs text-[#1F2523]">
            <Award className="w-4 h-4 text-[#4E7F52] shrink-0 mt-0.5" />
            <span>Código Holland oficial RIASEC con ponderación de las 12 áreas.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-[#1F2523]">
            <CheckCircle2 className="w-4 h-4 text-[#4E7F52] shrink-0 mt-0.5" />
            <span>Recomendación de carreras universitarias y técnicas afines.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-[#1F2523]">
            <FileText className="w-4 h-4 text-[#4E7F52] shrink-0 mt-0.5" />
            <span>Descarga de informe técnico en PDF listo para orientadores y tutores.</span>
          </div>
        </div>
      </div>

      {/* Action button */}
      <div className="flex flex-col gap-3 mt-4">
        <button
          onClick={() => navigate('/unlock')}
          className="w-full h-14 bg-[#0F6B68] hover:bg-[#083B39] text-[#FAF6F0] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>Desbloquear con Voucher</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
