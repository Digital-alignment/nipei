import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { ArrowLeft, User, FileText, CheckCircle, AlertTriangle, Edit } from 'lucide-react';
import { motion } from 'framer-motion';
import EditUserModal from '../components/admin/EditUserModal';

interface UserProfile {
    id: string;
    full_name: string;
    yawanawa_name?: string;
    avatar_url?: string;
    role: UserRole;
    squads?: string[];
    created_at: string;
    user_forms: {
        slug: string;
        status: 'draft' | 'submitted';
        updated_at: string;
    } | null;
}

const SupadminUsers: React.FC = () => {
    const { session, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [filter, setFilter] = useState<'all' | 'submitted' | 'draft' | 'none'>('all');

    useEffect(() => {
        if (!authLoading && session) {
            const role = session.user?.user_metadata?.role as UserRole;
            if (role !== 'superadmin' && role !== 'otter') {
                navigate('/');
            } else {
                fetchUsers();
            }
        }
    }, [authLoading, session, navigate]);

    const fetchUsers = async () => {
        setLoading(true);
        // Fetch profiles with their form status
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                id,
                full_name,
                yawanawa_name,
                avatar_url,
                role,
                squads,
                created_at,
                user_forms:user_forms(slug, status, updated_at)
            `)
            .neq('role', 'public') // Only list internal users if desired, or all except public
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
        } else {
            // Need to transform because standard join returns array even if 1:1, but user_forms is 1:1
            const formattedUsers = data.map((u: any) => ({
                ...u,
                user_forms: Array.isArray(u.user_forms) ? u.user_forms[0] : u.user_forms
            }));
            setUsers(formattedUsers);
        }
        setLoading(false);
    };

    const handleSaveUser = async (userId: string, newRole: UserRole, newSquads: string[]) => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole, squads: newSquads })
            .eq('id', userId);

        if (error) {
            console.error('Error updating user:', error);
            alert('Erro ao atualizar usuário');
        } else {
            // Update local state
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, squads: newSquads } : u));
            setEditingUser(null);
        }
    };

    const filteredUsers = users.filter(user => {
        if (filter === 'all') return true;
        if (filter === 'submitted') return user.user_forms?.status === 'submitted';
        if (filter === 'draft') return user.user_forms?.status === 'draft';
        if (filter === 'none') return !user.user_forms;
        return true;
    });

    if (loading || authLoading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Carregando...</div>;

    return (
        <div className="min-h-screen bg-neutral-900 text-white pb-20">
            <nav className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/supadmin')} className="p-2 hover:bg-neutral-800 rounded-lg transition-colors">
                            <ArrowLeft size={24} className="text-neutral-400" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold font-serif">Gestão de Guardiões</h1>
                            <p className="text-xs text-neutral-400">Total: {users.length} usuários</p>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                    <button 
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'all' ? 'bg-white text-neutral-900' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                        Todos ({users.length})
                    </button>
                    <button 
                        onClick={() => setFilter('submitted')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filter === 'submitted' ? 'bg-emerald-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                        <CheckCircle size={14} /> Enviados ({users.filter(u => u.user_forms?.status === 'submitted').length})
                    </button>
                    <button 
                        onClick={() => setFilter('draft')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filter === 'draft' ? 'bg-amber-500 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                        <AlertTriangle size={14} /> Rascunhos ({users.filter(u => u.user_forms?.status === 'draft').length})
                    </button>
                     <button 
                        onClick={() => setFilter('none')}
                        className={`px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap ${filter === 'none' ? 'bg-neutral-600 text-white' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                        Não Iniciado ({users.filter(u => !u.user_forms).length})
                    </button>
                </div>

                <div className="grid gap-4">
                    {filteredUsers.map((user) => (
                        <motion.div 
                            key={user.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-neutral-800/50 border border-neutral-700 rounded-2xl p-6 flex flex-col md:flex-row items-center md:justify-between gap-6 hover:border-neutral-600 transition-all"
                        >
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-14 h-14 rounded-full bg-neutral-700/50 flex-shrink-0 flex items-center justify-center border border-neutral-600 overflow-hidden">
                                     {user.avatar_url ? (
                                         <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                     ) : (
                                        <div className="text-emerald-500 bg-emerald-500/10 w-full h-full flex items-center justify-center">
                                            <User size={28} />
                                        </div>
                                     )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                                        {user.yawanawa_name || user.full_name || 'Usuário Sem Nome'}
                                        {user.role === 'guardiao' && (
                                            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                                                Guardião
                                            </span>
                                        )}
                                    </h3>
                                    {user.yawanawa_name && <p className="text-sm text-neutral-400">{user.full_name}</p>}
                                    <div className="mt-1 flex flex-wrap gap-2">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${user.role === 'guardiao' ? 'bg-neutral-700 text-neutral-400 line-through opacity-50' : 'bg-neutral-700 text-neutral-300'}`}>
                                            {user.role}
                                        </span>
                                        {user.squads && user.squads.length > 0 && user.role === 'guardiao' && (
                                            user.squads.map(sq => (
                                                <span key={sq} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50 capitalize">
                                                    {sq}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-xs text-neutral-500 mb-1">Status do Formulário</p>
                                    {user.user_forms ? (
                                        <div className="flex items-center gap-2 justify-end">
                                            {user.user_forms.status === 'submitted' ? (
                                                <span className="flex items-center gap-1.5 text-emerald-400 text-sm font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">
                                                    <CheckCircle size={14} className="fill-emerald-500 text-neutral-900" /> Enviado
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-amber-500 text-sm font-bold bg-amber-500/10 px-2 py-1 rounded-lg">
                                                    <AlertTriangle size={14} /> Rascunho
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-neutral-600 text-sm">Não Iniciado</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingUser(user)}
                                        className="h-10 w-10 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 text-neutral-300 hover:text-white rounded-xl transition-all shadow-md group"
                                        title="Editar Função/Squads"
                                    >
                                        <Edit size={16} className="group-hover:scale-110 transition-transform" />
                                    </button>

                                    {user.user_forms && (
                                        <button
                                            onClick={() => navigate(`/u/${user.user_forms!.slug}`)}
                                            className="h-10 px-4 flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl transition-all font-bold text-sm shadow-md"
                                        >
                                            <FileText size={16} /> Ver
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </main>

            <EditUserModal 
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                user={editingUser}
                onSave={handleSaveUser}
            />
        </div>
    );
};

export default SupadminUsers;
