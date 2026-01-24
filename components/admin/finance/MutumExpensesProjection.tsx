import React from 'react';
import CostDashboard from './CostDashboard';
import MutumPayroll from './MutumPayroll';

const MutumExpensesProjection: React.FC = () => {
    return (
        <div className="space-y-12">
            <section>
                <h3 className="text-xl font-bold mb-6 text-emerald-400 border-b border-emerald-500/20 pb-2">
                    Despensas e Custos Fixos
                </h3>
                {/* Reusing CostDashboard for expenses registry */}
                <CostDashboard />
            </section>

            <section>
                 <h3 className="text-xl font-bold mb-6 text-emerald-400 border-b border-emerald-500/20 pb-2">
                    Equipe e Pagamentos
                </h3>
                {/* Reusing WorkerManagement for payroll */}
                <MutumPayroll />
            </section>
        </div>
    );
};

export default MutumExpensesProjection;
