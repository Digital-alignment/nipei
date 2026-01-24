import React, { useState } from 'react';
import { LayoutDashboard, Users, PieChart } from 'lucide-react';
import MutumGuardians from './MutumGuardians';
import MutumExpensesProjection from './MutumExpensesProjection';
import { PaymentCalendar, FinancialSummary } from '../dashboard/DashboardWidgets';

type Tab = 'overview' | 'guardians' | 'expenses';

const Squad2Finance: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');

    return (
        <div className="space-y-6">
            <div className="flex overflow-x-auto pb-2 gap-2 no-scrollbar">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'overview' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
                    }`}
                >
                    <LayoutDashboard size={16} /> Visão Geral
                </button>
                <button
                    onClick={() => setActiveTab('guardians')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'guardians' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
                    }`}
                >
                    <Users size={16} /> Guardiões
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${
                        activeTab === 'expenses' 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750'
                    }`}
                >
                    <PieChart size={16} /> Despensas e projeção
                </button>
            </div>

            <div className="bg-neutral-800/50 rounded-2xl p-6 border border-white/5 min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <FinancialSummary />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                             <PaymentCalendar />
                             <div className="bg-neutral-800 p-6 rounded-xl border border-white/5 flex items-center justify-center text-neutral-500">
                                 {/* Placeholder for future widgets or charts */}
                                 <p>Mais métricas em breve</p>
                             </div>
                        </div>
                    </div>
                )}
                {activeTab === 'guardians' && <MutumGuardians />}
                {activeTab === 'expenses' && <MutumExpensesProjection />}
            </div>
        </div>
    );
};

export default Squad2Finance;
