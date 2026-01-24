import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { X, Save, Shield, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UserProfile {
    id: string;
    full_name: string;
    role: UserRole;
    squads?: string[];
}

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserProfile | null;
    onSave: (userId: string, newRole: UserRole, newSquads: string[]) => Promise<void>;
}

const AVAILABLE_SQUADS = [
    'mutum_manager', 'squad3', 'squad4', 'squad5', 'squad6', 'squad7', 'squad8', 'squad9'
];

const formatSquadLabel = (squad: string) => {
    if (squad === 'mutum_manager') return 'Mutum (Squad 2)';
    return squad.charAt(0).toUpperCase() + squad.slice(1);
};

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, user, onSave }) => {
    const [role, setRole] = useState<UserRole>('public');
    const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setRole(user.role);
            setSelectedSquads(user.squads || []);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setLoading(true);
        await onSave(user.id, role, selectedSquads);
        setLoading(false);
        onClose();
    };

    const toggleSquad = (squad: string) => {
        if (selectedSquads.includes(squad)) {
            setSelectedSquads(selectedSquads.filter(s => s !== squad));
        } else {
            setSelectedSquads([...selectedSquads, squad]);
        }
    };

    if (!isOpen || !user) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-neutral-800 border border-neutral-700 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
                >
                    <div className="p-6 border-b border-neutral-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Shield size={20} className="text-emerald-500" />
                            Editar Usuário
                        </h2>
                        <button onClick={onClose} className="text-neutral-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">Usuário</label>
                            <div className="p-3 bg-neutral-700/50 rounded-lg text-white font-medium">
                                {user.full_name}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-2">Função (Role)</label>
                            <select 
                                value={role} 
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full bg-neutral-700 border-neutral-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="public">Público</option>
                                <option value="superadmin">Superadmin</option>
                                <option value="otter">Otter (Dev)</option>
                                <option value="mutum_manager">Mutum Manager</option>
                                <option value="sales_viewer">Sales Viewer</option>
                                <option value="guardiao">Guardião</option>
                            </select>
                        </div>

                        {role === 'guardiao' && (
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-neutral-400 flex items-center gap-2">
                                    <Users size={16} /> Squads Atribuídos
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_SQUADS.map(squad => (
                                        <button
                                            key={squad}
                                            onClick={() => toggleSquad(squad)}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left flex items-center justify-between ${
                                                selectedSquads.includes(squad)
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                                    : 'bg-neutral-700/50 text-neutral-400 hover:bg-neutral-700 border border-transparent'
                                            }`}
                                        >
                                            <span className="capitalize">{formatSquadLabel(squad)}</span>
                                            {selectedSquads.includes(squad) && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-neutral-500 mt-2">
                                    O usuário terá acesso ao conteúdo de todos os squads selecionados.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 border-t border-neutral-700 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-neutral-300 hover:bg-neutral-700 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? 'Salvando...' : <><Save size={18} /> Salvar</>}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default EditUserModal;
