import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import AdminDashboard from '../components/admin/AdminDashboard';
import ProductList from '../components/admin/ProductList';
import ProductForm from '../components/admin/ProductForm';
import ShipmentList from '../components/admin/ShipmentList';
import FinanceLayout from '../components/admin/finance/FinanceLayout';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';

const Admin: React.FC = () => {
    const { session, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'list' | 'form' | 'shipments' | 'finance'>('dashboard');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    useEffect(() => {
        if (!loading && !session) {
            navigate('/login');
        }
    }, [session, loading, navigate]);

    if (loading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Carregando...</div>;

    if (!session) return null; // Will redirect

    const handleCreate = () => {
        setEditingProduct(null);
        setView('form');
    };

    const handleEdit = (product: Product) => {
        setEditingProduct(product);
        setView('form');
    };

    const handleCloseForm = () => {
        setView('list');
        setEditingProduct(null);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white pb-20 md:pb-8"> {/* Added padding bottom for mobile if we decided to do bottom nav, but top nav is fine too */}
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/" className="p-3 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors text-emerald-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold font-serif">Painel Admin</h1>
                                <p className="opacity-60 text-xs md:text-sm">Medicinas da Floresta</p>
                            </div>
                        </div>

                        {/* Mobile Logout Button (Visible only on mobile) */}
                        <button
                            onClick={handleSignOut}
                            className="md:hidden p-3 bg-red-500/10 text-red-500 rounded-xl"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>

                    {/* Navigation Tabs - Scrollable on mobile */}
                    <div className="flex items-center gap-2 md:gap-4 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                        <div className="flex bg-neutral-800 p-1 rounded-xl w-full md:w-auto">
                            <button
                                onClick={() => {
                                    setView('dashboard');
                                    setEditingProduct(null);
                                }}
                                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'dashboard' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    setView('list');
                                    setEditingProduct(null);
                                }}
                                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'list' || view === 'form' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Produtos
                            </button>
                            <button
                                onClick={() => {
                                    setView('shipments');
                                    setEditingProduct(null);
                                }}
                                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'shipments' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Envios
                            </button>
                            <button
                                onClick={() => {
                                    setView('finance');
                                    setEditingProduct(null);
                                }}
                                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'finance' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Finanças
                            </button>
                        </div>

                        {/* Desktop Logout Button */}
                        <button
                            onClick={handleSignOut}
                            className="hidden md:flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-bold text-sm"
                        >
                            <LogOut size={16} /> <span>Sair</span>
                        </button>
                    </div>
                </header>

                {view === 'dashboard' && <AdminDashboard />}

                {view === 'list' && (
                    <ProductList onCreate={handleCreate} onEdit={handleEdit} />
                )}

                {view === 'form' && (
                    <ProductForm product={editingProduct} onClose={handleCloseForm} />
                )}

                {view === 'shipments' && (
                    <ShipmentList />
                )}

                {view === 'finance' && (
                    <FinanceLayout />
                )}
            </div>
        </div>
    );
};

export default Admin;
