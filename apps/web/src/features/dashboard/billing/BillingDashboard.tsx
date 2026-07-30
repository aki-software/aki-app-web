import React from 'react';
import { CreditCard, Receipt, BarChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  date: string;
  amount: string;
  description: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export const BillingDashboard: React.FC = () => {
  const navigate = useNavigate();

  const transactions: Transaction[] = [
    { id: 'tx_1', date: '2026-07-28', amount: '$15000', description: 'Plan Profesional', status: 'COMPLETED' },
    { id: 'tx_2', date: '2026-06-28', amount: '$15000', description: 'Plan Profesional', status: 'COMPLETED' },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facturación y Consumo</h1>
          <p className="text-gray-600 mt-1">Gestioná tus planes, vouchers y pagos</p>
        </div>
        <button 
          onClick={() => navigate('/pricing')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <CreditCard className="w-4 h-4" />
          Cambiar Plan
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 text-gray-600 mb-2">
            <Receipt className="w-5 h-5" />
            <h3 className="font-medium">Plan Actual</h3>
          </div>
          <div className="text-2xl font-bold">Profesional</div>
          <p className="text-sm text-gray-500 mt-1">Renueva el 28 Ago 2026</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 text-gray-600 mb-2">
            <CreditCard className="w-5 h-5" />
            <h3 className="font-medium">Vouchers Disponibles</h3>
          </div>
          <div className="text-2xl font-bold">12 / 20</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center gap-3 text-gray-600 mb-2">
            <BarChart className="w-5 h-5" />
            <h3 className="font-medium">Consumo Total</h3>
          </div>
          <div className="text-2xl font-bold">8 Sesiones</div>
          <p className="text-sm text-gray-500 mt-1">En el ciclo actual</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="font-semibold text-gray-800">Historial de Transacciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Descripción</th>
                <th className="px-6 py-3 font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm">
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{tx.date}</td>
                  <td className="px-6 py-4">{tx.description}</td>
                  <td className="px-6 py-4 font-medium">{tx.amount}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No hay transacciones recientes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
