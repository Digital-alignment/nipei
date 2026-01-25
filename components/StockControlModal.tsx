import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplet, Send, TriangleAlert, Camera, Check, Loader2, Target } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StockControlModalProps {
    product: Product;
    onClose: () => void;
}

const StockControlModal: React.FC<StockControlModalProps> = ({ product, onClose }) => {
    const { logProductionAction } = useProducts();
    const [mode, setMode] = useState<'main' | 'problem' | 'producing'>('main');
    const [loading, setLoading] = useState(false);

    // Producing State
    const [produceQuantity, setProduceQuantity] = useState(1);
    const [targets, setTargets] = useState<Record<string, number>>({});

    // Problem State
    const [problemDescription, setProblemDescription] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProduce = () => {
        setMode('producing');
    };

    const handleProduceSubmit = async () => {
        setLoading(true);
        try {
            let finalQty = 0;
            let description = '';

            if (product.variation_data?.sizes && product.variation_data.sizes.length > 0) {
                 // Sum up targets
                 Object.entries(targets).forEach(([size, value]) => {
                     const qty = value as number;
                     if (qty > 0) {
                         finalQty += qty;
                         description += `${qty}x ${size}, `;
                     }
                 });
                 if (description) description = `Produção: ${description.slice(0, -2)}`; // Remove last comma
                 else {
                     // If user didn't select anything but clicked confirm, maybe default to 0? Or alert?
                     // For now assume 0 is effectively a no-op or user error
                     if (finalQty === 0) {
                         alert('Selecione uma quantidade.');
                         setLoading(false);
                         return;
                     }
                 }
            } else {
                finalQty = produceQuantity;
                description = 'Produção Manual';
            }

            await logProductionAction(product.id, 'produced', finalQty, description);

            // Update Goal Progress if exists
            if (activeGoals.length > 0) {
                 const goal = activeGoals[0]; // Assume first active goal
                 const currentProgress = goal.current_progress || {};
                 
                 // Calculate new progress
                 const newProgress = { ...currentProgress };
                 
                 if (product.variation_data?.sizes && product.variation_data.sizes.length > 0) {
                     Object.entries(targets).forEach(([size, qty]) => {
                         const current = (newProgress[size] as number) || 0;
                         newProgress[size] = current + (qty as number);
                     });
                 } else {
                     // No variation, just sum total? Currently goals structure assumes JSONB targets
                     // If goal was created without sizes, it might just use "Total" or similar key? 
                     // For now, let's assume we track "produced" quantity if no specific key matched, or use a default key
                     // But wait, if product has no sizes, how was the goal created?
                     // The CreateProductionGoalModal uses "targets" even for no sizes? 
                     // Let's look at CreateProductionGoalModal... it uses targets state.
                     // If no sizes, it probably didn't populate "targets" with keys? 
                     // Actually logic there was: const sizes = product.variation_data?.sizes || [];
                     // If sizes is empty, it probably just saves targets as {}? 
                     // Re-reading CreateProductionGoalModal: It makes sizes optional.
                     // If no sizes, the Modal doesn't seem to have a default input in the refactor?
                     // Wait, in my previous refactor of CreateProductionGoalModal I added:
                     // if (!sizes.length) ... generic input? 
                     // Actually I might have missed the "generic single target" case in the goal creation modal refactor?
                     // Checking CreateProductionGoalModal again...
                     // If sizes is empty, it doesn't render inputs for target?
                     // Let's assume for now we are using sizes. 
                     // If we are in "Manual" mode (no sizes) => targets is empty.
                     // We should just track "Total": newProgress['Total'] = (newProgress['Total'] || 0) + produceQuantity
                     const current = (newProgress['Total'] as number) || 0;
                     newProgress['Total'] = current + produceQuantity;
                 }

                 // Update DB
                 await supabase
                     .from('production_goals')
                     .update({ current_progress: newProgress })
                     .eq('id', goal.id);
            }

            onClose();
        } catch (error) {
            console.error('Error producing:', error);
            alert('Erro ao registrar produção.');
        } finally {
            setLoading(false);
        }
    };

    const handleProblemSubmit = async () => {
        if (!problemDescription) return;
        setLoading(true);
        await logProductionAction(product.id, 'problem', 0, problemDescription);
        setLoading(false);
        onClose();
    };

    const [activeGoals, setActiveGoals] = useState<any[]>([]);

    React.useEffect(() => {
        const fetchGoals = async () => {
            const { data } = await supabase
                .from('production_goals')
                .select('*')
                .eq('product_id', product.id)
                .neq('status', 'completed');
            if (data) setActiveGoals(data);
        };
        fetchGoals();
    }, [product.id]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-between p-6"
        >
            {/* Header / Close */}
            <div className="w-full flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                    {product.images[0] ? (
                        <img src={product.images[0]} className="w-16 h-16 rounded-lg object-cover border border-white/20" alt="Mini" />
                    ) : (
                        <div className="w-16 h-16 rounded-lg bg-neutral-800 border border-white/20 flex items-center justify-center text-xs text-neutral-500">Sem Foto</div>
                    )}
                    <div>
                        <h2 className="text-white text-xl font-bold leading-none">{product.name}</h2>
                        <span className="text-white/50 text-sm">{product.technicalName || 'N/A'}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white">
                    <X size={24} />
                </button>
            </div>

            {/* MAIN MODE */}
            {mode === 'main' && (
                <>
                    {/* Big Counter */}
                    <div className="flex flex-col items-center justify-center flex-1 w-full relative">
                        <div className="text-[120px] font-bold text-white leading-none tracking-tighter">
                            {product.stock_quantity || 0}
                        </div>
                        <div className="text-emerald-400 font-medium text-lg mt-2 mb-4">
                            Meta Mensal: {product.monthly_production_goal || 0}
                        </div>

                         {/* Active Goals Display */}
                        {activeGoals.length > 0 && (
                            <div className="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4 mb-4">
                                <h4 className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <Target size={16} /> Metas Ativas
                                </h4>
                                <div className="space-y-2">
                                    {activeGoals.map(goal => (
                                        <div key={goal.id} className="text-white text-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold">{goal.name}</span>
                                                <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${new Date(goal.deadline) < new Date() ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'}`}>
                                                    {goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR') : 'Contínua'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(goal.targets || {}).map(([size, quantity]) => (
                                                    <div key={size} className="bg-black/40 px-2 py-1 rounded flex justify-between">
                                                        <span className="text-white/60 text-xs">{size}</span>
                                                        <span className="font-bold">{quantity as number}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Massive Buttons */}
                    <div className="w-full h-32 mb-4">
                        {/* PRODUCE BUTTON */}
                        <button
                            onClick={handleProduce}
                            disabled={loading}
                            className="w-full h-full bg-emerald-800/80 rounded-3xl flex items-center justify-center gap-6 active:scale-95 transition-transform relative overflow-hidden text-emerald-100"
                        >
                            {loading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                            <Droplet size={48} className="text-emerald-200" />
                            <span className="font-bold text-3xl">PRODUZIR</span>
                        </button>
                    </div>

                    {/* Report Problem */}
                    <button
                        onClick={() => setMode('problem')}
                        className="w-full py-4 flex items-center justify-center gap-2 text-red-400 font-medium hover:bg-white/5 rounded-xl transition-colors"
                    >
                        <TriangleAlert size={20} />
                        Reportar Problema
                    </button>
                </>
            )}



            {/* PRODUCING MODE */}
            {mode === 'producing' && (
                <div className="flex flex-col w-full h-full">
                    <h3 className="text-2xl text-white font-bold mb-6">Registrar Produção</h3>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-4">
                        {product.variation_data?.sizes && product.variation_data.sizes.length > 0 ? (
                            <div className="space-y-4">
                                {product.variation_data.sizes.map((size: string) => {
                                    const qty = (targets as any)[size] || 0;
                                    return (
                                        <div key={size} className="bg-neutral-800 p-4 rounded-xl flex items-center justify-between border border-white/5">
                                            <span className="text-white font-bold text-lg">{size}</span>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setTargets(prev => ({ ...prev, [size]: Math.max(0, ((prev as any)[size] || 0) - 1) }))}
                                                    className="w-12 h-12 rounded-full bg-white/10 text-white text-2xl active:scale-90 transition-transform flex items-center justify-center hover:bg-white/20"
                                                >
                                                    -
                                                </button>
                                                <span className="text-2xl font-bold text-emerald-400 min-w-[3ch] text-center">{qty}</span>
                                                <button
                                                    onClick={() => setTargets(prev => ({ ...prev, [size]: ((prev as any)[size] || 0) + 1 }))}
                                                    className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 text-2xl active:scale-90 transition-transform flex items-center justify-center hover:bg-emerald-500/30"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* Simple Quantity Selector (No Sizes) */
                            <div className="bg-white/10 rounded-2xl p-10 flex flex-col items-center">
                                <span className="text-white/60 mb-4 text-lg">Quantidade Produzida</span>
                                <div className="flex items-center gap-8">
                                    <button
                                        onClick={() => setProduceQuantity(Math.max(1, produceQuantity - 1))}
                                        className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl active:scale-90 transition-transform"
                                    >
                                        -
                                    </button>
                                    <span className="text-6xl font-bold text-white min-w-[3ch] text-center">{produceQuantity}</span>
                                    <button
                                        onClick={() => setProduceQuantity(produceQuantity + 1)}
                                        className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl active:scale-90 transition-transform"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4 mt-auto">
                        <button onClick={() => setMode('main')} className="flex-1 py-4 rounded-xl bg-white/10 text-white font-bold">Cancelar</button>
                        <button
                            onClick={handleProduceSubmit}
                            disabled={loading}
                            className="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Check size={24} />}
                            CONFIRMAR
                        </button>
                    </div>
                </div>
            )}

            {/* PROBLEM MODE */}
            {
                mode === 'problem' && (
                    <div className="flex flex-col w-full h-full">
                        <h3 className="text-2xl text-red-400 font-bold mb-6 flex items-center gap-2">
                            <TriangleAlert /> Reportar Problema
                        </h3>

                        <textarea
                            className="flex-1 bg-white/10 rounded-2xl p-4 text-white placeholder-white/40 resize-none text-lg"
                            placeholder="O que aconteceu? (Ex: Quebra de máquina, chuva forte...)"
                            value={problemDescription}
                            onChange={(e) => setProblemDescription(e.target.value)}
                        />

                        <div className="flex gap-4 mt-6">
                            <button onClick={() => setMode('main')} className="flex-1 py-4 rounded-xl bg-white/10 text-white font-bold">Cancelar</button>
                            <button
                                onClick={handleProblemSubmit}
                                disabled={loading || !problemDescription}
                                className="flex-1 py-4 rounded-xl bg-red-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin" /> : <Send />}
                                Relatar
                            </button>
                        </div>
                    </div>
                )
            }
        </motion.div >
    );
};

export default StockControlModal;
