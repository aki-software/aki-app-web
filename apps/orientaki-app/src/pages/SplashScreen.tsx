import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    // Simula comprobación inicial de sesión / offline draft
    const timer = setTimeout(() => {
      navigate('/onboarding');
    }, 1500);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F5EFE7] px-6 text-center animate-fade-in">
      <div className="w-24 h-24 mb-6 rounded-3xl bg-[#0F6B68] flex items-center justify-center shadow-lg shadow-[#0F6B68]/20">
        <span className="text-3xl font-bold text-[#FAF6F0] font-small-caps">A.KI</span>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-[#1F2523] font-small-caps mb-2">
        ORIENT A.KI
      </h1>
      <p className="text-sm text-[#7A8783] max-w-xs leading-relaxed">
        Orientación Vocacional y Psicométrica
      </p>
      <div className="mt-8 flex gap-1.5">
        <span className="w-2 h-2 rounded-full bg-[#0F6B68] animate-pulse"></span>
        <span className="w-2 h-2 rounded-full bg-[#0F6B68]/60 animate-pulse delay-150"></span>
        <span className="w-2 h-2 rounded-full bg-[#0F6B68]/30 animate-pulse delay-300"></span>
      </div>
    </div>
  );
}
