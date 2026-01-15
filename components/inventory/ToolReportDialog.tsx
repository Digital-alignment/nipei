import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { X, Camera, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tool } from '../../types';

interface ToolReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool | null;
}

const ToolReportDialog: React.FC<ToolReportModalProps> = ({ isOpen, onClose, tool }) => {
    const { addToolReport } = useFinance();
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [loading, setLoading] = useState(false);
    const [photos, setPhotos] = useState<string[]>([]);

    if (!isOpen || !tool) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            await addToolReport({
                tool_id: tool.id,
                user_id: user.id,
                description,
                priority,
                status: 'pending',
                photos
            });
            alert('Relatório enviado!');
            setDescription('');
            setPhotos([]);
            onClose();
        } catch (error) {
            console.error(error);
            alert('Erro ao enviar relatório');
        } finally {
            setLoading(false);
        }
    };

    const addPhotoUrl = () => {
        if (photos.length < 3) {
            setPhotos([...photos, '']);
        }
    };

    const updatePhotoUrl = (index: number, url: string) => {
        const updatedPhotos = [...photos];
        updatedPhotos[index] = url;
        setPhotos(updatedPhotos);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-800 overflow-hidden animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-neutral-900 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-white">Reportar / Anotar</h2>
                        <p className="text-neutral-400 text-sm">{tool.name}</p>
                    </div>
                    <button onClick={onClose} className="text-neutral-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Priority Selector */}
                    <div className="flex gap-2 bg-neutral-800 p-1 rounded-xl">
                        {(['low', 'medium', 'high'] as const).map(p => (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPriority(p)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${priority === p
                                    ? (p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white')
                                    : 'text-neutral-400 hover:bg-neutral-700'
                                    }`}
                            >
                                {p === 'low' ? 'Normal' : p === 'medium' ? 'Atenção' : 'Urgente'}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs text-neutral-400 uppercase font-bold mb-2 block">O que aconteceu?</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                            placeholder="Descreva a condição da ferramenta, manutenção necessária ou observação..."
                            className="w-full bg-neutral-800 border-none rounded-xl p-4 text-white h-32 resize-none placeholder-neutral-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    {/* Photo Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-neutral-400 uppercase font-bold">Fotos (URL)</label>
                            <button
                                type="button"
                                onClick={addPhotoUrl}
                                disabled={photos.length >= 3}
                                className="text-emerald-500 text-xs font-bold disabled:opacity-50"
                            >
                                + Adicionar (Max 3)
                            </button>
                        </div>
                        {photos.map((photo, idx) => (
                            <input
                                key={idx}
                                placeholder="https://..."
                                className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white text-sm focus:ring-1 focus:ring-emerald-500"
                                value={photo}
                                onChange={e => updatePhotoUrl(idx, e.target.value)}
                            />
                        ))}
                        {photos.length === 0 && (
                            <button
                                type="button"
                                onClick={addPhotoUrl}
                                className="w-full bg-neutral-800 text-neutral-400 border-2 border-dashed border-neutral-700 p-4 rounded-xl flex flex-col items-center gap-2 hover:border-neutral-500 hover:text-white transition-colors"
                            >
                                <Camera size={24} />
                                <span className="text-xs font-bold uppercase">Adicionar Foto</span>
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Enviando...' : (
                            <>
                                <CheckCircle size={20} />
                                Enviar Relatório
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ToolReportDialog;
