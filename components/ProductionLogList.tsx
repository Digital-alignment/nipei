import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Package, Droplet, TriangleAlert, Calendar } from 'lucide-react';

interface ProductionLog {
    id: string;
    created_at: string;
    action_type: 'produced' | 'sent' | 'problem';
    quantity: number;
    description?: string;
    image_url?: string;
    product_name: string; // Joined from products
}

const ProductionLogList: React.FC = () => {
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
                    products (name)
                `)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;

            const formattedLogs: ProductionLog[] = (data || []).map((item: any) => ({
                id: item.id,
                created_at: item.created_at,
                action_type: item.action_type,
                quantity: item.quantity,
                description: item.description,
                image_url: item.image_url,
                product_name: item.products?.name || 'Produto Desconhecido'
            }));

            setLogs(formattedLogs);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();

        // Realtime subscription for updates
        const subscription = supabase
            .channel('production_logs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, () => {
                fetchLogs();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    if (loading) return <div className="text-center text-white/50 py-10">Carregando histórico...</div>;

    const getIcon = (type: string) => {
        switch (type) {
            case 'produced': return <Droplet className="text-emerald-400" size={20} />;
            case 'sent': return <Package className="text-orange-400" size={20} />;
            case 'problem': return <TriangleAlert className="text-red-400" size={20} />;
            default: return <Calendar className="text-white/50" size={20} />;
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto mt-12 mb-20">
            <h2 className="text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4">
                Histórico Recente
            </h2>

            <div className="space-y-4">
                {logs.map((log) => (
                    <div key={log.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-start gap-4 hover:bg-white/10 transition-colors">
                        <div className={`p-3 rounded-full bg-white/5 ${log.action_type === 'problem' ? 'bg-red-500/10' : ''}`}>
                            {getIcon(log.action_type)}
                        </div>

                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-white font-bold">{log.product_name}</h3>
                                    <p className="text-sm text-white/50 capitalize">
                                        {log.action_type === 'produced' && 'Produção Registrada'}
                                        {log.action_type === 'sent' && 'Envio Realizado'}
                                        {log.action_type === 'problem' && 'Problema Reportado'}
                                    </p>
                                </div>
                                <span className="text-xs text-white/30">
                                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
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
                ))}
            </div>
        </div>
    );
};

export default ProductionLogList;
