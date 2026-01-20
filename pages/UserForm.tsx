import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { UserRole } from '../types';
import DynamicForm from '../components/DynamicForm';
import { TreePine, Lock, LogOut } from 'lucide-react';

const UserForm: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [canView, setCanView] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [formUserId, setFormUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkAccess = async () => {
            if (authLoading) return;
            
            if (!user) {
                // If not logged in, technically they can't see it as per requirements "only user created" implied auth
                // But let's check if the slug even exists first
            }

            if (!slug) {
                navigate('/'); 
                return;
            }

            // Fetch form meta to check ownership
            const { data: form, error } = await supabase
                .from('user_forms')
                .select('user_id')
                .eq('slug', slug)
                .single();

            if (error || !form) {
                // Form not found
                setLoading(false);
                return;
            }

            setFormUserId(form.user_id);

            // Access Logic
            if (user) {
                const role = user.user_metadata?.role as UserRole;
                const isSuper = role === 'superadmin' || role === 'otter';
                const owner = user.id === form.user_id;

                setIsAdmin(isSuper);
                setIsOwner(owner);

                if (isSuper || owner) {
                    setCanView(true);
                } else {
                    setCanView(false);
                }
            } else {
                setCanView(false); // Must be logged in
            }
            
            setLoading(false);
        };

        checkAccess();
    }, [slug, user, authLoading, navigate]);

    if (authLoading || loading) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-emerald-500">
                Loading...
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white px-4">
                <div className="bg-neutral-800 p-8 rounded-3xl border border-neutral-700 text-center max-w-md">
                    <div className="w-16 h-16 rounded-full bg-neutral-700 flex items-center justify-center mx-auto mb-6 text-neutral-400">
                        <Lock size={32} />
                    </div>
                    <h1 className="text-2xl font-bold font-serif mb-4">Acesso Restrito</h1>
                    <p className="text-neutral-400 mb-8">Esta área é exclusiva. Faça login com a conta correta para acessar.</p>
                    <button 
                         onClick={() => navigate('/login')}
                         className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold transition-all w-full"
                    >
                        Fazer Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-900 text-white pb-20">
            <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                            <TreePine size={24} />
                        </div>
                        <span className="font-bold tracking-tight">Portal do Guardião</span>
                    </div>
                    
                    <button 
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors font-bold text-sm"
                    >
                        <LogOut size={16} />
                        <span>Sair</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
                {slug && formUserId && (
                    <DynamicForm 
                        slug={slug} 
                        userId={formUserId} 
                        isOwner={isOwner} 
                        isAdmin={isAdmin} 
                    />
                )}
            </main>
        </div>
    );
};

export default UserForm;
