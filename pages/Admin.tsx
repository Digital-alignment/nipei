import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import AdminDashboard from '../components/admin/AdminDashboard';
import ProductList from '../components/admin/ProductList';
import ProductForm from '../components/admin/ProductForm';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';

const Admin: React.FC = () => {
    const { session, loading, signOut } = useAuth();
    const navigate = useNavigate();
    const [view, setView] = useState<'dashboard' | 'list' | 'form'>('dashboard');
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
        <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="p-3 bg-neutral-800 rounded-xl hover:bg-neutral-700 transition-colors text-emerald-500">
                            <ArrowLeft size={24} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold font-serif">Painel Administrativo</h1>
                            <p className="opacity-60 text-sm">Medicinas da Floresta</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-neutral-800 p-1 rounded-lg">
                            <button
                                onClick={() => {
                                    setView('dashboard');
                                    setEditingProduct(null);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => {
                                    setView('list');
                                    setEditingProduct(null);
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' || view === 'form' ? 'bg-neutral-700 text-white' : 'text-neutral-400 hover:text-white'}`}
                            >
                                Produtos
                            </button>
                        </div>
                        <button
                            onClick={handleSignOut}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors font-bold text-sm"
                        >
                            <LogOut size={16} /> <span className="hidden md:inline">Sair</span>
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
            </div>
        </div>
    );
};

export default Admin;
