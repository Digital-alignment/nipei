import React, { useState } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { UserPlus, Edit2, Check, X } from 'lucide-react';
import { WorkerSettings } from '../../../types';

const WorkerManagement: React.FC = () => {
    const { workers, updateWorkerSettings, createWorkerUser, updateWorkerUser, loading } = useFinance();
    const [showAddForm, setShowAddForm] = useState(false);

    // New User State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState('inventory_manager');
    const [creating, setCreating] = useState(false);

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<WorkerSettings>>({});
    const [editAuth, setEditAuth] = useState<{ email: string, full_name: string, role: string, password?: string }>({ email: '', full_name: '', role: '' });

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await createWorkerUser(email, password, role, fullName);
            setShowAddForm(false);
            setEmail('');
            setPassword('');
            setFullName('');
            alert('Guardião adicionado com sucesso!');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao criar usuário: ' + (error.message || 'Erro desconhecido. Verifique se você está logado como admin e a Edge Function está implantada.'));
            if (error.message?.includes('401')) {
                alert('Sessão expirada ou sem permissão. Tente fazer login novamente.');
            }
        } finally {
            setCreating(false);
        }
    };

    const startEditing = (worker: WorkerSettings) => {
        setEditingId(worker.user_id);
        // We might not have email directly in worker_settings joins unless we select it, 
        // but let's assume workers now fetches profile data.
        // If we don't have email in the join, we can't pre-fill it easily without another fetch.
        // For now, let's prefill what we have.
        // Note: The current fetchWorkers does NOT return email. 
        // We will need to update fetchWorkers or accept empty email.
        // Ideally we update fetchWorkers in FinanceContext too.

        setEditForm({
            payment_type: worker.payment_type,
            fixed_salary: worker.fixed_salary,
            production_rate: worker.production_rate,
            active: worker.active
        });

        setEditAuth({
            email: '', // Requires fetch update to populate
            full_name: worker.full_name || '',
            role: worker.role || 'inventory_manager',
            password: ''
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            // Update Settings
            await updateWorkerSettings(editingId, editForm);

            // Update Auth/Profile
            // Only if something changed
            if (editAuth.full_name || editAuth.role || editAuth.email || editAuth.password) {
                await updateWorkerUser(editingId, {
                    email: editAuth.email || undefined,
                    password: editAuth.password || undefined,
                    full_name: editAuth.full_name,
                    role: editAuth.role
                });
            }

            setEditingId(null);
            alert('Configurações atualizadas!');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao atualizar: ' + error.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Guardiões da Floresta</h2>
                    <p className="text-sm text-neutral-400">Gerencie a equipe e suas configurações de pagamento.</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors"
                >
                    <UserPlus size={16} /> Novo Guardião
                </button>
            </div>

            {showAddForm && (
                <div className="bg-neutral-800 p-6 rounded-xl border border-emerald-500/30 mb-8">
                    <h3 className="font-bold mb-4">Cadastrar Novo Membro</h3>
                    <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Nome Completo</label>
                            <input
                                required
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Email</label>
                            <input
                                required
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Senha Provisória</label>
                            <input
                                required
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Função</label>
                            <select
                                value={role}
                                onChange={e => setRole(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            >
                                <option value="inventory_manager">Gerente de Estoque (Mutum)</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                {creating ? 'Criando...' : 'Cadastrar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-8 opacity-50">Carregando guardiões...</div>
                ) : workers.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 bg-neutral-800 rounded-xl border border-white/5">
                        Nenhum guardião configurado. Adicione o primeiro acima.
                    </div>
                ) : (
                    workers.map(worker => (
                        <div key={worker.user_id} className="bg-neutral-800 p-6 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-white/10 transition-colors">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-white">{worker.full_name || 'Usuário Sem Nome'}</h3>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${worker.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                                        {worker.role === 'inventory_manager' ? 'Mutum' : 'Admin'}
                                    </span>
                                    {worker.active ? (
                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
                                    ) : (
                                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">Inativo</span>
                                    )}
                                </div>
                                <p className="text-sm text-neutral-500">
                                    Pagamento: <span className="text-neutral-300 font-medium">
                                        {worker.payment_type === 'fixed' ? 'Fixo Mensal' :
                                            worker.payment_type === 'production' ? 'Por Produção' : 'Misto'}
                                    </span>
                                </p>
                            </div>

                            {editingId === worker.user_id ? (
                                <div className="flex-1 space-y-3 bg-neutral-900/50 p-4 rounded-lg border border-white/10">
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                                        <h4 className="text-xs font-bold text-emerald-400 uppercase">Editar Dados Pessoais</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Nome Completo</label>
                                            <input
                                                value={editAuth.full_name}
                                                onChange={e => setEditAuth({ ...editAuth, full_name: e.target.value })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={editAuth.email}
                                                onChange={e => setEditAuth({ ...editAuth, email: e.target.value })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Nova Senha (Opcional)</label>
                                            <input
                                                type="text"
                                                placeholder="Deixe em branco para manter"
                                                value={editAuth.password}
                                                onChange={e => setEditAuth({ ...editAuth, password: e.target.value })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Função (Role)</label>
                                            <select
                                                value={editAuth.role}
                                                onChange={e => setEditAuth({ ...editAuth, role: e.target.value })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700 focus:border-emerald-500 outline-none"
                                            >
                                                <option value="inventory_manager">Mutum</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                                        <h4 className="text-xs font-bold text-emerald-400 uppercase">Editar Pagamento</h4>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Tipo</label>
                                            <select
                                                value={editForm.payment_type}
                                                onChange={e => setEditForm({ ...editForm, payment_type: e.target.value as any })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                            >
                                                <option value="fixed">Fixo</option>
                                                <option value="production">Produção</option>
                                                <option value="mixed">Misto</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Salário Fixo</label>
                                            <input
                                                type="number"
                                                value={editForm.fixed_salary}
                                                onChange={e => setEditForm({ ...editForm, fixed_salary: Number(e.target.value) })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-neutral-500 uppercase mb-1">Taxa (R$/un)</label>
                                            <input
                                                type="number"
                                                value={editForm.production_rate}
                                                onChange={e => setEditForm({ ...editForm, production_rate: Number(e.target.value) })}
                                                className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setEditingId(null)} className="px-3 py-1 bg-neutral-700 rounded hover:bg-neutral-600 text-neutral-300 text-xs">Cancelar</button>
                                        <button onClick={saveEdit} className="px-3 py-1 bg-emerald-500 rounded hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"><Check size={12} /> Salvar Alterações</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-xs text-neutral-500 uppercase tracking-widest">Compensação</p>
                                        <div className="font-mono text-emerald-400">
                                            {worker.payment_type !== 'production' && (
                                                <div>Fix: R$ {worker.fixed_salary}</div>
                                            )}
                                            {worker.payment_type !== 'fixed' && (
                                                <div>Prod: R$ {worker.production_rate}/un</div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => startEditing(worker)}
                                            className="p-2 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-400 hover:text-white"
                                            title="Editar Dados e Pagamento"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default WorkerManagement;
