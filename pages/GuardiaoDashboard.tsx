import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../types';
import { User, LogOut, Shield, Users, FileText, CheckCircle, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, Hammer } from 'lucide-react';

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
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading) {
            if (!session) {
                navigate('/login');
            } else {
                fetchProfile();
            }
        }
    }, [session, authLoading, navigate]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

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
                        <LogOut size={16} /> <span className="hidden md:inline">Sair</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8 relative">
                {profile && (
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        
                        {/* LEFT COLUMN: Profile Dropdown */}
                        <div className="w-full md:w-auto relative z-40" ref={dropdownRef}>
                            <button 
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className={`w-full md:w-[350px] bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 rounded-2xl p-4 flex items-center gap-4 transition-all shadow-lg group ${isProfileOpen ? 'ring-2 ring-emerald-500/50 border-emerald-500/50' : ''}`}
                            >
                                <div className="w-14 h-14 rounded-full bg-neutral-700 flex items-center justify-center border-2 border-neutral-600 overflow-hidden shadow-md shrink-0">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={28} className="text-neutral-500" />
                                    )}
                                </div>
                                
                                <div className="text-left flex-1 min-w-0">
                                    <h2 className="text-lg font-serif font-bold text-white truncate leading-tight">
                                        {profile.yawanawa_name || profile.full_name}
                                    </h2>
                                    <p className="text-neutral-400 text-xs truncate mb-1">{profile.full_name}</p>
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-emerald-400">
                                        <Shield size={10} /> Guardião
                                    </span>
                                </div>

                                <div className="text-neutral-500 group-hover:text-white transition-colors">
                                    {isProfileOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </button>

                            {/* Dropdown Content */}
                            {isProfileOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 space-y-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                        
                                        {/* My Squads Section */}
                                        <div className="p-3 bg-neutral-900/30 rounded-xl">
                                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <Users size={12} /> Meus Squads
                                            </h3>
                                            
                                            {profile.squads && profile.squads.length > 0 ? (
                                                <div className="space-y-2">
                                                    {profile.squads.map(squad => {
                                                        let squadName = squad;
                                                        let link = '';
                                                        let color = 'text-neutral-200';
                                                        let border = 'border-neutral-700';
                                                        let bg = 'bg-neutral-800';
                                                        let icon = <Shield size={16} />;

                                                        if (squad === 'mutum_manager') {
                                                            squadName = 'Squad 2: Mutum & Produção';
                                                            link = '/mutumproducao';
                                                            color = 'text-emerald-400';
                                                            border = 'border-emerald-500/30';
                                                            bg = 'bg-emerald-500/5';
                                                            icon = <Users size={16} className="text-emerald-400" />;
                                                        } else if (squad === 'squad5') {
                                                            squadName = 'Squad 5: Gestão de Pessoas';
                                                            link = '/s5admin';
                                                            color = 'text-blue-400';
                                                            border = 'border-blue-500/30';
                                                            bg = 'bg-blue-500/5';
                                                            icon = <Users size={16} className="text-blue-400" />;
                                                        }

                                                        return (
                                                            <div key={squad} className={`${bg} border ${border} rounded-lg p-3 group hover:border-white/20 transition-all`}>
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <div className={`w-8 h-8 rounded-lg bg-neutral-900/50 flex items-center justify-center`}>
                                                                        {icon}
                                                                    </div>
                                                                    <div className="flex-1 min-w-0">
                                                                        <h4 className={`text-sm font-bold ${color} truncate`}>{squadName}</h4>
                                                                    </div>
                                                                </div>
                                                                
                                                                {link ? (
                                                                    <button 
                                                                        onClick={() => navigate(link)}
                                                                        className="w-full py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-700 text-xs font-bold text-neutral-300 hover:text-white transition-all border border-neutral-700 flex items-center justify-center gap-1"
                                                                    >
                                                                        Acessar <ArrowRight size={12} />
                                                                    </button>
                                                                ) : (
                                                                    <div className="text-center py-1.5 text-xs text-neutral-600 font-medium italic">
                                                                        Indisponível
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 border border-dashed border-neutral-700 rounded-lg">
                                                    <p className="text-xs text-neutral-500">Sem squads.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Journey Section */}
                                        <div className="p-3 bg-neutral-900/30 rounded-xl">
                                            <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                                <FileText size={12} /> Jornada
                                            </h3>

                                            {profile.user_forms ? (
                                                <div className="border border-neutral-700 rounded-lg p-3 bg-neutral-800">
                                                    <div className="flex items-center justify-between mb-3">
                                                         {profile.user_forms.status === 'submitted' ? (
                                                            <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded">
                                                                <CheckCircle size={12} /> Enviado
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold bg-amber-500/10 px-2 py-1 rounded">
                                                                <AlertTriangle size={12} /> Rascunho
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] text-neutral-500">
                                                            {new Date(profile.user_forms.updated_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    
                                                    <button 
                                                        onClick={() => navigate(`/u/${profile.user_forms!.slug}`)}
                                                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                                    >
                                                        {profile.user_forms.status === 'submitted' ? 'Ver Respostas' : 'Continuar'} 
                                                        <ArrowRight size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 border border-dashed border-neutral-700 rounded-lg">
                                                    <button className="text-xs text-emerald-400 hover:underline">Iniciar</button>
                                                </div>
                                            )}
                                        </div>

                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT COLUMN: Placeholder */}
                        <div className="flex-1 w-full relative z-0">
                            <div className="w-full h-[400px] md:h-[600px] rounded-3xl bg-neutral-100 flex flex-col items-center justify-center text-neutral-400 shadow-xl border border-neutral-200/50 p-8 text-center">
                                <div className="w-20 h-20 bg-neutral-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Hammer size={40} className="text-neutral-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-neutral-600 mb-2">Ferramenta em breve</h3>
                                <p className="max-w-md text-neutral-500">
                                    Estamos construindo novas funcionalidades para apoiar sua jornada. Fique atento às novidades.
                                </p>
                            </div>
                        </div>

                    </div>
                )}
            </main>
        </div>
    );
};

export default GuardiaoDashboard;
