import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Product } from '../../types';
import { useProducts } from '../../context/ProductContext';
import { motion } from 'framer-motion';

interface MutumProductFormProps {
    product?: Product | null;
    onClose: () => void;
}

const emptyProduct: Product = {
    id: '',
    name: '',
    technicalName: '', // Código
    classification: 'Produção Mutum', // Default for Mutum
    images: [''],
    benefits: '',
    history: '',
    composition: '',
    labels: [],
    audioSlots: [],
    isVisible: true,
    stock_quantity: 0,
    monthly_production_goal: 0,
    production_type: 'bulk', // Default to bulk/production
    variation_data: { sizes: [] }
};

const MutumProductForm: React.FC<MutumProductFormProps> = ({ product, onClose }) => {
    const { addProduct, updateProduct } = useProducts();
    const [formData, setFormData] = useState<Product>(emptyProduct);
    const isEditing = !!product;

    useEffect(() => {
        if (product) {
            setFormData(product);
        } else {
            setFormData({ ...emptyProduct, id: Date.now().toString() });
        }
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await updateProduct(formData);
            } else {
                await addProduct(formData);
            }
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar produto.');
        }
    };

    const handleImageChange = (index: number, value: string) => {
        const newImages = [...formData.images];
        newImages[index] = value;
        setFormData({ ...formData, images: newImages });
    };

    const addImage = () => {
        setFormData({ ...formData, images: [...formData.images, ''] });
    };

    const removeImage = (index: number) => {
        setFormData({ ...formData, images: formData.images.filter((_, i) => i !== index) });
    };

    const toggleSize = (size: string) => {
        const currentSizes = formData.variation_data?.sizes || [];
        let newSizes;
        if (currentSizes.includes(size)) {
            newSizes = currentSizes.filter(s => s !== size);
        } else {
            newSizes = [...currentSizes, size];
        }
        setFormData({ 
            ...formData, 
            variation_data: { ...formData.variation_data, sizes: newSizes }
        });
    };

    const availableSizes = ['10ml', '30ml', '50ml', '500ml', '1 Litro', '2 Litros', '5 Litros', '10 Litros'];

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto pb-12 space-y-6">
            <div className="flex items-center justify-between sticky top-0 z-10 bg-neutral-900 py-4 border-b border-neutral-700 mb-6">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-xl font-bold font-serif">{isEditing ? 'Editar Produto (Mutum)' : 'Novo Produto (Mutum)'}</h2>
                </div>
                <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-emerald-900/20"
                >
                    <Save size={18} /> Salvar
                </button>
            </div>

            <div className="bg-neutral-800 p-6 rounded-2xl border border-white/5 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Nome do Produto</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="Ex: Óleo de Copaíba"
                        />
                    </div>
                     <div className="space-y-2">
                        <label className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Código (Nome Técnico)</label>
                        <input
                            value={formData.technicalName}
                            onChange={e => setFormData({ ...formData, technicalName: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="Ex: PROD-001"
                        />
                    </div>
                </div>

                {/* Visibility Toggle */}
                <div className="flex items-center gap-3 p-4 bg-neutral-900/50 rounded-xl border border-neutral-700 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setFormData({...formData, isVisible: !formData.isVisible})}>
                    <div className={`w-10 h-6 rounded-full relative transition-colors ${formData.isVisible ? 'bg-emerald-500' : 'bg-neutral-700'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${formData.isVisible ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-white">Visível no Catálogo de Vendas</span>
                </div>

                {/* Images */}
                <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs text-neutral-400 font-bold uppercase tracking-wider">
                        <ImageIcon size={14} /> Imagem do Produto
                    </label>
                    {formData.images.map((img, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                placeholder="URL da Imagem..."
                                value={img}
                                onChange={e => handleImageChange(idx, e.target.value)}
                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                            />
                             {idx === formData.images.length - 1 && (
                                <button type="button" onClick={addImage} className="p-3 bg-neutral-700 hover:bg-neutral-600 rounded-xl text-white transition-colors" title="Adicionar outra imagem">
                                    <Plus size={20} />
                                </button>
                            )}
                            {formData.images.length > 1 && (
                                <button type="button" onClick={() => removeImage(idx)} className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors">
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    ))}
                     {formData.images[0] && (
                        <div className="w-32 h-32 rounded-lg overflow-hidden border border-neutral-700 bg-black/20">
                            <img src={formData.images[0]} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                {/* Variations / Sizes */}
                <div className="space-y-3 pt-4 border-t border-white/5">
                    <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4">Variações / Tamanhos (Produção)</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {availableSizes.map(size => (
                            <label key={size} className={`flex items-center justify-center p-3 rounded-xl border cursor-pointer transition-all ${formData.variation_data?.sizes?.includes(size) ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
                                <input 
                                    type="checkbox"
                                    className="hidden"
                                    checked={formData.variation_data?.sizes?.includes(size) || false}
                                    onChange={() => toggleSize(size)}
                                />
                                <span className="text-sm font-bold">{size}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default MutumProductForm;
