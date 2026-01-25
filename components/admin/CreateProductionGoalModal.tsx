import React, { useState } from 'react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Target, Loader2, Save, Search, ChevronRight } from 'lucide-react';
import { useProducts } from '../../context/ProductContext';

interface CreateProductionGoalModalProps {
    product?: Product | null;
    onClose: () => void;
}

const CreateProductionGoalModal: React.FC<CreateProductionGoalModalProps> = ({ product: initialProduct, onClose }) => {
    const { products } = useProducts();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(initialProduct || null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Derived product to work with
    const product = selectedProduct;

    const [activeGoals, setActiveGoals] = useState<any[]>([]);
    const [name, setName] = useState('');
    const [deadline, setDeadline] = useState('');
    const [targets, setTargets] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(false);

    const fetchGoals = async () => {
        if (!product) return;
        const { data } = await supabase
            .from('production_goals')
            .select('*')
            .eq('product_id', product.id)
            .neq('status', 'completed')
            .order('created_at', { ascending: false });
        if (data) setActiveGoals(data);
    };

    React.useEffect(() => {
        if (product) {
            fetchGoals();
        }
    }, [product?.id]);

    const handleDeleteGoal = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esta meta?')) return;
        const { error } = await supabase.from('production_goals').delete().eq('id', id);
        if (error) alert('Erro ao excluir');
        else fetchGoals();
    };

    const handleCompleteGoal = async (id: string) => {
        const { error } = await supabase.from('production_goals').update({ status: 'completed' }).eq('id', id);
        if (error) alert('Erro ao concluir');
        else fetchGoals();
    };

    // Get sizes from product variation data or default to empty
    const sizes = product?.variation_data?.sizes || [];

    const handleTargetChange = (size: string, qty: number) => {
        setTargets(prev => ({
            ...prev,
            [size]: qty
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product) return;
        
        setLoading(true);

        try {
            const { error } = await supabase
                .from('production_goals')
                .insert({
                    product_id: product.id,
                    name,
                    deadline: deadline || null,
                    targets, // JSONB: {"1 Litro": 10, ...}
                    status: 'pending'
                });

            if (error) throw error;

            alert('Meta de produção criada com sucesso!');
            setName('');
            setDeadline('');
            setTargets({});
            fetchGoals(); // Refresh list instead of closing
        } catch (error: any) {
            console.error('Error creating goal:', error);
            alert('Erro ao criar meta: ' + (error.message || 'Desconhecido'));
        } finally {
            setLoading(false);
        }
    };

    // Filter products for search
    const filteredProducts = products.filter(p => 
        (p.product_type === 'bulk' || p.production_type) && 
        (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
         p.technicalName?.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (!product) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-2xl p-6 relative shadow-2xl">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors z-10"
                    >
                        <X size={20} />
                    </button>

                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            <Search className="text-emerald-500" />
                            Selecionar Produto
                        </h2>
                        <p className="text-white/40 text-sm">Busque o produto para criar uma meta de produção</p>
                    </div>

                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                        <input
                            autoFocus
                            placeholder="Buscar por nome ou código..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-4 pl-12 text-white placeholder-neutral-500 focus:border-emerald-500 outline-none text-lg"
                        />
                    </div>

                    <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-10 text-neutral-500">
                                Nenhum produto encontrado.
                            </div>
                        ) : (
                            filteredProducts.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setSelectedProduct(p)}
                                    className="w-full flex items-center justify-between p-4 bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-emerald-500/30 rounded-xl transition-all group text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-neutral-900 border border-neutral-700 overflow-hidden">
                                            {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" />}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                                            <div className="flex items-center gap-2 text-xs text-neutral-400">
                                                <span className="bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-700">{p.technicalName}</span>
                                                <span>{p.classification}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-neutral-600 group-hover:text-emerald-500 transform group-hover:translate-x-1 transition-all" />
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-4xl p-6 relative shadow-2xl flex flex-col md:flex-row gap-8">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* LEFT: FORM */}
                <div className="flex-1">
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            <Target className="text-emerald-500" />
                            Nova Meta
                        </h2>
                        <div className="flex items-center gap-2">
                             <p className="text-white/40 text-sm">Defina objetivos para <strong className="text-emerald-400">{product.name}</strong></p>
                             {!initialProduct && (
                                 <button onClick={() => setSelectedProduct(null)} className="text-xs text-neutral-500 hover:text-white underline ml-2">Alterar Produto</button>
                             )}
                        </div>
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
                                    type="date"
                                    value={deadline}
                                    onChange={e => setDeadline(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 pl-10 text-white focus:border-emerald-500 outline-none"
                                />
                                <p className="text-[10px] text-neutral-500 mt-1 ml-1">Deixe em branco para "Meta Contínua"</p>
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
                            disabled={loading || !name}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                            Criar Meta
                        </button>
                    </form>
                </div>

                {/* RIGHT: LIST */}
                <div className="flex-1 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-8">
                    <h3 className="text-lg font-bold text-white mb-4">Metas Ativas</h3>
                    
                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {activeGoals.length === 0 ? (
                            <div className="text-neutral-500 text-center py-10 bg-white/5 rounded-xl border border-white/5 border-dashed">
                                Nenhuma meta ativa.
                            </div>
                        ) : (
                            activeGoals.map(goal => (
                                <div key={goal.id} className="bg-neutral-800 p-4 rounded-xl border border-neutral-700 relative group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h4 className="font-bold text-white">{goal.name}</h4>
                                            <p className="text-xs text-neutral-400">
                                                {goal.deadline ? `Até ${new Date(goal.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo'}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleCompleteGoal(goal.id)}
                                                className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded hover:bg-emerald-500 hover:text-white transition-colors"
                                                title="Concluir Meta"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteGoal(goal.id)}
                                                className="p-1.5 bg-red-500/10 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                title="Excluir Meta"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(goal.targets || {}).map(([size, quantity]) => (
                                            <span key={size} className="text-[10px] bg-black/40 px-2 py-1 rounded text-white border border-white/10">
                                                <span className="text-neutral-400">{size}:</span> <strong>{quantity as number}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateProductionGoalModal;
