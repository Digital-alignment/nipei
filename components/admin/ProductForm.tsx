import React, { useState, useEffect } from 'react';
import { Save, X, Plus, Trash2, ArrowLeft, Image as ImageIcon, Music, Tag } from 'lucide-react';
import { Product, AudioSlot } from '../../types';
import { useProducts } from '../../context/ProductContext';

interface ProductFormProps {
    product?: Product | null;
    onClose: () => void;
}

const emptyProduct: Product = {
    id: '',
    name: '',
    technicalName: '',
    classification: '',
    images: [''],
    benefits: '',
    history: '',
    composition: '',
    labels: [{ key: '', value: '' }],
    audioSlots: [],
    isVisible: true,
    stock_quantity: 0,
    monthly_production_goal: 0
};

const ProductForm: React.FC<ProductFormProps> = ({ product, onClose }) => {
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
        if (isEditing) {
            await updateProduct(formData);
        } else {
            await addProduct(formData);
        }
        onClose();
    };

    const handleLabelChange = (index: number, field: 'key' | 'value', value: string) => {
        const newLabels = [...formData.labels];
        newLabels[index] = { ...newLabels[index], [field]: value };
        setFormData({ ...formData, labels: newLabels });
    };

    const addLabel = () => {
        setFormData({ ...formData, labels: [...formData.labels, { key: '', value: '' }] });
    };

    const removeLabel = (index: number) => {
        setFormData({ ...formData, labels: formData.labels.filter((_, i) => i !== index) });
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

    const handleAudioChange = (index: number, field: keyof AudioSlot, value: string) => {
        const newAudios = [...formData.audioSlots];
        newAudios[index] = { ...newAudios[index], [field]: value };
        setFormData({ ...formData, audioSlots: newAudios });
    };

    const addAudio = () => {
        setFormData({
            ...formData,
            audioSlots: [...formData.audioSlots, { id: Date.now().toString(), title: '', author: '', url: '' }]
        });
    };

    const removeAudio = (index: number) => {
        setFormData({ ...formData, audioSlots: formData.audioSlots.filter((_, i) => i !== index) });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-12">
            <div className="flex items-center justify-between sticky top-0 z-10 bg-neutral-900 py-4 border-b border-neutral-700">
                <div className="flex items-center gap-4">
                    <button type="button" onClick={onClose} className="p-2 hover:bg-neutral-800 rounded-lg">
                        <ArrowLeft />
                    </button>
                    <h2 className="text-xl font-bold">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h2>
                </div>
                <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium"
                >
                    <Save size={18} /> Salvar Produto
                </button>
            </div>

            {/* Basic Info */}
            <section className="bg-neutral-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold border-b border-neutral-700 pb-2 mb-4">Informações Básicas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Nome do Produto</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <input
                            required
                            value={formData.classification}
                            onChange={e => setFormData({ ...formData, classification: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Nome Técnico (Código)</label>
                        <input
                            value={formData.technicalName}
                            onChange={e => setFormData({ ...formData, technicalName: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Meta de Produção Mensal</label>
                        <input
                            type="number"
                            min="0"
                            value={formData.monthly_production_goal || 0}
                            onChange={e => setFormData({ ...formData, monthly_production_goal: parseInt(e.target.value) || 0 })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>

                </div>
                <div className="flex items-end pb-1 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer group bg-neutral-900 border border-neutral-700 rounded-lg p-3 w-full hover:border-emerald-500 transition-colors">
                        <input
                            type="checkbox"
                            checked={formData.isVisible}
                            onChange={e => setFormData({ ...formData, isVisible: e.target.checked })}
                            className="w-5 h-5 accent-emerald-500 cursor-pointer"
                        />
                        <span className="text-white font-medium">Visível no Catálogo (Vendas)</span>
                    </label>

                    <div className="w-full space-y-2">
                         <label className="text-sm text-neutral-400">Tipo de Produto (Squad 2)</label>
                         <select
                            value={formData.production_type || ''}
                            onChange={(e) => setFormData({ ...formData, production_type: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                         >
                            <option value="">Selecione...</option>
                            <option value="hidrolato">Hidrolato</option>
                            <option value="oleo_essencial">Óleo Essencial</option>
                            <option value="tintura">Tintura</option>
                            <option value="outro">Outro</option>
                         </select>
                    </div>
                </div>

                {/* Variations / Sizes */}
                {(formData.production_type || formData.product_type === 'bulk') && (
                     <div className="bg-neutral-900/50 p-4 rounded-xl border border-neutral-700 space-y-3">
                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Variações / Tamanhos (Produção)</h4>
                        <div className="grid grid-cols-2 gap-3">
                             {['2 Litros', '5 Litros', '10 Litros', '10ml', '30ml', '50ml', '500ml', '1 Litro'].map(size => (
                                 <label key={size} className="flex items-center gap-2 p-2 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-emerald-500 cursor-pointer">
                                     <input 
                                         type="checkbox"
                                         checked={formData.variation_data?.sizes?.includes(size) || false}
                                         onChange={(e) => {
                                             const currentSizes = formData.variation_data?.sizes || [];
                                             let newSizes;
                                             if (e.target.checked) {
                                                 newSizes = [...currentSizes, size];
                                             } else {
                                                 newSizes = currentSizes.filter((s: string) => s !== size);
                                             }
                                             setFormData({ 
                                                 ...formData, 
                                                 variation_data: { ...formData.variation_data, sizes: newSizes },
                                                 product_type: 'bulk' // Force bulk if setting sizes here
                                             });
                                         }}
                                         className="accent-emerald-500"
                                     />
                                     <span className="text-sm text-white">{size}</span>
                                 </label>
                             ))}
                        </div>
                     </div>
                )}
            </section>

            {/* Content */}
            <section className="bg-neutral-800 p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold border-b border-neutral-700 pb-2 mb-4">Conteúdo Detalhado</h3>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Benefícios (Frase de Destaque)</label>
                        <textarea
                            rows={2}
                            value={formData.benefits}
                            onChange={e => setFormData({ ...formData, benefits: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">História</label>
                        <textarea
                            rows={3}
                            value={formData.history}
                            onChange={e => setFormData({ ...formData, history: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Composição</label>
                        <textarea
                            rows={3}
                            value={formData.composition}
                            onChange={e => setFormData({ ...formData, composition: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-neutral-400">Requisito de Segurança (Opcional)</label>
                        <input
                            value={formData.safetyRequirement || ''}
                            onChange={e => setFormData({ ...formData, safetyRequirement: e.target.value })}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                        />
                    </div>
                </div>
            </section>

            {/* Images */}
            <section className="bg-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-700 pb-2 mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><ImageIcon size={20} /> Imagens</h3>
                    <button type="button" onClick={addImage} className="text-emerald-500 hover:text-emerald-400 text-sm font-bold flex items-center gap-1">
                        <Plus size={16} /> Adicionar URL
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.images.map((img, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                placeholder="URL da Imagem (Unsplash, etc)"
                                value={img}
                                onChange={e => handleImageChange(idx, e.target.value)}
                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                            />
                            <button type="button" onClick={() => removeImage(idx)} className="p-3 text-neutral-500 hover:text-red-500">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Labels */}
            <section className="bg-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-700 pb-2 mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Tag size={20} /> Etiquetas Técnicas</h3>
                    <button type="button" onClick={addLabel} className="text-emerald-500 hover:text-emerald-400 text-sm font-bold flex items-center gap-1">
                        <Plus size={16} /> Nova Etiqueta
                    </button>
                </div>
                <div className="space-y-3">
                    {formData.labels.map((label, idx) => (
                        <div key={idx} className="flex gap-2">
                            <input
                                placeholder="Chave (ex: Grau)"
                                value={label.key}
                                onChange={e => handleLabelChange(idx, 'key', e.target.value)}
                                className="w-1/3 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                            />
                            <input
                                placeholder="Valor (ex: 1º Grau)"
                                value={label.value}
                                onChange={e => handleLabelChange(idx, 'value', e.target.value)}
                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                            />
                            <button type="button" onClick={() => removeLabel(idx)} className="p-3 text-neutral-500 hover:text-red-500">
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Audio Slots */}
            <section className="bg-neutral-800 p-6 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-700 pb-2 mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Music size={20} /> Áudios / Podcasts</h3>
                    <button type="button" onClick={addAudio} className="text-emerald-500 hover:text-emerald-400 text-sm font-bold flex items-center gap-1">
                        <Plus size={16} /> Novo Áudio
                    </button>
                </div>
                <div className="space-y-4">
                    {formData.audioSlots.map((audio, idx) => (
                        <div key={idx} className="bg-neutral-900 p-4 rounded-xl border border-neutral-700 flex flex-col gap-3 relative">
                            <button type="button" onClick={() => removeAudio(idx)} className="absolute top-2 right-2 text-neutral-600 hover:text-red-500 p-2">
                                <Trash2 size={16} />
                            </button>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-neutral-500 uppercase font-bold">Título</label>
                                    <input
                                        value={audio.title}
                                        onChange={e => handleAudioChange(idx, 'title', e.target.value)}
                                        className="w-full bg-neutral-800 border-none rounded p-2 text-white text-sm"
                                    />
                                </div>
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs text-neutral-500 uppercase font-bold">Autor</label>
                                    <input
                                        value={audio.author}
                                        onChange={e => handleAudioChange(idx, 'author', e.target.value)}
                                        className="w-full bg-neutral-800 border-none rounded p-2 text-white text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                    {formData.audioSlots.length === 0 && <p className="text-neutral-500 text-sm italic">Nenhum áudio cadastrado.</p>}
                </div>
            </section>

        </form>
    );
};

export default ProductForm;
