import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Check, RotateCcw, Sparkles } from 'lucide-react';

const SAMPLE_QUESTIONS = [
  { id: 1, title: 'Diseñar la interfaz de una aplicación móvil intuitiva', category: 'Artístico / Tecnológico' },
  { id: 2, title: 'Analizar datos estadísticos para entender patrones climáticos', category: 'Investigativo' },
  { id: 3, title: 'Coordinar un equipo de rescate en situaciones de emergencia', category: 'Realista / Social' },
  { id: 4, title: 'Negociar acuerdos comerciales con proveedores internacionales', category: 'Emprendedor' },
  { id: 5, title: 'Organizar sistemas contables y auditorías de inventario', category: 'Convencional' },
];

export default function VocationalMatchScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const navigate = useNavigate();

  const participantName = localStorage.getItem('akit_participant_name') || 'Participante';

  const handleAnswer = (liked: boolean) => {
    const question = SAMPLE_QUESTIONS[currentIndex];
    const newAnswers = { ...answers, [question.id]: liked };
    setAnswers(newAnswers);

    if (currentIndex < SAMPLE_QUESTIONS.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Final del test -> pantalla de análisis simulada
      setIsAnalyzing(true);
      setTimeout(() => {
        navigate('/pre-results');
      }, 1500);
    }
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5EFE7] px-6 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full border-4 border-[#0F6B68]/30 border-t-[#0F6B68] animate-spin mb-6" />
        <h2 className="text-xl font-bold text-[#1F2523] font-small-caps mb-2">
          Calculando tus afinidades
        </h2>
        <p className="text-sm text-[#7A8783] max-w-xs leading-relaxed">
          Mapeando tus 220 respuestas contra el modelo Holland RIASEC...
        </p>
      </div>
    );
  }

  const currentQ = SAMPLE_QUESTIONS[currentIndex];
  const progressPercent = ((currentIndex + 1) / SAMPLE_QUESTIONS.length) * 100;

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#F5EFE7] px-6 py-6 max-w-md mx-auto select-none">
      {/* Top bar with progress */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-medium text-[#7A8783]">
          <span className="font-semibold text-[#0F6B68]">{participantName}</span>
          <span>{currentIndex + 1} de {SAMPLE_QUESTIONS.length}</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#7A8783]/20 overflow-hidden">
          <div
            className="h-full bg-[#0F6B68] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Swipe Arena Card */}
      <div className="swipe-arena my-auto py-6">
        <div className="w-full min-h-[340px] p-6 rounded-3xl bg-[#FAF6F0] border border-[#7A8783]/20 shadow-xl flex flex-col justify-between transition-all duration-200">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8E5A12] font-small-caps">
            <Sparkles className="w-4 h-4" />
            <span>{currentQ.category}</span>
          </div>

          <p className="text-2xl font-bold text-[#1F2523] text-center my-auto leading-snug font-small-caps">
            {currentQ.title}
          </p>

          <div className="flex justify-between items-center text-xs text-[#7A8783]/70 font-medium">
            <span>← No me interesa</span>
            <span>Me interesa →</span>
          </div>
        </div>
      </div>

      {/* Bottom Circular Action Buttons (64dp / 32dp icons matching Android) */}
      <div className="flex items-center justify-center gap-6 pb-2">
        {/* Dislike button */}
        <button
          onClick={() => handleAnswer(false)}
          className="w-16 h-16 rounded-full bg-[#FAF6F0] border-2 border-[#B9414A] text-[#B9414A] hover:bg-[#B9414A] hover:text-white flex items-center justify-center transition-all duration-150 shadow-md active:scale-90"
          title="No me interesa"
        >
          <X className="w-8 h-8" />
        </button>

        {/* Undo button */}
        <button
          onClick={handleUndo}
          disabled={currentIndex === 0}
          className="w-11 h-11 rounded-full bg-[#FAF6F0] border border-[#7A8783]/30 text-[#7A8783] disabled:opacity-30 hover:text-[#1F2523] flex items-center justify-center transition-all active:scale-95"
          title="Deshacer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        {/* Like button */}
        <button
          onClick={() => handleAnswer(true)}
          className="w-16 h-16 rounded-full bg-[#FAF6F0] border-2 border-[#4E7F52] text-[#4E7F52] hover:bg-[#4E7F52] hover:text-white flex items-center justify-center transition-all duration-150 shadow-md active:scale-90"
          title="Me interesa"
        >
          <Check className="w-8 h-8" />
        </button>
      </div>
    </div>
  );
}
