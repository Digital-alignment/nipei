import React, { useState } from 'react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Target, Loader2, Save } from 'lucide-react';

interface CreateProductionGoalModalProps {
    product: Product;
    onClose: () => void;
}

const CreateProductionGoalModal: React.FC<CreateProductionGoalModalProps> = ({ product, onClose }) => {
    const [name, setName] = useState('');
    const [deadline, setDeadline] = useState('');
    const [targets, setTargets] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    // Get sizes from product variation data or default to empty
    const sizes = product.variation_data?.sizes || [];

    const handleTargetChange = (size: string, qty: number) => {
        setTargets(prev => ({
            ...prev,
            [size]: qty
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('production_goals')
                .insert({
                    product_id: product.id,
                    name,
                    deadline,
                    targets, // JSONB: {"1 Litro": 10, ...}
                    status: 'pending'
                });

            if (error) throw error;

            alert('Meta de produção criada com sucesso!');
            onClose();
        } catch (error) {
            console.error('Error creating goal:', error);
            alert('Erro ao criar meta.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-lg p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                        <Target className="text-emerald-500" />
                        Nova Meta de Produção
                    </h2>
                    <p className="text-white/40 text-sm">Defina objetivos para {product.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Batch Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Nome da Produção / Lote</label>
                        <input
                            required
                            placeholder="Ex: Janeiro 2024"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>

                    {/* Deadline */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Data Limite (Previsão)</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                required
                                type="date"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 pl-10 text-white focus:border-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Targets per Size */}
                    {sizes.length > 0 ? (
                        <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-800 space-y-3">
                            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-2">Metas por Variação</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {sizes.map(size => (
                                    <div key={size} className="space-y-1">
                                        <label className="text-xs text-neutral-400">{size}</label>
                                        <input
                                            type="number"
                                            min="0"
                                            placeholder="Qtd"
                                            value={targets[size] || ''}
                                            onChange={e => handleTargetChange(size, parseInt(e.target.value) || 0)}
                                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-white text-center focus:border-emerald-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500 text-sm">
                            Este produto não possui variações de tamanho configuradas. A meta será genérica.
                            <div className="mt-2">
                                <label className="text-xs text-amber-500/80 uppercase font-bold">Quantidade Total</label>
                                <input
                                    type="number"
                                    min="1"
                                    onChange={e => handleTargetChange('total', parseInt(e.target.value))}
                                    className="w-full bg-neutral-900/50 border border-amber-500/30 rounded-lg p-2 text-white mt-1"
                                />
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !name || !deadline}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        Salvar Meta Produção
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateProductionGoalModal;
