import React from 'react';
import { supabase } from '../lib/supabase';
import InventoryGrid from '../components/InventoryGrid';
import ProductionLogList from '../components/ProductionLogList';

const Inventory: React.FC = () => {
    const [requests, setRequests] = React.useState<any[]>([]);

    React.useEffect(() => {
        const fetchRequests = async () => {
            const { data } = await supabase
                .from('production_requests')
                .select('*, products(name)')
                .eq('status', 'pending');
            if (data) setRequests(data);
        };
        fetchRequests();

        const subscription = supabase
            .channel('inventory_requests')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_requests' }, fetchRequests)
            .subscribe();

        return () => { subscription.unsubscribe(); };
    }, []);

    const markAsDone = async (id: string, productId: string, quantity: number) => {
        // Here we could auto-open the modal to produce, but for now let's just mark as done
        // ideally: open modal -> produce -> then update request status
        // simpler for MVP: just mark as done and assume they will "Produce" separately
        // OR: "Produzir Agora" opens the StockControlModal? 
        // Let's keep it simple: "Marcar como Atendido" button.

        await supabase
            .from('production_requests')
            .update({ status: 'completed' })
            .eq('id', id);
    };

    return (
        <div className="min-h-screen bg-black">
            {/* Pending Requests Alert */}
            {requests.length > 0 && (
                <div className="p-4 bg-purple-900/20 border-b border-purple-500/20">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                        Solicitações de Produção ({requests.length})
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                        {requests.map(req => (
                            <div key={req.id} className="min-w-[200px] bg-[#1A1A1A] p-4 rounded-xl border border-purple-500/30">
                                <h4 className="text-white font-bold">{req.products?.name}</h4>
                                <div className="text-purple-200 text-sm mt-1">
                                    Qtd: <strong>{req.quantity}</strong>
                                </div>
                                <div className="text-white/40 text-xs mt-1">
                                    Para: {new Date(req.needed_date).toLocaleDateString('pt-BR')}
                                </div>
                                <button
                                    onClick={() => markAsDone(req.id, req.product_id, req.quantity)}
                                    className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition"
                                >
                                    Marcar como Feito
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <InventoryGrid />
            <div className="px-4">
                <ProductionLogList />
            </div>
        </div>
    );
};

export default Inventory;
