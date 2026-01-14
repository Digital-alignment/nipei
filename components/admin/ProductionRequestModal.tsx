import React, { useState } from 'react';
import { Product } from '../../types';
import { supabase } from '../../lib/supabase';
import { X, Calendar, Package, Plus, Loader2 } from 'lucide-react';

interface ProductionRequestModalProps {
    products: Product[];
    onClose: () => void;
}

const ProductionRequestModal: React.FC<ProductionRequestModalProps> = ({ products = [], onClose }) => {
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [neededDate, setNeededDate] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !quantity || !neededDate) return;

        setLoading(true);
        try {
            const { error } = await supabase
                .from('production_requests')
                .insert({
                    product_id: selectedProduct,
                    quantity: quantity,
                    needed_date: neededDate,
                    status: 'pending'
                });

            if (error) throw error;
            onClose();
            alert('Solicitação enviada com sucesso!');
        } catch (error) {
            console.error('Error creating request:', error);
            alert('Erro ao criar solicitação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">Solicitar Produção</h2>
                    <p className="text-white/40 text-sm">Envie um pedido para a gestão de estoque.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/60">Produto</label>
                        <div className="relative">
                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <select
                                value={selectedProduct}
                                onChange={(e) => setSelectedProduct(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white appearance-none focus:outline-none focus:border-emerald-500 transition-colors"
                                required
                            >
                                <option value="" className="bg-[#1A1A1A]">Selecione um produto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id} className="bg-[#1A1A1A]">
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/60">Quantidade</label>
                        <div className="relative">
                            <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-2">
                                <button
                                    type="button"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                                    className="flex-1 bg-transparent text-center text-white font-bold text-lg outline-none"
                                    min="1"
                                />
                                <button
                                    type="button"
                                    onClick={() => setQuantity(quantity + 1)}
                                    className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/60">Data Necessária</label>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                            <input
                                type="date"
                                value={neededDate}
                                onChange={(e) => setNeededDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !selectedProduct}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
                        Confirmar Solicitação
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProductionRequestModal;
