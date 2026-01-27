import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import InventoryGrid from '../components/InventoryGrid';
import ProductionLogList from '../components/ProductionLogList';
import WorkerProfileModal from '../components/inventory/WorkerProfileModal';
import ToolTracker from '../components/inventory/ToolTracker';
import ActiveProductionGoals from '../components/inventory/ActiveProductionGoals';
import StockControlModal from '../components/StockControlModal';
import { Product } from '../types';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import MutumHeader from '../components/MutumHeader';

const Inventory: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [requests, setRequests] = React.useState<any[]>([]);
    
    // Auth Check
    React.useEffect(() => {
        const checkAccess = async () => {
             if (user) {
                // Fetch latest profile to ensure up-to-date squads
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role, squads')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    const role = profile.role;
                    const squads = profile.squads || [];
                     // Access: Superadmin, Otter, Mutum Manager, or Guardian with Mutum access
                    const hasAccess = role === 'superadmin' || role === 'otter' || role === 'mutum_manager' || (role === 'guardiao' && squads.includes('mutum_manager'));
                    
                    if (!hasAccess) {
                        navigate('/');
                    }
                } else {
                     navigate('/');
                }
            }
        };
        
        checkAccess();
    }, [user, navigate]);

    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [activeTab, setActiveTab] = useState<'production' | 'tools'>('production');

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
        await supabase
            .from('production_requests')
            .update({ status: 'completed' })
            .eq('id', id);
    };



    return (
        <div className="min-h-screen bg-black pb-20">
            {/* New Header */}
            <MutumHeader />

            {/* Tabs */}
            <div className="flex gap-4 mt-4 border-b border-white/5 pb-1 max-w-7xl mx-auto px-4">
                <button
                    onClick={() => setActiveTab('production')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'production' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    Produção
                </button>
                <button
                    onClick={() => setActiveTab('tools')}
                    className={`pb-2 px-2 text-sm font-bold uppercase tracking-wider transition-colors ${activeTab === 'tools' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-neutral-500 hover:text-white'
                        }`}
                >
                    Inventário (Ferramentas)
                </button>
            </div>

            {/* Pending Requests Alert */}
            {requests.length > 0 && (
                <div className="p-4 bg-purple-900/20 border-b border-purple-500/20 mb-4">
                    <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2">
                        Solicitações de Produção ({requests.length})
                    </h3>
                    <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                        {requests.map(req => (
                            <div key={req.id} className="min-w-[200px] bg-[#1A1A1A] p-4 rounded-xl border border-purple-500/30">
                                <h4 className="text-white font-bold text-sm">{req.products?.name}</h4>
                                <div className="text-purple-200 text-xs mt-1">
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

            {activeTab === 'production' ? (
                <>
                    <ActiveProductionGoals onSelectGoal={setSelectedProduct} />
                    <InventoryGrid onSelectProduct={setSelectedProduct} />

                    <div className="px-4 mt-8">
                        <h3 className="text-neutral-500 text-xs uppercase tracking-widest mb-4">Histórico Recente</h3>
                        <ProductionLogList />
                    </div>
                </>
            ) : (
                <div className="px-4">
                    <ToolTracker />
                </div>
            )}

            <WorkerProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
            />

            <AnimatePresence>
                {selectedProduct && (
                    <StockControlModal
                        product={selectedProduct}
                        onClose={() => setSelectedProduct(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default Inventory;
