import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // Adjust path
import { Target, Calendar, ChevronRight, Package, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ProductionGoal {
    id: string;
    name: string;
    deadline: string;
    status: string;
    targets: Record<string, number>;
    product: {
        id: string;
        name: string;
        images: string[];
    };
}

const ActiveProductionGoals: React.FC = () => {
    const [goals, setGoals] = useState<ProductionGoal[]>([]);
    const [loading, setLoading] = useState(true);

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
                    product:products (id, name, images)
                `)
                .neq('status', 'completed')
                .order('deadline', { ascending: true });

            if (data) {
                // Transform data to match interface if needed (Supabase returns arrays for joins sometimes)
                const formattedGoals = data.map(item => ({
                    ...item,
                    product: Array.isArray(item.product) ? item.product[0] : item.product
                }));
                setGoals(formattedGoals);
            }
            setLoading(false);
        };

        fetchGoals();

        // Optional: Subscribe to changes
        const subscription = supabase
            .channel('production_goals_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_goals' }, fetchGoals)
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    if (loading) return <div className="p-4 text-center text-white/50 animate-pulse">Carregando metas...</div>;

    if (goals.length === 0) return null;

    return (
        <div className="mb-8 px-4">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Target className="text-emerald-500" />
                Metas de Produção Ativas
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map(goal => (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={goal.id} 
                        className="bg-neutral-800/80 border border-neutral-700/50 rounded-2xl p-4 relative overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-lg bg-neutral-700 overflow-hidden border border-neutral-600">
                                    {goal.product?.images?.[0] ? (
                                        <img src={goal.product.images[0]} alt={goal.product.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-500"><Package size={20} /></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-white leading-tight">{goal.product?.name}</h3>
                                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{goal.name}</p>
                                </div>
                            </div>
                            <div className={`
                                px-2 py-1 rounded text-[10px] font-bold uppercase border
                                ${new Date(goal.deadline) < new Date() ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-neutral-900 text-neutral-400 border-neutral-700'}
                            `}>
                                {new Date(goal.deadline) < new Date() ? 'Atrasado' : 'No Prazo'}
                            </div>
                        </div>

                        {/* Deadline */}
                        <div className="flex items-center gap-2 text-sm text-neutral-300 mb-4 bg-black/20 p-2 rounded-lg">
                            <Calendar size={14} className="text-emerald-500" />
                            <span>Entrega: <strong className="text-white">{new Date(goal.deadline + 'T12:00:00').toLocaleDateString('pt-BR')}</strong></span>
                        </div>

                        {/* Targets Grid */}
                        <div className="bg-neutral-900/50 rounded-xl p-3 border border-white/5">
                            <p className="text-[10px] text-neutral-500 uppercase font-bold mb-2">Objetivos</p>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(goal.targets || {}).map(([size, quantity]) => (
                                    <div key={size} className="flex justify-between items-center bg-neutral-800 px-2 py-1.5 rounded-lg border border-neutral-700/50">
                                        <span className="text-xs text-neutral-400 font-medium">{size}</span>
                                        <span className="text-sm font-bold text-white">{quantity} <span className="text-[10px] text-neutral-600">un</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute inset-0 bg-emerald-900/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default ActiveProductionGoals;
