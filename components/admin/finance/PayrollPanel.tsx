import React, { useEffect, useState } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { supabase } from '../../../lib/supabase';
import { Download, DollarSign, Calendar } from 'lucide-react';

interface PayrollEntry {
    user_id: string;
    full_name: string;
    role: string;
    payment_type: string;
    fixed_salary: number;
    production_count: number;
    production_earnings: number;
    total_due: number;
}

const PayrollPanel: React.FC = () => {
    const { workers } = useFinance();
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    useEffect(() => {
        calculatePayroll();
    }, [workers, selectedMonth, selectedYear]);

    const calculatePayroll = async () => {
        setLoading(true);
        try {
            // Define month range
            const startStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            // Calculate end date (last day of month)
            const endDate = new Date(selectedYear, selectedMonth + 1, 0);
            const endStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${endDate.getDate()}`;

            // Fetch production logs for this period
            const { data: logs, error } = await supabase
                .from('production_logs')
                .select('*')
                .eq('action_type', 'produced')
                .gte('created_at', startStr)
                .lte('created_at', `${endStr} 23:59:59`);

            if (error) throw error;

            console.log("Logs fetched:", logs);

            // Group by User
            const payroll: PayrollEntry[] = workers.map(worker => {
                const userLogs = logs?.filter(log => log.user_id === worker.user_id) || [];

                // Calculate Production Earnings
                // Sum of (quantity * unit_labor_cost)
                const productionEarnings = userLogs.reduce((acc, log) => {
                    const cost = Number(log.unit_labor_cost) || 0;
                    const qty = log.quantity || 0;
                    return acc + (cost * qty);
                }, 0);

                const productionCount = userLogs.reduce((acc, log) => acc + (log.quantity || 0), 0);

                const fixedSalary = Number(worker.fixed_salary) || 0;

                // Total Logic:
                // fixed: just fixed
                // production: just earnings
                // mixed: fixed + earnings
                let total = 0;
                if (worker.payment_type === 'fixed') total = fixedSalary;
                else if (worker.payment_type === 'production') total = productionEarnings;
                else if (worker.payment_type === 'mixed') total = fixedSalary + productionEarnings;

                return {
                    user_id: worker.user_id,
                    full_name: worker.full_name || 'Desconhecido',
                    role: worker.role,
                    payment_type: worker.payment_type,
                    fixed_salary: fixedSalary,
                    production_count: productionCount,
                    production_earnings: productionEarnings,
                    total_due: total
                };
            });

            setPayrollData(payroll);
        } catch (error) {
            console.error("Payroll Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold">Folha de Pagamento (Justiça Social)</h2>
                    <p className="text-sm text-neutral-400">Cálculo automatizado baseado em produção e salários fixos.</p>
                </div>

                <div className="flex gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                        {months.map((m, i) => (
                            <option key={i} value={i}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    >
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded-lg text-sm transition-colors">
                        <Download size={16} /> Exportar CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Total a Pagar</p>
                    <p className="text-2xl font-bold text-white">
                        {formatCurrency(payrollData.reduce((acc, curr) => acc + curr.total_due, 0))}
                    </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Produção Total</p>
                    <p className="text-2xl font-bold text-emerald-400">
                        {payrollData.reduce((acc, curr) => acc + curr.production_earnings, 0) > 0
                            ? formatCurrency(payrollData.reduce((acc, curr) => acc + curr.production_earnings, 0))
                            : 'R$ 0,00'}
                    </p>
                    <p className="text-xs text-white/50 mt-1">Refere-se apenas à bonificação por produção</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
                    <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">Salários Fixos</p>
                    <p className="text-2xl font-bold text-blue-400">
                        {formatCurrency(payrollData.reduce((acc, curr) => acc + curr.fixed_salary, 0))}
                    </p>
                </div>
            </div>

            <div className="bg-neutral-800 rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-white/10 bg-neutral-900/50 text-neutral-400">
                                <th className="p-4 font-medium">Guardião</th>
                                <th className="p-4 font-medium">Tipo</th>
                                <th className="p-4 font-medium text-right">Produção (Qtd)</th>
                                <th className="p-4 font-medium text-right">Ganho Prod.</th>
                                <th className="p-4 font-medium text-right">Salário Fixo</th>
                                <th className="p-4 font-medium text-right">Total</th>
                                <th className="p-4 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                                        Calculando folha...
                                    </td>
                                </tr>
                            ) : payrollData.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-neutral-500">
                                        Nenhum dado encontrado para este mês.
                                    </td>
                                </tr>
                            ) : (
                                payrollData.map((entry) => (
                                    <tr key={entry.user_id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="font-medium text-white">{entry.full_name}</div>
                                            <div className="text-xs text-neutral-500 capitalize">{entry.role === 'inventory_manager' ? 'Mutum' : 'Admin'}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold border ${entry.payment_type === 'production' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    entry.payment_type === 'fixed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                }`}>
                                                {entry.payment_type === 'mixed' ? 'Misto' :
                                                    entry.payment_type === 'fixed' ? 'Fixo' : 'Produção'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-mono text-neutral-300">
                                            {entry.production_count} un
                                        </td>
                                        <td className="p-4 text-right font-mono text-emerald-400/80">
                                            {formatCurrency(entry.production_earnings)}
                                        </td>
                                        <td className="p-4 text-right font-mono text-blue-400/80">
                                            {formatCurrency(entry.fixed_salary)}
                                        </td>
                                        <td className="p-4 text-right font-bold text-white font-mono text-lg">
                                            {formatCurrency(entry.total_due)}
                                        </td>
                                        <td className="p-4 text-center">
                                            <button className="text-xs font-bold text-neutral-400 hover:text-white border border-neutral-600 hover:border-white px-3 py-1 rounded-full transition-colors">
                                                Registrar Pagto
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-xl flex items-start gap-3">
                <DollarSign className="text-yellow-500 mt-1 shrink-0" size={20} />
                <div>
                    <h4 className="text-yellow-500 font-bold text-sm">Nota sobre Cálculos</h4>
                    <p className="text-xs text-yellow-200/70 mt-1">
                        Os valores de produção são calculados com base no "Custo Unitário de Mão de Obra" registrado no momento exato de cada produção (`production_logs.unit_labor_cost`).
                        Alterações na taxa de produção do usuário afetam apenas produções futuras.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PayrollPanel;
