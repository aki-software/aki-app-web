import { useNavigate } from 'react-router-dom';
import { Download, Share2, RotateCcw, CheckCircle, Sparkles } from 'lucide-react';

export default function ResultsScreen() {
  const navigate = useNavigate();
  const participantName = localStorage.getItem('akit_participant_name') || 'Sofía Rodríguez';

  return (
    <div className="flex flex-col min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-6">
        <span className="px-3 py-1 rounded-full bg-[#CDEDCB] text-[#4E7F52] text-xs font-bold uppercase tracking-wider font-small-caps mb-2 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          Informe Desbloqueado
        </span>
        <h1 className="text-2xl font-bold text-[#1F2523] font-small-caps">
          {participantName}
        </h1>
        <p className="text-xs text-[#7A8783] mt-0.5">
          Perfil Vocacional Oficial Holland (RIASEC)
        </p>
      </div>

      {/* Main Holland Code Card */}
      <div className="p-6 rounded-3xl bg-[#FAF6F0] border border-[#7A8783]/20 shadow-md flex flex-col items-center text-center mb-6">
        <span className="text-xs font-semibold text-[#8E5A12] uppercase tracking-wider font-small-caps mb-1">
          Tu Código Vocacional
        </span>
        <span className="text-4xl font-extrabold text-[#0F6B68] tracking-widest font-small-caps my-2">
          AIS
        </span>
        <span className="text-sm font-medium text-[#1F2523] mb-4">
          Artístico • Investigativo • Social
        </span>
        <p className="text-xs text-[#1F2523]/80 leading-relaxed max-w-xs">
          Combinás una fuerte inclinación a la creatividad y expresión con rigor analítico y vocación orientada a ayudar o educar.
        </p>
      </div>

      {/* Recommended Careers */}
      <div className="flex flex-col gap-3 mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F6B68] font-small-caps flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Carreras Recomendadas
        </h3>
        <div className="space-y-2">
          {[
            { title: 'Diseño UX / UI y Arquitectura de Información', affinity: '94%' },
            { title: 'Comunicación Visual y Medios Digitales', affinity: '89%' },
            { title: 'Psicología Cognitiva y Orientación Educativa', affinity: '86%' },
          ].map((career, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#7A8783]/15 flex items-center justify-between"
            >
              <span className="text-sm font-semibold text-[#1F2523]">{career.title}</span>
              <span className="text-xs font-bold text-[#0F6B68] px-2 py-1 rounded-lg bg-[#B7ECE7]/40">
                {career.affinity}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 mt-auto pt-4">
        <button
          onClick={() => alert('Generando PDF oficial desde el backend...')}
          className="w-full h-14 bg-[#0F6B68] hover:bg-[#083B39] text-[#FAF6F0] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span>Descargar Informe PDF</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => alert('Enlace de informe copiado al portapapeles')}
            className="h-12 bg-[#FAF6F0] border border-[#7A8783]/30 text-[#1F2523] font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Share2 className="w-4 h-4" />
            <span>Compartir</span>
          </button>
          <button
            onClick={() => navigate('/onboarding')}
            className="h-12 bg-[#FAF6F0] border border-[#7A8783]/30 text-[#1F2523] font-medium rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </button>
        </div>
      </div>
    </div>
  );
}
