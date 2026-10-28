import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, CheckCircle2 } from 'lucide-react';

export default function ReportUnlockScreen() {
  const [voucherCode, setVoucherCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCode.trim()) return;

    setIsLoading(true);
    setError(null);

    // Simulación de canje de voucher
    setTimeout(() => {
      setIsLoading(false);
      if (voucherCode.trim().length >= 4) {
        navigate('/results');
      } else {
        setError('El código ingresado no es válido o ha expirado.');
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col justify-between min-h-screen bg-[#F5EFE7] px-6 py-8 max-w-md mx-auto">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 text-[#7A8783] hover:text-[#1F2523] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleRedeem} className="flex flex-col gap-6 my-auto">
        <div className="w-16 h-16 rounded-2xl bg-[#B7ECE7]/40 text-[#0F6B68] flex items-center justify-center mx-auto mb-2">
          <Ticket className="w-8 h-8" />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#1F2523] mb-2 font-small-caps">
            Canjear Voucher
          </h2>
          <p className="text-sm text-[#7A8783] leading-relaxed">
            Ingresá el código alfanumérico provisto por tu colegio, universidad o profesional orientador.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[#1F2523] uppercase tracking-wider">
            Código de Voucher
          </label>
          <input
            type="text"
            required
            autoFocus
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            placeholder="EJ. AKIT-2026-X7"
            className="w-full h-14 px-4 rounded-xl border border-[#7A8783]/30 bg-[#FAF6F0] text-[#1F2523] font-mono text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-[#0F6B68] focus:border-transparent transition-all uppercase"
          />
          {error && <span className="text-xs text-[#B9414A] mt-1 text-center">{error}</span>}
        </div>

        <button
          type="submit"
          disabled={!voucherCode.trim() || isLoading}
          className="w-full h-14 bg-[#0F6B68] disabled:opacity-50 hover:bg-[#083B39] text-[#FAF6F0] font-semibold rounded-2xl transition-all shadow-md active:scale-[0.98] mt-2 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Validar y Desbloquear</span>
            </>
          )}
        </button>

        <div className="p-4 rounded-2xl bg-[#DCD3C5]/40 border border-[#7A8783]/20 text-xs text-[#1F2523]/80 leading-relaxed text-center">
          <strong>¿Sos paciente particular?</strong> Próximamente vas a poder abonar tu informe directamente con Mercado Pago.
        </div>
      </form>

      <div className="text-center text-xs text-[#7A8783]">
        Soporte: contacto@orientaki.com
      </div>
    </div>
  );
}
