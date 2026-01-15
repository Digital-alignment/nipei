import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { Package, Plus, Edit2, Wrench, Calendar, Search, Filter, AlertTriangle } from 'lucide-react';
import { Tool } from '../../types';
import ToolReportModal from './ToolReportDialog';


const ToolTracker: React.FC = () => {
    const { tools, toolReports, addTool, updateTool, loading } = useFinance();
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Add/Edit Tool State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [formData, setFormData] = useState<Partial<Tool>>({
        name: '',
        description: '',
        usage_description: '',
        quantity: 1,
        acquisition_date: '',
        status: 'available',
        photos: []
    });

    // Report State
    const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const filteredTools = tools.filter(tool => {
        const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || tool.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleOpenAdd = () => {
        setEditingTool(null);
        setFormData({
            name: '',
            description: '',
            usage_description: '',
            quantity: 1,
            acquisition_date: '',
            status: 'available',
            photos: []
        });
        setIsFormOpen(true);
    };

    const handleOpenEdit = (tool: Tool, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent opening report modal
        setEditingTool(tool);
        setFormData({ ...tool });
        setIsFormOpen(true);
    };

    const handleSaveTool = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTool) {
                await updateTool(editingTool.id, {
                    name: formData.name,
                    description: formData.description,
                    usage_description: formData.usage_description,
                    quantity: formData.quantity,
                    acquisition_date: formData.acquisition_date,
                    status: formData.status as any,
                    photos: formData.photos
                });
            } else {
                await addTool({
                    name: formData.name!,
                    description: formData.description,
                    usage_description: formData.usage_description,
                    quantity: formData.quantity || 1,
                    acquisition_date: formData.acquisition_date || 'Não se tem data',
                    status: formData.status as any,
                    photos: formData.photos || []
                });
            }
            setIsFormOpen(false);
        } catch (error) {
            alert('Erro ao salvar ferramenta');
        }
    };

    const addPhotoUrl = () => {
        if ((formData.photos?.length || 0) < 3) {
            setFormData({ ...formData, photos: [...(formData.photos || []), ''] });
        }
    };

    const updatePhotoUrl = (index: number, url: string) => {
        const updatedPhotos = [...(formData.photos || [])];
        updatedPhotos[index] = url;
        setFormData({ ...formData, photos: updatedPhotos });
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header / Actions */}
            <div className="flex flex-col gap-4">
                <div className="flex gap-2">
                    <div className="flex-1 bg-neutral-800 rounded-xl flex items-center px-4 border border-neutral-700">
                        <Search size={18} className="text-neutral-500" />
                        <input
                            type="text"
                            placeholder="Buscar ferramenta..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-transparent border-none p-3 text-white focus:outline-none placeholder-neutral-500"
                        />
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-emerald-900/20"
                    >
                        <Plus size={24} />
                    </button>
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'available', label: 'Disponível' },
                        { id: 'in_use', label: 'Em Uso' },
                        { id: 'maintenance', label: 'Manutenção' },
                        { id: 'needed', label: 'Precisando' },
                        { id: 'lost', label: 'Perdido' }
                    ].map(status => (
                        <button
                            key={status.id}
                            onClick={() => setFilterStatus(status.id)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors border ${filterStatus === status.id
                                ? 'bg-neutral-100 text-neutral-900 border-neutral-100'
                                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-500'
                                }`}
                        >
                            {status.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid - Small Cards */}
            <div className="grid grid-cols-2 gap-3">
                {filteredTools.map(tool => (
                    <div
                        key={tool.id}
                        onClick={() => {
                            setSelectedTool(tool);
                            setIsReportOpen(true);
                        }}
                        className="bg-neutral-900/50 border border-white/5 rounded-xl p-3 active:scale-[0.98] transition-all relative overflow-hidden group hover:bg-neutral-800/80 cursor-pointer flex flex-col h-full"
                    >
                        <button
                            onClick={(e) => handleOpenEdit(tool, e)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Edit2 size={12} />
                        </button>

                        <div className={`absolute top-0 right-0 w-2 h-2 rounded-full m-2 ${tool.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                            tool.status === 'in_use' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                                tool.status === 'maintenance' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                    tool.status === 'needed' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                                        'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                            }`} />

                        <div className="flex items-start gap-3 mb-2">
                            {/* Photo or Icon */}
                            <div className="w-12 h-12 bg-neutral-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden border border-white/5">
                                {tool.photos && tool.photos[0] ? (
                                    <img src={tool.photos[0]} alt={tool.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Wrench size={20} className="text-neutral-500" />
                                )}
                            </div>
                            <div className="min-w-0 pr-4">
                                <h3 className="text-white font-bold text-sm truncate leading-tight mb-0.5">{tool.name}</h3>
                                <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                                    <Package size={10} />
                                    <span>{tool.quantity} unid.</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto space-y-1">
                            <p className="text-[10px] text-neutral-500 line-clamp-2 leading-relaxed">
                                {tool.usage_description || tool.description || 'Sem descrição'}
                            </p>

                            <div className="flex items-center justify-between pt-1">
                                {tool.acquisition_date ? (
                                    <div className="flex items-center gap-1 text-[9px] text-neutral-600">
                                        <Calendar size={9} />
                                        <span>{tool.acquisition_date}</span>
                                    </div>
                                ) : <div />}

                                {/* Active Report Indicators */}
                                {(() => {
                                    const activeReports = toolReports?.filter(r => r.tool_id === tool.id && r.status === 'pending');
                                    if (!activeReports || activeReports.length === 0) return null;

                                    return (
                                        <div className="flex gap-1" title={`${activeReports.length} reporte(s) enviados`}>
                                            {activeReports.map((report, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-2 h-2 rounded-full border border-neutral-900 ${report.priority === 'high' ? 'bg-red-500' :
                                                        report.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4">
                    <div className="bg-neutral-900 w-full max-w-md rounded-3xl border border-neutral-800 p-6 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-white mb-6">{editingTool ? 'Editar Ferramenta' : 'Nova Ferramenta'}</h2>
                        <form onSubmit={handleSaveTool} className="space-y-4">
                            <div>
                                <label className="text-xs text-neutral-400 uppercase font-bold">Nome</label>
                                <input
                                    className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 focus:ring-1 focus:ring-emerald-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase font-bold">Quantidade</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 focus:ring-1 focus:ring-emerald-500"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-neutral-400 uppercase font-bold">Data de Aquisição</label>
                                    <input
                                        type="date"
                                        className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 focus:ring-1 focus:ring-emerald-500 text-sm"
                                        value={formData.acquisition_date}
                                        onChange={e => setFormData({ ...formData, acquisition_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Status Select */}
                            <div>
                                <label className="text-xs text-neutral-400 uppercase font-bold">Status Atual</label>
                                <select
                                    className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 focus:ring-1 focus:ring-emerald-500"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option value="available">🟢 Disponível</option>
                                    <option value="in_use">🔵 Em Uso</option>
                                    <option value="maintenance">🟡 Manutenção</option>
                                    <option value="needed">🟠 Precisando (Reposição/Novo)</option>
                                    <option value="lost">🔴 Perdido</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs text-neutral-400 uppercase font-bold">Utilidade</label>
                                <textarea
                                    placeholder="Para que serve?"
                                    className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 h-20 focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                                    value={formData.usage_description || ''}
                                    onChange={e => setFormData({ ...formData, usage_description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-neutral-400 uppercase font-bold">Descrição / Detalhes</label>
                                <textarea
                                    className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white mt-1 h-20 focus:ring-1 focus:ring-emerald-500 placeholder-neutral-600"
                                    value={formData.description || ''}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            {/* Photos */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-neutral-400 uppercase font-bold">Fotos (URL)</label>
                                    <button
                                        type="button"
                                        onClick={addPhotoUrl}
                                        disabled={(formData.photos?.length || 0) >= 3}
                                        className="text-emerald-500 text-xs font-bold disabled:opacity-50"
                                    >
                                        + Adicionar (Max 3)
                                    </button>
                                </div>
                                {formData.photos?.map((photo, idx) => (
                                    <input
                                        key={idx}
                                        placeholder="https://..."
                                        className="w-full bg-neutral-800 border-none rounded-xl p-3 text-white text-sm"
                                        value={photo}
                                        onChange={e => updatePhotoUrl(idx, e.target.value)}
                                    />
                                ))}
                                {(!formData.photos || formData.photos.length === 0) && (
                                    <button
                                        type="button"
                                        onClick={addPhotoUrl}
                                        className="w-full py-3 bg-neutral-800 border border-dashed border-neutral-700 rounded-xl text-neutral-500 text-sm hover:text-white transition-colors"
                                    >
                                        Adicionar Foto
                                    </button>
                                )}
                            </div>


                            <div className="flex gap-3 pt-4 sticky bottom-0 bg-neutral-900 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 bg-neutral-800 text-white py-3 rounded-xl font-bold hover:bg-neutral-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-500"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            <ToolReportModal
                isOpen={isReportOpen}
                onClose={() => {
                    setIsReportOpen(false);
                    setSelectedTool(null);
                }}
                tool={selectedTool}
            />
        </div>
    );
};

export default ToolTracker;
