import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { UserRole } from '../../../types';
import { User, Shield, Edit, Plus, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import EditUserModal from '../EditUserModal';

interface UserProfile {
    id: string;
    full_name: string;
    yawanawa_name?: string;
    avatar_url?: string;
    role: UserRole;
    squads?: string[];
    created_at: string;
}

const MutumGuardians: React.FC = () => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('full_name');
        
        if (error) {
            console.error('Error fetching users:', error);
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

    // Filter Logic
    const mutumGuardians = users.filter(u => 
        (u.role === 'guardiao' && u.squads?.includes('mutum_manager')) || 
        u.role === 'mutum_manager'
    );

    const availableGuardians = users.filter(u => 
        u.role === 'guardiao' && !u.squads?.includes('mutum_manager')
    );

    const handleAddGuardianToSquad = async () => {
        if (!selectedUserIdToAdd) return;
        
        const user = users.find(u => u.id === selectedUserIdToAdd);
        if (!user) return;

        const currentSquads = user.squads || [];
        const newSquads = [...currentSquads, 'mutum_manager'];

        const { error } = await supabase
            .from('profiles')
            .update({ squads: newSquads })
            .eq('id', user.id);

        if (error) {
            alert('Erro ao adicionar guardião ao squad.');
            console.error(error);
        } else {
            // Update local state
            setUsers(users.map(u => u.id === user.id ? { ...u, squads: newSquads } : u));
            setIsAdding(false);
            setSelectedUserIdToAdd('');
        }
    };

    const handleRemoveFromSquad = async (user: UserProfile) => {
        if (!confirm(`Remover ${user.full_name} do Squad Mutum?`)) return;

        // If they are strictly mutum_manager role, maybe we shouldn't remove? 
        // Logic: specific request "select a guardiao under mutum".
        // If role is guardiao, remove 'mutum_manager' from squads.
        
        let newSquads = user.squads?.filter(s => s !== 'mutum_manager') || [];
        
        const { error } = await supabase
            .from('profiles')
            .update({ squads: newSquads })
            .eq('id', user.id);

        if (error) {
            alert('Erro ao remover.');
        } else {
             setUsers(users.map(u => u.id === user.id ? { ...u, squads: newSquads } : u));
        }
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
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole, squads: newSquads } : u));
            setEditingUser(null);
        }
    };

    if (loading) return <div className="text-center py-10 opacity-50">Carregando...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold">Guardiões do Mutum</h3>
                    <p className="text-sm text-neutral-400">Gerencie quem tem acesso a este squad.</p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors"
                >
                    <Plus size={16} /> Adicionar Guardião
                </button>
            </div>

            {isAdding && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-800 p-4 rounded-xl border border-emerald-500/30 mb-6"
                >
                    <h4 className="font-bold text-sm mb-3 text-emerald-400">Selecionar Guardião Existente</h4>
                    <div className="flex gap-2">
                        <select
                            value={selectedUserIdToAdd}
                            onChange={e => setSelectedUserIdToAdd(e.target.value)}
                            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                        >
                            <option value="">Selecione um usuário...</option>
                            {availableGuardians.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.full_name} ({u.yawanawa_name || 'Sem nome Yawanawa'})
                                </option>
                            ))}
                        </select>
                        <button 
                            onClick={handleAddGuardianToSquad}
                            disabled={!selectedUserIdToAdd}
                            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold text-sm"
                        >
                            Adicionar
                        </button>
                    </div>
                </motion.div>
            )}

            <div className="grid gap-3">
                {mutumGuardians.length === 0 ? (
                     <div className="text-center py-10 text-neutral-500 bg-neutral-800/30 rounded-xl border border-neutral-800">
                        Nenhum guardião atribuído ao Mutum.
                    </div>
                ) : (
                    mutumGuardians.map(user => (
                        <div key={user.id} className="bg-neutral-800 p-4 rounded-xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden">
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={20} className="text-neutral-400" />
                                    )}
                                </div>
                                <div>
                                    <h4 className="font-bold">{user.full_name}</h4>
                                    <p className="text-xs text-neutral-400">{user.yawanawa_name || 'Sem nome espiritual'}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setEditingUser(user)}
                                    className="p-2 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
                                    title="Editar Usuário"
                                >
                                    <Edit size={16} />
                                </button>
                                {user.role === 'guardiao' && (
                                    <button
                                        onClick={() => handleRemoveFromSquad(user)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-500 transition-colors"
                                        title="Remover do Squad"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <EditUserModal 
                isOpen={!!editingUser}
                onClose={() => setEditingUser(null)}
                user={editingUser}
                onSave={handleSaveUser}
            />
        </div>
    );
};

export default MutumGuardians;
