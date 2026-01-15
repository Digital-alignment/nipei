import React, { useState, useEffect } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { supabase } from '../../../lib/supabase';
import { Tool, ToolReport } from '../../../types';
import { Package, Wrench, AlertTriangle, Search, Filter, CheckCircle, Clock, Calendar } from 'lucide-react';

const ToolsManagement: React.FC = () => {
    const { tools, fetchTools, fetchToolReports } = useFinance();
    const [reports, setReports] = useState<(ToolReport & { tools: Tool, user_metadata: any })[]>([]);
    const [activeTab, setActiveTab] = useState<'inventory' | 'reports'>('inventory');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        await fetchTools();

        // Fetch detailed reports with relations
        const { data: reportsData } = await supabase
            .from('tool_reports')
            .select(`
                *,
                tools (*),
                profiles:user_id (
                    full_name
                )
            `)
            .order('created_at', { ascending: false });

        if (reportsData) {
            setReports(reportsData.map(r => ({
                ...r,
                user_metadata: (r as any).profiles // Map profile data
            })));
        }
        setIsLoading(false);
    };

    const resolveReport = async (reportId: string) => {
        try {
            await supabase
                .from('tool_reports')
                .update({ status: 'resolved' })
                .eq('id', reportId);

            // Optimistic update
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
        } catch (error) {
            console.error('Error resolving report', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Tabs */}
            <div className="flex gap-4 border-b border-white/5 pb-2">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'inventory' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    Inventário Geral
                </button>
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'reports' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    Reportes e Problemas ({reports.filter(r => r.status === 'pending').length})
                </button>
            </div>

            {activeTab === 'inventory' ? (
                // Inventory Table
                <div className="bg-neutral-900 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="bg-neutral-800 text-neutral-200 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4">Ferramenta</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Qtd</th>
                                <th className="p-4">Aquisição</th>
                                <th className="p-4">Utilidade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {tools.map(tool => (
                                <tr key={tool.id} className="hover:bg-neutral-800/50 transition-colors">
                                    <td className="p-4 font-medium text-white flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/10">
                                            {tool.photos && tool.photos[0] ? (
                                                <img src={tool.photos[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <Wrench size={14} />
                                            )}
                                        </div>
                                        {tool.name}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tool.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            tool.status === 'in_use' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                tool.status === 'maintenance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                                    tool.status === 'needed' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                        'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${tool.status === 'available' ? 'bg-emerald-400' :
                                                tool.status === 'in_use' ? 'bg-blue-400' :
                                                    tool.status === 'maintenance' ? 'bg-amber-400' :
                                                        tool.status === 'needed' ? 'bg-orange-400' : 'bg-red-400'
                                                }`} />
                                            {tool.status === 'available' ? 'Disponível' :
                                                tool.status === 'in_use' ? 'Em Uso' :
                                                    tool.status === 'maintenance' ? 'Manutenção' :
                                                        tool.status === 'needed' ? 'Precisando' : 'Perdido'}
                                        </span>
                                    </td>
                                    <td className="p-4">{tool.quantity}</td>
                                    <td className="p-4">{tool.acquisition_date || '-'}</td>
                                    <td className="p-4 max-w-xs truncate">{tool.usage_description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Reports List
                <div className="grid grid-cols-1 gap-4">
                    {reports.length === 0 && (
                        <div className="text-center py-12 text-neutral-500 italic">Nenhum reporte encontrado.</div>
                    )}
                    {reports.map(report => (
                        <div key={report.id} className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 ${report.status === 'resolved'
                            ? 'bg-neutral-900/30 border-white/5 opacity-60'
                            : 'bg-neutral-900 border-white/10'
                            }`}>
                            {/* Priority Indicator */}
                            <div className={`w-1.5 self-stretch rounded-full ${report.priority === 'high' ? 'bg-red-500' :
                                report.priority === 'medium' ? 'bg-amber-500' : 'bg-emerald-500' // green for low
                                }`} />

                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-white font-bold flex items-center gap-2">
                                        <Wrench size={16} className="text-neutral-500" />
                                        {report.tools?.name || 'Ferramenta Desconhecida'}
                                        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${report.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                            report.priority === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                                                'bg-emerald-500/20 text-emerald-400'
                                            }`}>
                                            {report.priority === 'high' ? 'Urgente' : report.priority === 'medium' ? 'Atenção' : 'Normal'}
                                        </span>
                                    </h4>
                                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(report.created_at || '').toLocaleDateString('pt-BR')}
                                    </span>
                                </div>

                                <p className="text-sm text-neutral-300 bg-black/20 p-3 rounded-lg border border-white/5">
                                    "{report.description}"
                                </p>

                                <div className="flex items-center gap-2 text-xs text-neutral-500">
                                    <span>Reportado por: <span className="text-white font-medium">{report.user_metadata?.full_name || 'Usuário'}</span></span>
                                </div>

                                {/* Report Photos */}
                                {report.photos && report.photos.length > 0 && (
                                    <div className="flex gap-2 mt-2">
                                        {report.photos.map((photo, idx) => (
                                            <a key={idx} href={photo} target="_blank" rel="noopener noreferrer" className="block w-16 h-16 rounded-lg overflow-hidden border border-white/10 hover:border-emerald-500 transition-colors">
                                                <img src={photo} alt={`Report ${idx}`} className="w-full h-full object-cover" />
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col justify-center gap-2 min-w-[120px]">
                                {report.status === 'pending' ? (
                                    <button
                                        onClick={() => resolveReport(report.id)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <CheckCircle size={14} /> Resolver
                                    </button>
                                ) : (
                                    <span className="text-emerald-500 text-xs font-bold flex items-center justify-center gap-1">
                                        <CheckCircle size={14} /> Resolvido
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ToolsManagement;
