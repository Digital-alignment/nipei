import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { X, User, DollarSign, Calendar, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WorkerProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WorkerProfileModal: React.FC<WorkerProfileModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const { seasons } = useFinance();
    const [loading, setLoading] = useState(false);
    const [workerSettings, setWorkerSettings] = useState<any>(null);
    const [productionEarnings, setProductionEarnings] = useState(0);
    const [lastPaymentDate, setLastPaymentDate] = useState<string | null>(null);

    // Fetch my own data
    useEffect(() => {
        if (isOpen && user) {
            fetchMyData();
        }
    }, [isOpen, user]);

    const fetchMyData = async () => {
        setLoading(true);
        try {
            if (!user) return;

            // 1. Get Settings
            const { data: settings } = await supabase
                .from('worker_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();
            setWorkerSettings(settings);

            // 2. Calculate Earnings (Current Month)
            const today = new Date();
            const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

            const { data: logs } = await supabase
                .from('production_logs')
                .select('quantity, unit_labor_cost')
                .eq('user_id', user.id)
                .eq('action_type', 'produced')
                .gte('created_at', startOfMonth);

            const total = logs?.reduce((acc, log) => {
                return acc + (log.quantity * (log.unit_labor_cost || 0));
            }, 0) || 0;

            setProductionEarnings(total);

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        const email = user?.email; // Or prompt for it
        if (!email) return;

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password', // Ideally
            });
            if (error) throw error;
            alert('Enviamos um email para redefinir sua senha.');
        } catch (error: any) {
            alert('Erro: ' + error.message);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden relative">

                {/* Header */}
                <div className="bg-emerald-900/20 p-6 text-center border-b border-white/5 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                    <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto mb-3 flex items-center justify-center shadow-lg border-4 border-neutral-900">
                        <User size={40} className="text-emerald-950" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{user?.user_metadata?.full_name || 'Guardião'}</h2>
                    <p className="text-neutral-400 text-sm">{user?.email}</p>
                    <div className="mt-2 inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 uppercase tracking-wider">
                        Mutum (Estoque)
                    </div>
                </div>

                <div className="p-6 space-y-6">

                    {/* Financial Summary */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 text-center">
                            <div className="text-neutral-500 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                                <DollarSign size={12} /> Ganho Mensal
                            </div>
                            <div className="text-2xl font-mono font-bold text-emerald-400">
                                R$ {(productionEarnings + (workerSettings?.fixed_salary || 0)).toFixed(2)}
                            </div>
                            <div className="text-[10px] text-neutral-600 mt-1">
                                {workerSettings?.payment_type === 'production' && 'Por Produção'}
                                {workerSettings?.payment_type === 'fixed' && 'Salário Fixo'}
                                {workerSettings?.payment_type === 'mixed' && 'Misto'}
                            </div>
                        </div>

                        <div className="bg-neutral-800/50 p-4 rounded-2xl border border-white/5 text-center">
                            <div className="text-neutral-500 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                                <Calendar size={12} /> Próx. Pagamento
                            </div>
                            <div className="text-xl font-bold text-white mt-1">
                                Dia 05
                            </div>
                            <div className="text-[10px] text-neutral-600 mt-1">
                                Todo mês
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                        <button
                            onClick={handleResetPassword}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-4 rounded-xl flex items-center justify-between group transition-colors"
                        >
                            <span className="flex items-center gap-3">
                                <Lock size={18} className="text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                                Redefinir Senha
                            </span>
                            <div className="text-xs bg-neutral-900 px-2 py-1 rounded text-neutral-500">
                                Enviar Email
                            </div>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WorkerProfileModal;
