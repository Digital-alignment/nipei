import React, { useState } from 'react';
import { DollarSign, Users, Calendar, PieChart, Wrench } from 'lucide-react';
import CostDashboard from './CostDashboard';
import WorkerManagement from './WorkerManagement';
import PayrollPanel from './PayrollPanel';
import FinancialCalendar from './FinancialCalendar';
import ToolsManagement from './ToolsManagement';

type FinanceView = 'dashboard' | 'workers' | 'payroll' | 'calendar' | 'tools';

const FinanceLayout: React.FC = () => {
    const [view, setView] = useState<FinanceView>('dashboard');

    return (
        <div className="space-y-6">
            {/* Finance Sub-navigation */}
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                <button
                    onClick={() => setView('dashboard')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'dashboard' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'}`}
                >
                    <DollarSign size={16} /> Visão Geral
                </button>
                <button
                    onClick={() => setView('workers')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'workers' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'}`}
                >
                    <Users size={16} /> Guardiões
                </button>
                <button
                    onClick={() => setView('payroll')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'payroll' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'}`}
                >
                    <div className="flex space-x-[-4px]">
                        <PieChart size={16} />
                    </div>
                    Folha & Projeção
                </button>
                <button
                    onClick={() => setView('calendar')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'calendar' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'}`}
                >
                    <Calendar size={16} /> Calendário Natural
                </button>
                <button
                    onClick={() => setView('tools')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${view === 'tools' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'}`}
                >
                    <Wrench size={16} /> Ferramentas
                </button>
            </div>

            <div className="bg-neutral-800/50 rounded-2xl p-6 border border-white/5 min-h-[500px]">
                {view === 'dashboard' && <CostDashboard />}
                {view === 'workers' && <WorkerManagement />}
                {view === 'payroll' && <PayrollPanel />}
                {view === 'calendar' && <FinancialCalendar />}
                {view === 'tools' && <ToolsManagement />}
            </div>
        </div>
    );
};

export default FinanceLayout;
