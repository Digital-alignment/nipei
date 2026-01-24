import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { User, LogOut, Shield, Users, FileText, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface GuardiaoProfile {
    full_name: string;
    yawanawa_name?: string;
    avatar_url?: string;
    role: UserRole;
    squads?: string[];
    user_forms: {
        slug: string;
        status: 'draft' | 'submitted';
        updated_at: string;
    } | null;
}

const GuardiaoDashboard: React.FC = () => {
    const { session, signOut, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<GuardiaoProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading) {
            if (!session) {
                navigate('/login');
            } else {
                fetchProfile();
            }
        }
    }, [session, authLoading, navigate]);

    const fetchProfile = async () => {
        if (!session?.user?.id) return;
        
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                full_name, 
                yawanawa_name, 
                avatar_url, 
                role, 
                squads,
                user_forms:user_forms(slug, status, updated_at)
            `)
            .eq('id', session.user.id)
            .single();

        if (data) {
             // Transform 1:1 relation from array to object if needed
             const profileData = {
                 ...data,
                 user_forms: Array.isArray(data.user_forms) ? data.user_forms[0] : data.user_forms
             };
            setProfile(profileData as GuardiaoProfile);
            if (data.role !== 'guardiao' && data.role !== 'superadmin' && data.role !== 'otter') {
                // Redirect if not guardiao (allow superadmin for testing)
                navigate('/'); 
            }
        }
        setLoading(false);
    };

    if (loading || authLoading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Carregando...</div>;

    return (
        <div className="min-h-screen bg-neutral-900 text-white">
            <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="text-emerald-500" />
                        <h1 className="font-serif text-lg font-bold">Painel do Guardião</h1>
                    </div>
                    <button 
                        onClick={() => signOut()} 
                        className="text-neutral-400 hover:text-white transition-colors flex items-center gap-2 text-sm"
                    >
                        <LogOut size={16} /> Sair
                    </button>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto px-6 py-12">
                {profile && (
                    <div className="bg-neutral-800 rounded-3xl p-8 border border-neutral-700 shadow-2xl">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-32 h-32 rounded-full bg-neutral-700 flex items-center justify-center border-4 border-neutral-600 overflow-hidden shadow-xl">
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    <User size={64} className="text-neutral-500" />
                                )}
                            </div>
                            
                            <div className="text-center md:text-left flex-1">
                                <h2 className="text-3xl font-serif font-bold text-white mb-2">
                                    {profile.yawanawa_name || profile.full_name}
                                </h2>
                                {profile.yawanawa_name && (
                                    <p className="text-neutral-400 text-lg mb-4">{profile.full_name}</p>
                                )}
                                
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-sm font-medium">
                                    <Shield size={14} /> Guardião
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                             {/* Assigned Squads */}
                            <div>
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-neutral-700 pb-4">
                                    <Users className="text-emerald-500" />
                                    Squads Atribuídos
                                </h3>
                                
                                {profile.squads && profile.squads.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {profile.squads.map(squad => (
                                            <div key={squad} className="bg-neutral-700/30 border border-neutral-600 rounded-xl p-4 flex items-center justify-between group hover:border-emerald-500/50 transition-all">
                                                <span className="capitalize font-medium text-lg text-neutral-200">
                                                    {squad === 'mutum_manager' ? 'Mutum (Squad 2)' : squad}
                                                </span>
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 group-hover:shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all" />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-neutral-700/20 rounded-xl border border-neutral-700/50 border-dashed">
                                        <p className="text-neutral-500">Nenhum squad atribuído ainda.</p>
                                    </div>
                                )}
                            </div>

                            {/* Journey Form Status */}
                            <div>
                                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 border-b border-neutral-700 pb-4">
                                    <FileText className="text-emerald-500" />
                                    Jornada (Formulário)
                                </h3>

                                {profile.user_forms ? (
                                    <div className="bg-neutral-700/30 border border-neutral-600 rounded-xl p-6 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                                        <div className="absolute top-0 right-0 p-4 opacity-50 text-neutral-600 group-hover:text-emerald-500/20 transition-colors">
                                           <FileText size={48} />
                                        </div>

                                        <p className="text-sm text-neutral-400 mb-2">Status Atual</p>
                                        <div className="flex items-center gap-2 mb-6">
                                            {profile.user_forms.status === 'submitted' ? (
                                                <span className="flex items-center gap-2 text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                                                    <CheckCircle size={16} /> Enviado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2 text-amber-500 font-bold bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                                                    <AlertTriangle size={16} /> Rascunho
                                                </span>
                                            )}
                                        </div>

                                        <button 
                                            onClick={() => navigate(`/u/${profile.user_forms!.slug}`)}
                                            className="w-full py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group-hover:bg-emerald-600 group-hover:text-white"
                                        >
                                            {profile.user_forms.status === 'submitted' ? 'Visualizar Respostas' : 'Continuar Preenchimento'} 
                                            <ArrowRight size={18} />
                                        </button>
                                        
                                        {profile.user_forms.status !== 'submitted' && (
                                            <p className="text-xs text-neutral-500 mt-3 text-center">
                                                Última atualização: {new Date(profile.user_forms.updated_at).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-neutral-700/20 rounded-xl border border-neutral-700/50 border-dashed">
                                        <p className="text-neutral-500 mb-4">Nenhum formulário de jornada iniciado.</p>
                                        <button 
                                            onClick={() => {/* Trigger create form or contact logic */}}
                                            className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                                        >
                                            Iniciar Jornada
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GuardiaoDashboard;
