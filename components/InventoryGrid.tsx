import React, { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import { Product } from '../types';
import StockControlModal from './StockControlModal';
import { Leaf, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InventoryGrid: React.FC = () => {
    const { products, loading } = useProducts();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const productsSorted = [...products].sort((a, b) => a.name.localeCompare(b.name));

    if (loading) {
        return <div className="p-10 text-center text-white text-xl">Carregando prateleira...</div>;
    }

    return (
        <div className="min-h-screen bg-black p-4 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-600">
                    Prateleira Digital
                </h1>
                <div className="text-emerald-500/80 text-sm font-medium">
                    {products.length} Itens
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {productsSorted.map((product) => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onClick={() => setSelectedProduct(product)}
                    />
                ))}
            </div>

            {/* Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <StockControlModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

const ProductCard: React.FC<{ product: Product; onClick: () => void }> = ({ product, onClick }) => {
    const isOutOfStock = (product.stock_quantity || 0) === 0;
    const progress = product.monthly_production_goal > 0
        ? Math.min(100, ((product.stock_quantity || 0) / product.monthly_production_goal) * 100)
        : 0;

    return (
        <motion.div
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
                relative aspect-square rounded-2xl overflow-hidden cursor-pointer shadow-lg
                ${isOutOfStock ? 'opacity-60 grayscale border-2 border-red-900/50' : 'border border-white/10'}
            `}
        >
            {/* Background Image */}
            <img
                src={product.images[0] || 'https://via.placeholder.com/300?text=No+Image'}
                alt={product.name}
                className="w-full h-full object-cover"
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/90 to-transparent" />

            {/* Stock Indicator (Top Right) */}
            <div className={`
                absolute top-2 right-2 px-3 py-1 rounded-full text-lg font-bold backdrop-blur-md shadow-sm
                ${isOutOfStock ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-100'}
            `}>
                {product.stock_quantity || 0}
            </div>

            {/* Name & Goal (Bottom) */}
            <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="text-white font-bold text-sm leading-tight mb-1 drop-shadow-md">
                    {product.name}
                </h3>

                {/* Goal Progress Bar */}
                {product.monthly_production_goal > 0 && (
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-1 flex items-center">
                        <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                {/* Goal & Stock footer */}
                <div className="flex justify-between items-end mt-1">
                    {product.monthly_production_goal > 0 && (
                        <div className="text-[10px] text-white/60">
                            Meta: {product.monthly_production_goal}
                        </div>
                    )}
                    <div className="text-[10px] text-emerald-400 font-bold ml-auto">
                        Prod: {product.stock_quantity || 0}
                    </div>
                </div>
            </div>

            {/* Alert Icon if stock is low or 0 */}
            {isOutOfStock && (
                <div className="absolute center inset-0 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 text-red-500/80 drop-shadow-lg" />
                </div>
            )}
        </motion.div>
    );
};

export default InventoryGrid;
