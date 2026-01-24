import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import AdminDashboard from '../components/admin/AdminDashboard';
import ProductList from '../components/admin/ProductList';
import ProductForm from '../components/admin/ProductForm';
import MutumProductForm from '../components/admin/MutumProductForm';
import Squad2Finance from '../components/admin/finance/Squad2Finance';
import { Product, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import ProfileMenu from '../components/ProfileMenu';

const Admin: React.FC = () => {
    const { session, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'list' | 'form' | 'finance'>('dashboard');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    useEffect(() => {
        if (!loading) {
            if (!session) {
                navigate('/login');
            } else {
                const role = session.user?.user_metadata?.role as UserRole;
                if (role !== 'superadmin' && role !== 'otter' && role !== 'mutum_manager') {
                    navigate('/');
                }
            }
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
        <div className="min-h-screen bg-neutral-900 text-white pb-20 md:pb-8">
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/supadmin" className="p-3 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors text-emerald-500">
                                <ArrowLeft size={24} />
                            </Link>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-bold font-serif">Squad 2: Produção (Mutum)</h1>
                                <p className="opacity-60 text-xs md:text-sm">Gestão de Estoque e Produção</p>
                            </div>
                        </div>

                        {/* Profile Menu */}
                        <div>
                            <ProfileMenu />
                        </div>
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
                                    setView('finance');
                                    setEditingProduct(null);
                                }}
                                className={`flex-1 md:flex-none px-6 py-3 md:py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${view === 'finance' ? 'bg-neutral-700 text-white shadow-md' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Finanças
                            </button>
                        </div>

                    </div>
                </header>

                {view === 'dashboard' && <AdminDashboard filter={p => p.product_type === 'bulk' || Boolean(p.production_type)} />}

                {view === 'list' && (
                    <ProductList 
                        onCreate={handleCreate} 
                        onEdit={handleEdit} 
                        filter={p => p.product_type === 'bulk' || Boolean(p.production_type)}
                    />
                )}

                {view === 'form' && (
                    <MutumProductForm product={editingProduct} onClose={handleCloseForm} />
                )}

                {view === 'finance' && (
                    <Squad2Finance />
                )}
            </div>
        </div>
    );
};

export default Admin;
