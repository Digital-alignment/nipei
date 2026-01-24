import React from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';

export const PaymentCalendar: React.FC = () => {
    const { workers } = useFinance();

    // Filter workers with payment dates
    const workersWithDates = workers.filter(w => w.active && w.payment_date && (w.payment_type !== 'production' || w.role === 'mutum_manager'));

    return (
        <div className="bg-neutral-800 p-6 rounded-xl border border-white/5">
            <h3 className="text-neutral-400 text-sm font-medium mb-4 flex items-center gap-2">
                <Calendar size={16} /> Próximos Pagamentos
            </h3>
            <div className="space-y-3">
                {workersWithDates.length === 0 ? (
                    <div className="text-sm text-neutral-500">Nenhuma data de pagamento configurada.</div>
                ) : (
                    workersWithDates.map(worker => (
                        <div key={worker.user_id} className="flex justify-between items-center bg-neutral-900/50 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                    {(() => {
                                        const dateStr = worker.payment_date || '??';
                                        // If YYYY-MM-DD
                                        if (dateStr.includes('-')) {
                                            return dateStr.split('-')[2];
                                        }
                                        return dateStr.replace('Dia ', '');
                                    })()}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-white">{worker.full_name}</div>
                                    <div className="text-xs text-neutral-500">
                                        {worker.payment_date?.includes('-') 
                                            ? new Date(worker.payment_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }) 
                                            : worker.payment_date}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm font-medium text-emerald-400">
                                {worker.payment_type === 'production' ? 'Produção' : `R$ ${worker.fixed_salary}`}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export const FinancialSummary: React.FC = () => {
    const { getTotalExpenses, workers } = useFinance();
    const totalCost = getTotalExpenses(); // Now includes payroll
    
    const activeWorkers = workers.filter(w => w.active && (w.role === 'guardiao' || w.role === 'mutum_manager')).length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-neutral-800 p-6 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <DollarSign size={100} />
                </div>
                <h3 className="text-neutral-400 text-sm font-medium mb-1">Custo Total Projetado (Mês)</h3>
                <div className="text-3xl font-bold text-white mb-2">
                    R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-neutral-500">
                    Inclui despesas registradas e folha fixa.
                </div>
            </div>

            <div className="bg-neutral-800 p-6 rounded-xl border border-white/5 relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Users size={100} />
                </div>
                <h3 className="text-neutral-400 text-sm font-medium mb-1">Guardiões Ativos</h3>
                <div className="text-3xl font-bold text-white mb-2">
                    {activeWorkers}
                </div>
                <div className="text-xs text-neutral-500 flex items-center gap-1">
                    <TrendingUp size={12} className="text-emerald-400" /> Equipe do Mutum
                </div>
            </div>
        </div>
    );
};
