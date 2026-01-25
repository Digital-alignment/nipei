import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Target, Calendar, Package, ChevronRight, Droplet, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Product } from '../../types';
import ShipmentModal from '../ShipmentModal';

interface ProductionGoal {
    id: string;
    name: string;
    deadline: string;
    status: string;
    targets: Record<string, number>;
    current_progress: Record<string, number>;
    product: Product;
}

interface ActiveProductionGoalsProps {
    onSelectGoal?: (product: Product) => void;
}

const ActiveProductionGoals: React.FC<ActiveProductionGoalsProps> = ({ onSelectGoal }) => {
    const [goals, setGoals] = useState<ProductionGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [shipmentModalOpen, setShipmentModalOpen] = useState(false);

    useEffect(() => {
        const fetchGoals = async () => {
            const { data, error } = await supabase
                .from('production_goals')
                .select(`
                    id, 
                    name, 
                    deadline, 
                    status, 
                    targets,
                    current_progress,
                    product:products (*)
                `)
                .neq('status', 'completed')
                .order('deadline', { ascending: true });

            if (data) {
                const formattedGoals = data.map(item => ({
                    ...item,
                    product: Array.isArray(item.product) ? item.product[0] : item.product
                }));
                setGoals(formattedGoals);
            }
            setLoading(false);
        };

        fetchGoals();

        const subscription = supabase
            .channel('production_goals_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_goals' }, fetchGoals)
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    if (loading) return <div className="p-8 text-center text-white/50 animate-pulse text-xl">Carregando metas...</div>;

    if (goals.length === 0) return (
        <div className="p-8 bg-neutral-900/50 rounded-3xl border border-white/5 text-center mb-8">
            <Target className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sem metas ativas</h3>
            <p className="text-neutral-500">Nenhuma meta de produção definida no momento.</p>
        </div>
    );

    return (
        <div className="mb-12 px-4">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Target className="text-emerald-500" size={24} />
                </div>
                Metas de Produção
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {goals.map(goal => {
                    // Check Completion
                    const targets = goal.targets || {};
                    const progress = goal.current_progress || {};
                    
                    let isComplete = true;
                    // If no targets (manual), it's never "auto-complete" unless specific logic
                    // If targets exist, check if all met
                    if (Object.keys(targets).length > 0) {
                         for (const key in targets) {
                             if ((progress[key] || 0) < targets[key]) {
                                 isComplete = false;
                                 break;
                             }
                         }
                    } else {
                        isComplete = false; // Manual goals don't auto-complete
                    }

                    return (
                    <motion.div 
                        key={goal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-3xl overflow-hidden border shadow-xl flex flex-col transition-all ${isComplete ? 'bg-[#1A3A2A] border-emerald-500/50 shadow-emerald-900/40' : 'bg-[#1A1A1A] border-white/10'}`}
                    >
                        {/* Header Image & Status */}
                        <div className="h-32 relative bg-neutral-800">
                            {goal.product?.images?.[0] ? (
                                <img src={goal.product.images[0]} alt={goal.product.name} className="w-full h-full object-cover opacity-60" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-neutral-600"><Package size={40} /></div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] to-transparent" />
                            
                            <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end">
                                <div>
                                    <h3 className="text-2xl font-bold text-white leading-tight shadow-black drop-shadow-md">{goal.product?.name}</h3>
                                    <p className="text-emerald-400 font-bold text-sm uppercase tracking-wider">{goal.name}</p>
                                </div>
                            </div>

                            <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase backdrop-blur-md border shadow-lg ${
                                isComplete ? 'bg-emerald-500 text-black border-emerald-400' :
                                new Date(goal.deadline) < new Date() 
                                ? 'bg-red-500/20 text-red-100 border-red-500/30' 
                                : 'bg-emerald-500/20 text-emerald-100 border-emerald-500/30'
                            }`}>
                                {isComplete ? 'Concluído!' : (new Date(goal.deadline) < new Date() ? 'Atrasado' : 'No Prazo')}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col">
                            {/* Deadline */}
                            <div className="flex items-center gap-3 text-neutral-400 mb-6 bg-white/5 p-3 rounded-xl">
                                <Calendar className="text-emerald-500" size={20} />
                                <span className="text-sm font-medium">
                                    Meta para: <strong className="text-white text-lg ml-1">{goal.deadline ? new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR') : 'Sem data'}</strong>
                                </span>
                            </div>

                            {/* Targets List with Progress */}
                            <div className="space-y-4 mb-8 flex-1">
                                {Object.entries(goal.targets || {}).map(([size, value]) => {
                                    const targetQty = value as number;
                                    const currentQty = (progress[size] as number) || 0;
                                    const percent = Math.min(100, (currentQty / targetQty) * 100);
                                    
                                    return (
                                        <div key={size} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-neutral-400 font-medium">{size}</span>
                                                <span className="text-white font-bold">
                                                    <span className={currentQty >= targetQty ? 'text-emerald-400' : ''}>{currentQty}</span> / {targetQty} un
                                                </span>
                                            </div>
                                            <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${currentQty >= targetQty ? 'bg-emerald-500' : 'bg-emerald-600/50'}`} 
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Action Button */}
                            {isComplete ? (
                                <div className="space-y-3">
                                    <div className="text-center p-2 mb-2">
                                        <h4 className="text-xl font-bold text-emerald-400 flex items-center justify-center gap-2">
                                            <CheckCircle2 /> Meta Atingida!
                                        </h4>
                                        <p className="text-white/60 text-sm">Parabéns! Tudo pronto para envio.</p>
                                    </div>
                                    <button 
                                        onClick={() => setShipmentModalOpen(true)}
                                        className="w-full bg-white text-emerald-900 hover:bg-neutral-200 font-bold py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg"
                                    >
                                        <Send size={24} />
                                        ENVIAR PRODUÇÃO
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => onSelectGoal && onSelectGoal(goal.product)}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg"
                                >
                                    <Droplet size={24} />
                                    REGISTRAR PRODUÇÃO
                                </button>
                            )}
                        </div>
                    </motion.div>
                );
                })}
            </div>
        </div>
    );
};

export default ActiveProductionGoals;
