import React, { useEffect, useState } from 'react';
import { useProducts } from '../../context/ProductContext';
import { supabase } from '../../lib/supabase';
import { Package, AlertTriangle, Bell, CheckCircle } from 'lucide-react';
import ProductionLogList from '../ProductionLogList';

const AdminCalendar = React.lazy(() => import('./AdminCalendar'));
const ProductionRequestModal = React.lazy(() => import('./ProductionRequestModal'));

const AdminDashboard: React.FC = () => {
    const { products } = useProducts();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showRequestModal, setShowRequestModal] = useState(false);

    const totalStock = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
    const lowStockProducts = products.filter(p => (p.stock_quantity || 0) < 10);

    const fetchUnreadCount = async () => {
        const { count, error } = await supabase
            .from('production_logs')
            .select('*', { count: 'exact', head: true })
            .is('read_at', null);

        if (!error && count !== null) {
            setUnreadCount(count);
        }
    };

    useEffect(() => {
        fetchUnreadCount();

        // Subscribe to changes to update the unread count in real-time
        const subscription = supabase
            .channel('admin_dashboard_stats')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => {
                fetchUnreadCount();
            })
            .subscribe();

        return () => {
            subscription.unsubscribe();
        }
    }, []);

    return (
        <div className="space-y-8 animate-fadeIn">
            <div className="flex justify-end">
                <button
                    onClick={() => setShowRequestModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center gap-2"
                >
                    <Package size={20} />
                    Solicitar Produção
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-sm">Estoque Total</p>
                            <h3 className="text-3xl font-bold text-white mt-2">{totalStock}</h3>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                            <Package size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-sm">Estoque Baixo</p>
                            <h3 className="text-3xl font-bold text-white mt-2">{lowStockProducts.length}</h3>
                            <p className="text-xs text-neutral-500 mt-1">Produtos com menos de 10 unidades</p>
                        </div>
                        <div className="p-3 bg-orange-500/10 text-orange-500 rounded-xl">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-800 p-6 rounded-2xl border border-neutral-700">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-neutral-400 text-sm">Notificações</p>
                            <h3 className="text-3xl font-bold text-white mt-2">{unreadCount}</h3>
                            <p className="text-xs text-neutral-500 mt-1">Atualizações não lidas</p>
                        </div>
                        <div className={`p-3 rounded-xl ${unreadCount > 0 ? 'bg-indigo-500/10 text-indigo-500' : 'bg-neutral-700/30 text-neutral-500'}`}>
                            {unreadCount > 0 ? <Bell size={24} className={unreadCount > 0 ? 'animate-pulse' : ''} /> : <CheckCircle size={24} />}
                        </div>
                    </div>
                </div>
            </div>

            {/* Calendar Section */}
            <React.Suspense fallback={<div className="h-96 bg-white/5 rounded-3xl animate-pulse" />}>
                <AdminCalendar />
            </React.Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Stock Table */}
                {/* Stock Overview - Responsive */}
                <div className="bg-[#1A1A1A]/80 border border-white/5 rounded-3xl p-6 backdrop-blur-xl">
                    <div className="p-6 border-b border-neutral-700">
                        <h3 className="text-lg font-bold text-white">Visão Geral de Estoque</h3>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-900/50 text-neutral-400 text-sm uppercase sticky top-0 backdrop-blur-sm">
                                <tr>
                                    <th className="p-4 font-medium">Produto</th>
                                    <th className="p-4 font-medium text-center">Atual</th>
                                    <th className="p-4 font-medium text-center">Meta</th>
                                    <th className="p-4 font-medium text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm divide-y divide-neutral-700">
                                {products.map(product => {
                                    const stock = product.stock_quantity || 0;
                                    const goal = product.monthly_production_goal || 0;
                                    const percentage = goal > 0 ? (stock / goal) * 100 : 0;

                                    return (
                                        <tr key={product.id} className="hover:bg-neutral-700/30 transition-colors">
                                            <td className="p-4 font-medium text-white">{product.name}</td>
                                            <td className="p-4 text-center text-white">{stock}</td>
                                            <td className="p-4 text-center text-neutral-400">{goal}</td>
                                            <td className="p-4 text-center">
                                                <div className="w-24 bg-neutral-700 h-2 rounded-full overflow-hidden mx-auto" title={`${percentage.toFixed(0)}%`}>
                                                    <div
                                                        className={`h-full ${percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min(percentage, 100)}%` }}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-neutral-700">
                        {products.map(product => {
                            const stock = product.stock_quantity || 0;
                            const goal = product.monthly_production_goal || 0;
                            const percentage = goal > 0 ? (stock / goal) * 100 : 0;
                            const isLowStock = stock < 10;

                            return (
                                <div key={product.id} className="py-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white text-base">{product.name}</h4>
                                        {isLowStock ? (
                                            <span className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-[10px] font-bold uppercase">
                                                Baixo
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase">
                                                Normal
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-3 rounded-xl text-center">
                                            <p className="text-neutral-400 text-[10px] uppercase mb-1">Estoque</p>
                                            <p className="text-white font-bold text-lg">{stock}</p>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-xl text-center">
                                            <p className="text-neutral-400 text-[10px] uppercase mb-1">Meta</p>
                                            <p className="text-white font-bold text-lg">{goal}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-[10px] mb-1">
                                            <span className="text-neutral-400">Progresso</span>
                                            <span className="text-white font-medium">{Math.round(percentage)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isLowStock ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Logs Feed */}
                <div className="bg-neutral-800 rounded-2xl border border-neutral-700 p-6 h-fit">
                    <ProductionLogList
                        variant="dashboard"
                        adminMode={true}
                        onStatsUpdate={fetchUnreadCount}
                    />
                </div>
            </div>
            {showRequestModal && (
                <React.Suspense fallback={null}>
                    <ProductionRequestModal
                        products={products}
                        onClose={() => setShowRequestModal(false)}
                    />
                </React.Suspense>
            )}
        </div>
    );
};

export default AdminDashboard;
