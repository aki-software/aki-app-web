import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck } from 'lucide-react';

export default function ParticipantNameScreen() {
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem('akit_participant_name', name.trim());
      navigate('/test');
    }
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      {/* Top back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#7A8783] hover:text-[#1F2523] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main form */}
      <form onSubmit={handleStart} className="flex flex-col gap-6 my-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#B7ECE7]/40 text-[#0F6B68] flex items-center justify-center mx-auto mb-2">
          <UserCheck className="w-8 h-8" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1F2523] mb-2 font-small-caps">
            ¿Quién realizará el test?
          </h2>
          <p className="text-sm text-[#7A8783] leading-relaxed">
            Ingresá tu nombre o el de la persona evaluada para personalizar el informe vocacional.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#1F2523] uppercase tracking-wider">
            Nombre y Apellido
          </label>
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Sofía Rodríguez"
            className="w-full h-14 px-4 rounded-xl border border-[#7A8783]/30 bg-[#FAF6F0] text-[#1F2523] text-base focus:outline-none focus:ring-2 focus:ring-[#0F6B68] focus:border-transparent transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full h-14 bg-[#0F6B68] disabled:opacity-50 hover:bg-[#083B39] text-[#FAF6F0] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.98] mt-4"
        >
          Iniciar Evaluación
        </button>
      </form>

      <div className="text-center text-xs text-[#7A8783]">
        Tus respuestas son estrictamente confidenciales.
      </div>
    </div>
  );
}
