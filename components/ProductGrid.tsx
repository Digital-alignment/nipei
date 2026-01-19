
import React from 'react';
import { motion } from 'framer-motion';
import { Product, Theme } from '../types';
import { ArrowUpRight } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  onSelect: (product: Product) => void;
  theme: Theme;
}

const ProductCard: React.FC<{
  product: Product;
  onSelect: (product: Product) => void;
  theme: Theme;
}> = ({ product, onSelect, theme }) => {
  return (
    <motion.div
      layoutId={`card-${product.id}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -12 }}
      onClick={() => onSelect(product)}
      className={`
        group relative aspect-[4/5] rounded-[2.5rem] overflow-hidden cursor-pointer
        shadow-2xl transition-shadow duration-500 hover:shadow-emerald-500/20
        ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-emerald-100'}
      `}
    >
      {/* Image Layer */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={product.images?.[0] || 'https://via.placeholder.com/300?text=No+Image'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-opacity duration-500 opacity-80 group-hover:opacity-100" />
      </div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-10 p-8 flex flex-col justify-end">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="text-[10px] uppercase tracking-[0.4em] text-emerald-400 font-black mb-3 block drop-shadow-lg">
            {product.classification.split(' / ')[0]}
          </span>
          <h3 className="text-3xl md:text-4xl font-serif text-white mb-4 leading-tight group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>
          <p className="text-white/60 text-sm line-clamp-2 font-light leading-relaxed mb-6 group-hover:text-white/80 transition-colors">
            {product.benefits}
          </p>

          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all">
            Descobrir Medicina <ArrowUpRight size={14} />
          </div>
        </motion.div>
      </div>

      {/* Detail highlight on top right */}
      <div className="absolute top-6 right-6 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-3 rounded-2xl text-white">
          <ArrowUpRight size={24} />
        </div>
      </div>
    </motion.div>
  );
};

const ProductGrid: React.FC<ProductGridProps> = ({ products, onSelect, theme }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onSelect={onSelect}
          theme={theme}
        />
      ))}
    </div>
  );
};

export default ProductGrid;
