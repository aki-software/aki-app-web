import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle2, History } from 'lucide-react';

const SLIDES = [
  {
    title: 'Descubrí tu vocación',
    description: 'A través de un test interactivo simple y dinámico, descubrí tus intereses y áreas profesionales afines.',
    icon: Sparkles,
  },
  {
    title: 'Deslizá según tus gustos',
    description: 'Deslizá hacia la derecha si la actividad te gusta, o hacia la izquierda si no te interesa.',
    icon: ArrowRight,
  },
  {
    title: 'Basado en ciencia',
    description: 'Evaluamos 220 combinaciones vocacionales mapeadas sobre la metodología Holland (RIASEC).',
    icon: CheckCircle2,
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      navigate('/participant');
    }
  };

  const IconComponent = SLIDES[currentSlide].icon;

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#0F6B68] tracking-wider uppercase font-small-caps">
          Orient A.Ki
        </span>
        <button
          onClick={() => navigate('/history')}
          className="p-2 text-[#7A8783] hover:text-[#0F6B68] transition-colors"
          title="Ver Historial"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Main card */}
      <div className="flex flex-col items-center text-center my-auto py-8">
        <div className="w-20 h-20 rounded-2xl bg-[#B7ECE7]/40 text-[#0F6B68] flex items-center justify-center mb-6">
          <IconComponent className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-[#1F2523] mb-3 font-small-caps">
          {SLIDES[currentSlide].title}
        </h2>
        <p className="text-base text-[#1F2523]/80 leading-accessible max-w-sm">
          {SLIDES[currentSlide].description}
        </p>

        {/* Indicators */}
        <div className="flex gap-2 mt-8">
          {SLIDES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-6 bg-[#0F6B68]' : 'w-2 bg-[#7A8783]/40'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleNext}
          className="w-full h-14 bg-[#0F6B68] hover:bg-[#083B39] text-[#FAF6F0] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>{currentSlide === SLIDES.length - 1 ? 'Comenzar Test' : 'Continuar'}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        {currentSlide < SLIDES.length - 1 && (
          <button
            onClick={() => navigate('/participant')}
            className="w-full py-2.5 text-sm font-medium text-[#7A8783] hover:text-[#1F2523] transition-colors text-center"
          >
            Saltar introducción
          </button>
        )}
      </div>
    </div>
  );
}
