import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChevronRight, Award } from 'lucide-react';

const MOCK_HISTORY = [
  {
    id: 'sess-1',
    participantName: 'Sofía Rodríguez',
    date: '22 Octubre 2026',
    status: 'UNLOCKED',
    hollandCode: 'AIS',
  },
  {
    id: 'sess-2',
    participantName: 'Lucas Rodríguez',
    date: '14 Septiembre 2026',
    status: 'LOCKED',
    hollandCode: '---',
  },
];

export default function SessionHistoryScreen() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#7A8783] hover:text-[#1F2523] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-[#1F2523] font-small-caps">
          Historial de Evaluaciones
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {MOCK_HISTORY.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.status === 'UNLOCKED') {
                navigate('/results');
              } else {
                navigate('/pre-results');
              }
            }}
            className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#7A8783]/20 shadow-sm flex items-center justify-between cursor-pointer hover:border-[#0F6B68]/50 transition-all active:scale-[0.99]"
          >
            <div className="flex flex-col gap-1">
              <span className="text-base font-bold text-[#1F2523] font-small-caps">
                {item.participantName}
              </span>
              <div className="flex items-center gap-2 text-xs text-[#7A8783]">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.date}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {item.status === 'UNLOCKED' ? (
                <span className="text-xs font-bold text-[#0F6B68] px-2.5 py-1 rounded-lg bg-[#B7ECE7]/40 flex items-center gap-1 font-small-caps">
                  <Award className="w-3.5 h-3.5" />
                  {item.hollandCode}
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#8E5A12] px-2.5 py-1 rounded-lg bg-[#FFDDB5]/40 font-small-caps">
                  Pendiente
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-[#7A8783]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
