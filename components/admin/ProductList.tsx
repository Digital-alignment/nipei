import React from 'react';
import { Edit, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Product } from '../../types';
import { useProducts } from '../../context/ProductContext';

interface ProductListProps {
    onEdit: (product: Product) => void;
    onCreate: () => void;
    filter?: (product: Product) => boolean;
}

const ProductList: React.FC<ProductListProps> = ({ onEdit, onCreate, filter }) => {
    const { products, deleteProduct, loading } = useProducts();

    const filteredProducts = filter ? products.filter(filter) : products;

    const handleDelete = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produto?')) {
            await deleteProduct(id);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
                <div>
                    <h2 className="text-xl font-bold text-white">Catálogo de Produtos</h2>
                    <p className="text-neutral-400 text-sm">Gerencie todos os itens do site</p>
                </div>
                <button
                    onClick={onCreate}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                    <Plus size={20} />
                    Novo Produto
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {filteredProducts.map((product) => (
                    <div key={product.id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${product.isVisible ? 'bg-neutral-800/50 border-neutral-700 hover:border-emerald-500/30' : 'bg-neutral-900/30 border-neutral-800 opacity-60'}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-20 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-700 relative">
                                {product.images?.[0] ? (
                                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-neutral-800 flex items-center justify-center text-neutral-600 text-xs">Sem Foto</div>
                                )}
                                {!product.isVisible && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-neutral-400">
                                        <EyeOff size={20} />
                                    </div>
                                )}
                                {product.isVisible && (
                                    <div className="absolute top-1 right-1 bg-emerald-500/20 text-emerald-500 p-1 rounded-full">
                                        <Eye size={12} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-white">{product.name}</h3>
                                <div className="flex items-center gap-3 text-sm text-neutral-400">
                                    <span className="bg-neutral-900 px-2 py-0.5 rounded text-xs border border-neutral-700">{product.technicalName}</span>
                                    <span>{product.classification}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onEdit(product)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                                title="Editar"
                            >
                                <Edit size={20} />
                            </button>
                            <button
                                onClick={() => handleDelete(product.id)}
                                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </div>
                ))}

                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 text-neutral-500">
                        Nenhum produto cadastrado.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductList;
