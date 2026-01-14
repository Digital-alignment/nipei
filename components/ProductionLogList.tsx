import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, Droplet, TriangleAlert, Calendar, CheckCircle, Check, ArrowRight } from 'lucide-react';

interface ProductionLog {
    type: 'log';
    id: string;
    created_at: string;
    action_type: 'produced' | 'sent' | 'problem';
    quantity: number;
    description?: string;
    image_url?: string;
    product_name: string;
    read_at?: string | null;
}

interface ShipmentLog {
    type: 'shipment';
    id: string;
    created_at: string;
    status: 'pending' | 'received';
    description?: string;
    item_count: number;
    total_quantity: number;
}

type TimelineItem = ProductionLog | ShipmentLog;

interface ProductionLogListProps {
    variant?: 'default' | 'dashboard';
    adminMode?: boolean;
    onStatsUpdate?: () => void;
}

const ProductionLogList: React.FC<ProductionLogListProps> = ({ variant = 'default', adminMode = false, onStatsUpdate }) => {
    const [items, setItems] = useState<TimelineItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            // 1. Fetch Production Logs
            const { data: logsData, error: logsError } = await supabase
                .from('production_logs')
                .select(`
                    id, created_at, action_type, quantity, description, image_url, read_at,
                    products (name)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (logsError) throw logsError;

            // 2. Fetch Shipments
            const { data: shipmentsData, error: shipmentsError } = await supabase
                .from('shipments')
                .select(`
                     id, created_at, status, description,
                     shipment_items (id, quantity)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (shipmentsError) throw shipmentsError;

            // 3. Format Logs
            const formattedLogs: ProductionLog[] = (logsData || []).map((item: any) => ({
                type: 'log',
                id: item.id,
                created_at: item.created_at,
                action_type: item.action_type,
                quantity: item.quantity,
                description: item.description,
                image_url: item.image_url,
                read_at: item.read_at,
                product_name: item.products?.name || 'Produto Desconhecido'
            }));

            // 4. Format Shipments
            const formattedShipments: ShipmentLog[] = (shipmentsData || []).map((item: any) => ({
                type: 'shipment',
                id: item.id,
                created_at: item.created_at,
                status: item.status,
                description: item.description,
                item_count: item.shipment_items?.length || 0,
                total_quantity: item.shipment_items?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0
            }));

            // 5. Merge and Sort
            const merged = [...formattedLogs, ...formattedShipments].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            setItems(merged);

        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (logId: string) => {
        try {
            // Optimistic update
            setItems(prev => prev.map(item =>
                item.type === 'log' && item.id === logId ? { ...item, read_at: new Date().toISOString() } : item
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
            fetchData();
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const unreadIds = items
                .filter(item => item.type === 'log' && !item.read_at)
                .map(item => item.id);

            if (unreadIds.length === 0) return;

            // Optimistic update
            setItems(prev => prev.map(item => item.type === 'log' ? { ...item, read_at: new Date().toISOString() } : item));

            const { error } = await supabase
                .from('production_logs')
                .update({ read_at: new Date().toISOString() })
                .in('id', unreadIds);

            if (error) throw error;
            if (onStatsUpdate) onStatsUpdate();

        } catch (error) {
            console.error('Error marking all as read:', error);
            fetchData();
        }
    }

    useEffect(() => {
        fetchData();

        const subLogs = supabase
            .channel('production_logs_feed')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, () => fetchData())
            .subscribe();

        const subShipments = supabase
            .channel('shipments_feed')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => fetchData())
            .subscribe();

        return () => {
            subLogs.unsubscribe();
            subShipments.unsubscribe();
        };
    }, []);

    if (loading) return <div className="text-center text-white/50 py-10">Carregando histórico...</div>;

    const getIcon = (item: TimelineItem) => {
        if (item.type === 'shipment') return <Package className="text-blue-400" size={20} />;

        switch (item.action_type) {
            case 'produced': return <Droplet className={`text-emerald-400`} size={20} />;
            case 'sent': return <Package className={`text-orange-400`} size={20} />; // Legacy logs
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

    const unreadCount = items.filter(i => i.type === 'log' && !i.read_at).length;

    return (
        <div className={containerClasses}>
            <div className={titleClasses}>
                <span>Histórico de Atividades</span>
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
                {items.map((item) => {
                    const isLog = item.type === 'log';
                    const isUnread = adminMode && isLog && !(item as ProductionLog).read_at;

                    return (
                        <div key={item.id} className={`bg-white/5 border rounded-2xl p-4 flex items-start gap-4 transition-all ${isUnread ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-white/5 hover:bg-white/10'}`}>
                            <div className={`p-3 rounded-full bg-white/5 ${isLog && (item as ProductionLog).action_type === 'problem' ? 'bg-red-500/10' : ''}`}>
                                {getIcon(item)}
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        {item.type === 'shipment' ? (
                                            <>
                                                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                    Envio #{item.id.slice(0, 8)}
                                                    {item.status === 'received' && <CheckCircle size={16} className="text-emerald-400" />}
                                                </h3>
                                                <p className="text-sm text-white/50">
                                                    Pacote com {item.item_count} itens ({item.total_quantity} un.)
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <h3 className={`text-white font-bold ${isUnread ? 'text-emerald-100' : ''}`}>
                                                    {(item as ProductionLog).product_name}
                                                    {isUnread && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                                                </h3>
                                                <p className="text-sm text-white/50 capitalize">
                                                    {(item as ProductionLog).action_type === 'produced' && 'Produção Registrada'}
                                                    {(item as ProductionLog).action_type === 'sent' && 'Envio Unitário'}
                                                    {(item as ProductionLog).action_type === 'problem' && 'Problema Reportado'}
                                                </p>
                                            </>

                                        )}
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-white/30">
                                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ptBR })}
                                        </span>
                                        {adminMode && isLog && !(item as ProductionLog).read_at && (
                                            <button
                                                onClick={() => handleMarkAsRead(item.id)}
                                                className="p-1.5 rounded-full hover:bg-emerald-500/20 text-white/30 hover:text-emerald-500 transition-colors"
                                                title="Marcar como lido"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Shipment Details Badge */}
                                {item.type === 'shipment' && (
                                    <div className="mt-3 flex gap-2">
                                        <div className={`text-xs px-2 py-1 rounded border capitalize ${item.status === 'received' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                            {item.status === 'received' ? 'Recebido' : 'Enviado'}
                                        </div>
                                    </div>
                                )}

                                {/* Log Quantity */}
                                {isLog && (item as ProductionLog).quantity > 0 && (
                                    <div className="mt-2 inline-block px-3 py-1 rounded-lg bg-white/10 text-white text-sm font-medium">
                                        Quantidade: {(item as ProductionLog).quantity}
                                    </div>
                                )}

                                {item.description && (
                                    <p className="mt-2 text-white/70 text-sm bg-black/20 p-3 rounded-lg border-l-2 border-white/20">
                                        "{item.description}"
                                    </p>
                                )}

                                {isLog && (item as ProductionLog).image_url && (
                                    <div className="mt-3">
                                        <img
                                            src={(item as ProductionLog).image_url}
                                            alt="Evidência"
                                            className="h-24 rounded-lg border border-white/10 hover:scale-105 transition-transform cursor-pointer"
                                            onClick={() => window.open((item as ProductionLog).image_url, '_blank')}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div className="text-center text-white/30 py-8">
                        Nenhuma atividade registrada ainda.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionLogList;
