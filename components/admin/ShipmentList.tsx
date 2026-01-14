import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Calendar, Package, FileText, CheckCircle, Clock } from 'lucide-react';
import { Product } from '../../types';

interface ShipmentItem {
    id: string;
    product_id: string;
    quantity: number;
    product: Product; // Joined
}

interface Shipment {
    id: string; // UUID
    created_at: string;
    expected_arrival_date: string;
    description: string;
    voucher_url: string;
    package_url: string;
    status: 'pending' | 'received'; // Assuming these statuses for now
    items: ShipmentItem[];
}

const ShipmentList: React.FC = () => {
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

    const fetchShipments = async () => {
        setLoading(true);
        try {
            // Fetch shipments
            const { data: shipmentsData, error: shipmentsError } = await supabase
                .from('shipments')
                .select('*')
                .order('created_at', { ascending: false });

            if (shipmentsError) throw shipmentsError;

            // Fetch items for these shipments
            // We need to fetch items and then products manually if we can't deep join easily 
            // or we use the join syntax if relationships are set up.
            // Assuming relationships are set up: shipments -> shipment_items -> products

            const { data: itemsData, error: itemsError } = await supabase
                .from('shipment_items')
                .select('*, product:products(*)');

            if (itemsError) throw itemsError;

            // Map items to shipments
            const shipmentsWithItems = shipmentsData.map(shipment => ({
                ...shipment,
                items: itemsData.filter(item => item.shipment_id === shipment.id)
            }));

            setShipments(shipmentsWithItems);
        } catch (error) {
            console.error('Error fetching shipments:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShipments();
    }, []);

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>;
    }

    return (
        <div className="space-y-6 animate-fadeIn">
            {shipments.map(shipment => (
                <div
                    key={shipment.id}
                    onClick={() => setSelectedShipment(shipment)}
                    className="bg-neutral-800 rounded-xl p-6 border border-white/5 hover:border-emerald-500/50 transition-colors cursor-pointer group"
                >
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <Package size={24} />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Envio #{shipment.id.slice(0, 8)}</h3>
                                <div className="flex items-center gap-2 text-neutral-400 text-sm">
                                    <Calendar size={14} />
                                    <span>Chegada Prevista: {new Date(shipment.expected_arrival_date).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-right">
                                <span className="block text-white font-bold">{shipment.items.length} Itens</span>
                                <span className="text-neutral-500 text-sm">
                                    {shipment.items.reduce((acc, item) => acc + item.quantity, 0)} unidades total
                                </span>
                            </div>
                            <div className={`px-3 py-1 rounded-full font-bold text-xs uppercase border ${shipment.status === 'received' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                {shipment.status === 'received' ? 'Recebido' : 'Em Trânsito'}
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {shipments.length === 0 && (
                <div className="text-center py-20 text-neutral-500">
                    Nenhum envio registrado.
                </div>
            )}

            {/* Detail Modal */}
            {selectedShipment && (
                <ShipmentDetailModal
                    shipment={selectedShipment}
                    onClose={() => setSelectedShipment(null)}
                    onUpdate={() => {
                        fetchShipments();
                        // Also update the selected status to reflect changes immediately in UI if helpful,
                        // but fetchShipments handles list. For modal internal state, we rely on parent re-render?
                        // Actually, better to just refetch list and close, or update selected local state.
                        // Ideally we close modal or keep it open with new status.
                        // Let's rely on fetchShipments and if modal stays open it needs updated shipment prop.
                        // For now we close modal in child on success.
                    }}
                />
            )}
        </div>
    );
};

const ShipmentDetailModal: React.FC<{ shipment: Shipment; onClose: () => void, onUpdate: () => void }> = ({ shipment, onClose, onUpdate }) => {
    const [updating, setUpdating] = useState(false);

    const handleMarkAsReceived = async () => {
        if (!confirm('Confirmar recebimento deste envio?')) return;
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('shipments')
                .update({ status: 'received' })
                .eq('id', shipment.id);

            if (error) throw error;
            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error updating shipment:', error);
            alert('Erro ao atualizar status.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-neutral-900 w-full max-w-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-start bg-neutral-800/50">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Detalhes do Envio</h2>
                        <p className="text-emerald-400 font-mono text-sm">ID: #{shipment.id.slice(0, 8)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                        X
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Status Badge */}
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl border border-white/5">
                        <span className="text-neutral-400">Status Atual</span>
                        {shipment.status === 'received' ? (
                            <div className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-400/10 px-4 py-2 rounded-lg">
                                <CheckCircle size={20} />
                                <span>Recebido & Conferido</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-blue-400 font-bold bg-blue-400/10 px-4 py-2 rounded-lg">
                                <Clock size={20} />
                                <span>Em Trânsito / Pendente</span>
                            </div>
                        )}
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <h4 className="text-neutral-400 text-sm mb-2 flex items-center gap-2"><Calendar size={16} /> Previsão de Chegada</h4>
                            <p className="text-white text-xl font-bold">{new Date(shipment.expected_arrival_date).toLocaleDateString()}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <h4 className="text-neutral-400 text-sm mb-2 flex items-center gap-2"><Clock size={16} /> Data de Envio</h4>
                            <p className="text-white text-xl font-bold">{new Date(shipment.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Description */}
                    {shipment.description && (
                        <div>
                            <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                                <FileText size={18} className="text-emerald-500" /> Observações
                            </h4>
                            <div className="bg-white/5 p-4 rounded-xl text-neutral-300">
                                {shipment.description}
                            </div>
                        </div>
                    )}

                    {/* Products List */}
                    <div>
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Package size={18} className="text-emerald-500" /> Produtos Enviados
                        </h4>
                        <div className="space-y-2">
                            {shipment.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-3">
                                        {/* Assuming product object is populated, otherwise fallback */}
                                        <div className="w-10 h-10 rounded bg-black/40 overflow-hidden">
                                            {item.product?.images?.[0] && <img src={item.product.images[0]} className="w-full h-full object-cover" />}
                                        </div>
                                        <span className="text-white font-medium">{item.product?.name || 'Produto Removido'}</span>
                                    </div>
                                    <span className="text-emerald-400 font-bold text-lg">{item.quantity} un</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Photos */}
                    <div>
                        <h4 className="text-white font-bold mb-4 px-1">Comprovantes</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-neutral-500 mb-2">Comprovante de Envio</p>
                                <a href={shipment.voucher_url} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/10 hover:border-emerald-500/50 transition-colors">
                                    <img src={shipment.voucher_url} alt="Voucher" className="w-full h-48 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">Ver Original</span>
                                    </div>
                                </a>
                            </div>
                            <div>
                                <p className="text-sm text-neutral-500 mb-2">Foto do Pacote</p>
                                <a href={shipment.package_url} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-xl border border-white/10 hover:border-emerald-500/50 transition-colors">
                                    <img src={shipment.package_url} alt="Package" className="w-full h-48 object-cover" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">Ver Original</span>
                                    </div>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-neutral-900 flex justify-between gap-4">
                    <button onClick={onClose} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors">
                        Fechar
                    </button>
                    {shipment.status !== 'received' && (
                        <button
                            onClick={handleMarkAsReceived}
                            disabled={updating}
                            className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                        >
                            {updating ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                            Confirmar Recebimento
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShipmentList;
