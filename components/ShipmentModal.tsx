import React, { useState, useRef } from 'react';
import { useProducts } from '../context/ProductContext';
import { motion } from 'framer-motion';
import { X, Check, Loader2, Camera, Package, AlertCircle, Calendar, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ShipmentModalProps {
    onClose: () => void;
}

const ShipmentModal: React.FC<ShipmentModalProps> = ({ onClose }) => {
    const { products, createShipment } = useProducts();
    const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
    const [loading, setLoading] = useState(false);

    // Selection State
    const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

    // Details State
    const [arrivalDate, setArrivalDate] = useState('');
    const [description, setDescription] = useState('');

    // Files State
    const [voucherFile, setVoucherFile] = useState<File | null>(null);
    const [packageFile, setPackageFile] = useState<File | null>(null);

    const voucherInputRef = useRef<HTMLInputElement>(null);
    const packageInputRef = useRef<HTMLInputElement>(null);

    // Helpers
    const productsInStock = products.filter(p => (p.stock_quantity || 0) > 0);
    const totalItems = Object.values(selectedItems).reduce((a: number, b: number) => a + b, 0);

    const handleQuantityChange = (productId: string, delta: number) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const currentQty = selectedItems[productId] || 0;
        const newQty = Math.max(0, Math.min((product.stock_quantity || 0), currentQty + delta));

        if (newQty === 0) {
            const { [productId]: _, ...rest } = selectedItems;
            setSelectedItems(rest);
        } else {
            setSelectedItems({ ...selectedItems, [productId]: newQty });
        }
    };

    const handleSubmit = async () => {
        if (!voucherFile || !packageFile || !arrivalDate || totalItems === 0) return;

        setLoading(true);
        try {
            // Upload Files
            const voucherName = `vouchers/${Date.now()}_${voucherFile.name}`;
            const pkgName = `packages/${Date.now()}_${packageFile.name}`;

            const [voucherRes, pkgRes] = await Promise.all([
                supabase.storage.from('production-evidence').upload(voucherName, voucherFile),
                supabase.storage.from('production-evidence').upload(pkgName, packageFile)
            ]);

            if (voucherRes.error) throw voucherRes.error;
            if (pkgRes.error) throw pkgRes.error;

            const voucherUrl = supabase.storage.from('production-evidence').getPublicUrl(voucherName).data.publicUrl;
            const packageUrl = supabase.storage.from('production-evidence').getPublicUrl(pkgName).data.publicUrl;

            // Create Shipment Payload
            const items = Object.entries(selectedItems).map(([id, qty]) => ({
                product_id: id,
                quantity: qty
            }));

            await createShipment(
                {
                    description,
                    expectedArrivalDate: arrivalDate,
                    voucherUrl,
                    packageUrl
                },
                items
            );

            onClose();
        } catch (error) {
            console.error('Error submitting shipment:', error);
            alert('Erro ao enviar. Verifique sua conexão e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-black flex flex-col p-4 md:p-6"
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-white text-2xl font-bold flex items-center gap-3">
                    <Package className="text-emerald-400" />
                    Novo Envio
                </h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full text-white">
                    <X size={24} />
                </button>
            </div>

            {/* Stepper Content */}
            <div className="flex-1 overflow-y-auto mb-6">

                {/* STEP 1: PRODUCT SELECTION */}
                {step === 'select' && (
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3 text-emerald-200 mb-2">
                            <AlertCircle size={20} />
                            <span>Selecione os produtos para adicionar ao pacote.</span>
                        </div>

                        {productsInStock.map(product => {
                            const qty = selectedItems[product.id] || 0;
                            const isSelected = qty > 0;

                            return (
                                <div
                                    key={product.id}
                                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isSelected ? 'bg-emerald-900/30 border border-emerald-500/50' : 'bg-white/5 border border-white/10'}`}
                                >
                                    <img src={product.images[0]} className="w-16 h-16 rounded-lg object-cover bg-black/40" alt={product.name} />

                                    <div className="flex-1">
                                        <h3 className="text-white font-bold">{product.name}</h3>
                                        <p className="text-white/40 text-sm">Estoque: {product.stock_quantity}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        {isSelected && (
                                            <button
                                                onClick={() => handleQuantityChange(product.id, -1)}
                                                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95"
                                            >-</button>
                                        )}

                                        {isSelected ? (
                                            <span className="text-2xl font-bold text-white min-w-[30px] text-center">{qty}</span>
                                        ) : (
                                            <button
                                                onClick={() => handleQuantityChange(product.id, 1)}
                                                className="px-4 py-2 rounded-lg bg-white/10 text-white font-medium text-sm"
                                            >
                                                Adicionar
                                            </button>
                                        )}

                                        {isSelected && (
                                            <button
                                                onClick={() => handleQuantityChange(product.id, 1)}
                                                className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95"
                                            >+</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* STEP 2: DETAILS & PHOTOS */}
                {step === 'details' && (
                    <div className="space-y-6">

                        {/* Date & Desc */}
                        <div className="space-y-4">
                            <div className="bg-white/5 p-4 rounded-xl">
                                <label className="flex items-center gap-2 text-white/70 mb-2 text-sm font-medium">
                                    <Calendar size={16} /> Previsão de Chegada
                                </label>
                                <input
                                    type="date"
                                    value={arrivalDate}
                                    onChange={(e) => setArrivalDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full bg-transparent text-white text-xl outline-none"
                                />
                            </div>

                            <div className="bg-white/5 p-4 rounded-xl">
                                <label className="flex items-center gap-2 text-white/70 mb-2 text-sm font-medium">
                                    <FileText size={16} /> Observações (Opcional)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Enviado via Jadlog..."
                                    className="w-full bg-transparent text-white text-lg outline-none resize-none h-20"
                                />
                            </div>
                        </div>

                        {/* Photos Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Voucher Upload */}
                            <div
                                onClick={() => voucherInputRef.current?.click()}
                                className={`
                                    h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors relative overflow-hidden
                                    ${voucherFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40'}
                                `}
                            >
                                <input type="file" ref={voucherInputRef} accept="image/*" className="hidden" onChange={(e) => setVoucherFile(e.target.files?.[0] || null)} />
                                {voucherFile ? (
                                    <>
                                        <img src={URL.createObjectURL(voucherFile)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                        <Check className="text-emerald-400 z-10" size={32} />
                                        <span className="text-emerald-400 font-bold z-10 text-sm">Comprovante OK</span>
                                    </>
                                ) : (
                                    <>
                                        <FileText className="text-white/40" size={32} />
                                        <span className="text-white/40 text-sm text-center px-2">Foto do Comprovante</span>
                                    </>
                                )}
                            </div>

                            {/* Package Upload */}
                            <div
                                onClick={() => packageInputRef.current?.click()}
                                className={`
                                    h-40 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors relative overflow-hidden
                                    ${packageFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-white/20 hover:border-white/40'}
                                `}
                            >
                                <input type="file" ref={packageInputRef} accept="image/*" className="hidden" onChange={(e) => setPackageFile(e.target.files?.[0] || null)} />
                                {packageFile ? (
                                    <>
                                        <img src={URL.createObjectURL(packageFile)} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                        <Check className="text-emerald-400 z-10" size={32} />
                                        <span className="text-emerald-400 font-bold z-10 text-sm">Pacote OK</span>
                                    </>
                                ) : (
                                    <>
                                        <Package className="text-white/40" size={32} />
                                        <span className="text-white/40 text-sm text-center px-2">Foto do Pacote</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* STEP 3: CONFIRMATION */}
                {step === 'confirm' && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6">
                            <Check size={40} className="text-emerald-400" />
                        </div>
                        <h3 className="text-2xl text-white font-bold mb-2">Confirmar Envio?</h3>
                        <p className="text-white/60 mb-8 max-w-xs">
                            Você está enviando <b>{totalItems} itens</b>. Verifique se as fotos estão nítidas.
                        </p>

                        <div className="w-full bg-white/5 rounded-xl p-4 mb-4 text-left">
                            <h4 className="text-white/40 text-sm mb-2 uppercase tracking-wider">Resumo</h4>
                            {Object.entries(selectedItems).map(([id, qty]) => {
                                const prod = products.find(p => p.id === id);
                                return (
                                    <div key={id} className="flex justify-between text-white py-1">
                                        <span>{prod?.name}</span>
                                        <span className="font-bold">x{qty}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer / Actions */}
            <div className="mt-auto pt-4 border-t border-white/10 flex gap-4">
                {step === 'select' ? (
                    <button className="flex-1 py-4 bg-white/10 rounded-xl text-white font-bold" onClick={onClose}>Cancelar</button>
                ) : (
                    <button className="flex-1 py-4 bg-white/10 rounded-xl text-white font-bold" onClick={() => setStep(prev => prev === 'confirm' ? 'details' : 'select')}>Voltar</button>
                )}

                {step === 'select' && (
                    <button
                        disabled={totalItems === 0}
                        onClick={() => setStep('details')}
                        className="flex-1 py-4 bg-emerald-600 rounded-xl text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Continuar ({totalItems})
                    </button>
                )}

                {step === 'details' && (
                    <button
                        disabled={!voucherFile || !packageFile || !arrivalDate}
                        onClick={() => setStep('confirm')}
                        className="flex-1 py-4 bg-emerald-600 rounded-xl text-white font-bold disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        Revisar
                    </button>
                )}

                {step === 'confirm' && (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-400 rounded-xl text-black font-bold flex items-center justify-center gap-2 transition-colors"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <SendIcon />}
                        ENVIAR AGORA
                    </button>
                )}
            </div>
        </motion.div>
    );
};

const SendIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default ShipmentModal;
