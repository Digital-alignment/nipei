import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, Droplet, TriangleAlert, Calendar, CheckCircle, Check } from 'lucide-react';

interface ProductionLog {
    id: string;
    created_at: string;
    action_type: 'produced' | 'sent' | 'problem';
    quantity: number;
    description?: string;
    image_url?: string;
    product_name: string;
    read_at?: string | null;
}

interface ProductionLogListProps {
    variant?: 'default' | 'dashboard';
    adminMode?: boolean;
    onStatsUpdate?: () => void;
}

const ProductionLogList: React.FC<ProductionLogListProps> = ({ variant = 'default', adminMode = false, onStatsUpdate }) => {
    const [logs, setLogs] = useState<ProductionLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('production_logs')
                .select(`
                    id,
                    created_at,
                    action_type,
                    quantity,
                    description,
                    image_url,
                    read_at,
                    products (name)
                `)
                .order('created_at', { ascending: false })
                .limit(adminMode ? 50 : 20); // Fetch more for admin to see unread logs

            if (error) throw error;

            const formattedLogs: ProductionLog[] = (data || []).map((item: any) => ({
                id: item.id,
                created_at: item.created_at,
                action_type: item.action_type,
                quantity: item.quantity,
                description: item.description,
                image_url: item.image_url,
                read_at: item.read_at,
                product_name: item.products?.name || 'Produto Desconhecido'
            }));

            setLogs(formattedLogs);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (logId: string) => {
        try {
            // Optimistic update
            setLogs(prev => prev.map(log =>
                log.id === logId ? { ...log, read_at: new Date().toISOString() } : log
            ));

            const { error } = await supabase
                .from('production_logs')
                .update({ read_at: new Date().toISOString() })
                .eq('id', logId);

            if (error) throw error;
            if (onStatsUpdate) onStatsUpdate();

        } catch (error) {
            console.error('Error marking as read:', error);
            // Revert on error
            fetchLogs();
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadIds = logs.filter(l => !l.read_at).map(l => l.id);
            if (unreadIds.length === 0) return;

            // Optimistic update
            setLogs(prev => prev.map(log => ({ ...log, read_at: new Date().toISOString() })));

            const { error } = await supabase
                .from('production_logs')
                .update({ read_at: new Date().toISOString() })
                .in('id', unreadIds);

            if (error) throw error;
            if (onStatsUpdate) onStatsUpdate();

        } catch (error) {
            console.error('Error marking all as read:', error);
            fetchLogs();
        }
    }

    useEffect(() => {
        fetchLogs();

        const subscription = supabase
            .channel('production_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, () => {
                fetchLogs();
                if (onStatsUpdate) onStatsUpdate();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div className="text-center text-white/50 py-10">Carregando histórico...</div>;

    const getIcon = (type: string) => {
        switch (type) {
            case 'produced': return <Droplet className={`text-emerald-400`} size={20} />;
            case 'sent': return <Package className={`text-orange-400`} size={20} />;
            case 'problem': return <TriangleAlert className={`text-red-400`} size={20} />;
            default: return <Calendar className="text-white/50" size={20} />;
        }
    };

    const containerClasses = variant === 'dashboard'
        ? "w-full"
        : "w-full max-w-4xl mx-auto mt-12 mb-20";

    const titleClasses = variant === 'dashboard'
        ? "text-lg font-bold text-white mb-4 flex justify-between items-center"
        : "text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4";

    const unreadCount = logs.filter(l => !l.read_at).length;

    return (
        <div className={containerClasses}>
            <div className={titleClasses}>
                <span>Histórico Recente</span>
                {adminMode && unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                    >
                        <CheckCircle size={14} /> Marcar tudo como lido
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {logs.map((log) => {
                    const isUnread = adminMode && !log.read_at;
                    return (
                        <div key={log.id} className={`bg-white/5 border rounded-2xl p-4 flex items-start gap-4 transition-all ${isUnread ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-white/5 hover:bg-white/10'}`}>
                            <div className={`p-3 rounded-full bg-white/5 ${log.action_type === 'problem' ? 'bg-red-500/10' : ''}`}>
                                {getIcon(log.action_type)}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className={`text-white font-bold ${isUnread ? 'text-emerald-100' : ''}`}>
                                            {log.product_name}
                                            {isUnread && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                                        </h3>
                                        <p className="text-sm text-white/50 capitalize">
                                            {log.action_type === 'produced' && 'Produção Registrada'}
                                            {log.action_type === 'sent' && 'Envio Realizado'}
                                            {log.action_type === 'problem' && 'Problema Reportado'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-white/30">
                                            {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                        {adminMode && !log.read_at && (
                                            <button
                                                onClick={() => handleMarkAsRead(log.id)}
                                                className="p-1.5 rounded-full hover:bg-emerald-500/20 text-white/30 hover:text-emerald-500 transition-colors"
                                                title="Marcar como lido"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {log.quantity > 0 && (
                                    <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-white/10 text-white text-sm font-medium">
                                        Quantidade: {log.quantity}
                                    </div>
                                )}

                                {log.description && (
                                    <p className="mt-2 text-white/70 text-sm bg-black/20 p-3 rounded-lg border-l-2 border-white/20">
                                        "{log.description}"
                                    </p>
                                )}

                                {log.image_url && (
                                    <div className="mt-3">
                                        <img
                                            src={log.image_url}
                                            alt="Evidência"
                                            className="h-24 rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                                            onClick={() => window.open(log.image_url, '_blank')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {logs.length === 0 && (
                    <div className="text-center text-white/30 py-8">
                        Nenhuma atividade registrada ainda.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionLogList;
