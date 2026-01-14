import React, { useState, useRef } from 'react';
import { Product } from '../types';
import { useProducts } from '../context/ProductContext';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Droplet, Send, TriangleAlert, Camera, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface StockControlModalProps {
    product: Product;
    onClose: () => void;
}

const StockControlModal: React.FC<StockControlModalProps> = ({ product, onClose }) => {
    const { logProductionAction } = useProducts();
    const [mode, setMode] = useState<'main' | 'sending' | 'problem'>('main');
    const [loading, setLoading] = useState(false);

    // Sending State
    const [sendQuantity, setSendQuantity] = useState(1);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');

    // Problem State
    const [problemDescription, setProblemDescription] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleProduce = async () => {
        setLoading(true);
        // Default produce +1 for single tap interaction, or maybe we want a "Confirm" flow? 
        // User requested massive buttons. Single tap +1 might be too risky, but "Glanceable" and "Control Remote" implies speed.
        // Let's stick to the "Confirm" flow requested in the prompt: "Alternativa: Salvamento automático com 'Undo' (Desfazer) flutuante phor 3 segundos."
        // For now, let's just do atomic update immediately for "Produced".
        await logProductionAction(product.id, 'produced', 1);
        setLoading(false);
        // Visual feedback? handled by UI update
    };

    const handleSendSubmit = async () => {
        if (!imageFile) return alert('Por favor, adicione uma foto do envio.');
        setLoading(true);

        try {
            // Upload Image
            const filename = `shipments/${Date.now()}_${imageFile.name}`;
            const { data, error } = await supabase.storage.from('production-evidence').upload(filename, imageFile);

            if (error) throw error;

            const publicUrl = supabase.storage.from('production-evidence').getPublicUrl(filename).data.publicUrl;

            await logProductionAction(product.id, 'sent', sendQuantity, description, publicUrl);
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Erro ao enviar. Tente novamente.');
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
                    <img src={product.images[0]} className="w-16 h-16 rounded-lg object-cover border border-white/20" alt="Mini" />
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
                    <div className="flex flex-col items-center justify-center flex-1 w-full">
                        <div className="text-[120px] font-bold text-white leading-none tracking-tighter">
                            {product.stock_quantity || 0}
                        </div>
                        <div className="text-emerald-400 font-medium text-lg mt-2">
                            Meta Mensal: {product.monthly_production_goal || 0}
                        </div>
                    </div>

                    {/* Massive Buttons */}
                    <div className="w-full grid grid-cols-2 gap-4 h-64 mb-4">
                        {/* SEND BUTTON */}
                        <button
                            disabled={(product.stock_quantity || 0) <= 0}
                            onClick={() => setMode('sending')}
                            className="bg-orange-800/80 disabled:opacity-30 disabled:cursor-not-allowed rounded-3xl flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform"
                        >
                            <Send size={48} className="text-orange-200" />
                            <span className="text-orange-100 font-bold text-2xl">ENVIADO</span>
                        </button>

                        {/* PRODUCE BUTTON */}
                        <button
                            onClick={handleProduce}
                            disabled={loading}
                            className="bg-emerald-800/80 rounded-3xl flex flex-col items-center justify-center gap-4 active:scale-95 transition-transform relative overflow-hidden"
                        >
                            {loading && <div className="absolute inset-0 bg-black/20 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>}
                            <Droplet size={48} className="text-emerald-200" />
                            <span className="text-emerald-100 font-bold text-2xl">PRODUZI</span>
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

            {/* SENDING MODE */}
            {mode === 'sending' && (
                <div className="flex flex-col w-full h-full">
                    <h3 className="text-2xl text-white font-bold mb-6">Registrar Envio</h3>

                    <div className="flex-1 flex flex-col gap-6">
                        {/* Quantity Selector */}
                        <div className="bg-white/10 rounded-2xl p-6 flex flex-col items-center">
                            <span className="text-white/60 mb-2">Quantidade</span>
                            <div className="flex items-center gap-6">
                                <button onClick={() => setSendQuantity(Math.max(1, sendQuantity - 1))} className="w-12 h-12 rounded-full bg-white/20 text-white text-2xl">-</button>
                                <span className="text-4xl font-bold text-white">{sendQuantity}</span>
                                <button onClick={() => setSendQuantity(Math.min((product.stock_quantity || 0), sendQuantity + 1))} className="w-12 h-12 rounded-full bg-white/20 text-white text-2xl">+</button>
                            </div>
                        </div>

                        {/* Image Upload */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`
                                flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors
                                ${imageFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40'}
                            `}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                            />
                            {imageFile ? (
                                <>
                                    <img src={URL.createObjectURL(imageFile)} className="h-32 rounded-lg object-contain" alt="Preview" />
                                    <span className="text-emerald-400 font-medium">{imageFile.name}</span>
                                </>
                            ) : (
                                <>
                                    <Camera size={48} className="text-white/50" />
                                    <span className="text-white/50">Toque para adicionar foto</span>
                                </>
                            )}
                        </div>
                        </div>

                        {/* Description Input */}
                        <div className="bg-white/10 rounded-2xl p-4">
                            <label className="block text-white/60 text-sm mb-2">Observações / Descrição</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Detalhes sobre o envio..."
                                className="w-full bg-transparent text-white placeholder-white/30 outline-none resize-none h-20"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button onClick={() => setMode('main')} className="flex-1 py-4 rounded-xl bg-white/10 text-white font-bold">Voltar</button>
                        <button
                            onClick={handleSendSubmit}
                            disabled={loading || !imageFile}
                            className="flex-1 py-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : <Check />}
                            Confirmar Envio
                        </button>
                    </div>
                </div>
                </div >
            )}

{/* PROBLEM MODE */ }
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
