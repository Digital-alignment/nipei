import React, { useState, useEffect } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { supabase } from '../../../lib/supabase';
import { Edit2, Check, Plus, User } from 'lucide-react';
import { WorkerSettings, UserRole } from '../../../types';
import { motion } from 'framer-motion';

interface UserProfile {
    id: string;
    full_name: string;
    role: UserRole;
    squads?: string[];
}

const MutumPayroll: React.FC = () => {
    const { workers, updateWorkerSettings, loading } = useFinance();
    const [showAddForm, setShowAddForm] = useState(false);
    
    // Guardian Selection State
    const [availableGuardians, setAvailableGuardians] = useState<UserProfile[]>([]);
    const [selectedUserId, setSelectedUserId] = useState('');
    const [loadingGuardians, setLoadingGuardians] = useState(false);

    // Payment Form State
    const [paymentType, setPaymentType] = useState<WorkerSettings['payment_type']>('production');
    const [fixedSalary, setFixedSalary] = useState<number>(0);
    const [productionRate, setProductionRate] = useState<number>(0);
    const [paymentDate, setPaymentDate] = useState('');

    // Editing State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<WorkerSettings>>({});

    useEffect(() => {
        if (showAddForm) {
            fetchAvailableGuardians();
        }
    }, [showAddForm, workers]);

    const fetchAvailableGuardians = async () => {
        setLoadingGuardians(true);
        // Fetch users who are guardians/mutum_managers
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, role, squads')
            .order('full_name');
        
        if (error) {
            console.error(error);
        } else {
            // Filter: Must be Mutum Guardian AND NOT already in 'workers' list
            const existingWorkerIds = workers.map(w => w.user_id);
            
            const filtered = (data || []).filter((u: any) => {
                const isMutum = (u.role === 'guardiao' && u.squads?.includes('mutum_manager')) || u.role === 'mutum_manager';
                const notRegistered = !existingWorkerIds.includes(u.id);
                return isMutum && notRegistered;
            });
            
            setAvailableGuardians(filtered);
        }
        setLoadingGuardians(false);
    };

    const handleAddPayroll = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) return;

        try {
            await updateWorkerSettings(selectedUserId, {
                payment_type: paymentType,
                fixed_salary: fixedSalary,
                production_rate: productionRate,
                payment_date: paymentDate,
                active: true
            });
            setShowAddForm(false);
            setSelectedUserId('');
            setFixedSalary(0);
            setProductionRate(0);
            setPaymentDate('');
            setPaymentType('production');
            alert('Configuração de pagamento adicionada!');
        } catch (error: any) {
            console.error(error);
            alert('Erro ao salvar: ' + error.message);
        }
    };

    const startEditing = (worker: WorkerSettings) => {
        setEditingId(worker.user_id);
        setEditForm({
            payment_type: worker.payment_type,
            fixed_salary: worker.fixed_salary,
            production_rate: worker.production_rate,
            payment_date: worker.payment_date || '',
            active: worker.active
        });
    };

    const saveEdit = async () => {
        if (!editingId) return;
        try {
            await updateWorkerSettings(editingId, editForm);
            setEditingId(null);
        } catch (error: any) {
            alert('Erro ao atualizar: ' + error.message);
        }
    };

    // Filter workers to only show Mutum related ones?
    // Ideally the API should filter, but for now filtered client side if mixed with others.
    // Assuming 'workers' contains all. We might want to filter by role if possible, but 
    // worker_settings doesn't store role directly (it's joined). 
    // The context join DOES fetch role.
    const mutumWorkers = workers.filter(w => w.role === 'guardiao' || w.role === 'mutum_manager');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold">Folha de Pagamento Mutum</h2>
                    <p className="text-sm text-neutral-400">Configure como cada guardião recebe.</p>
                </div>
                {!showAddForm && (
                     <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors"
                    >
                        <Plus size={16} /> Configurar Novo
                    </button>
                )}
            </div>

            {showAddForm && (
                <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-neutral-800 p-6 rounded-xl border border-emerald-500/30 mb-8"
                >
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="font-bold text-emerald-400">Adicionar Guardião à Folha</h3>
                        <button onClick={() => setShowAddForm(false)} className="text-neutral-500 hover:text-white">Cancelar</button>
                    </div>
                    
                    <form onSubmit={handleAddPayroll} className="space-y-4">
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Guardião (Selecione da lista)</label>
                            {loadingGuardians ? (
                                <div className="text-sm text-neutral-500">Carregando lista...</div>
                            ) : availableGuardians.length === 0 ? (
                                <div className="text-sm text-amber-500">Todos os guardiões do Mutum já estão configurados. Adicione novos usuários na aba "Guardiões".</div>
                            ) : (
                                <select
                                    required
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                >
                                    <option value="">Selecione...</option>
                                    {availableGuardians.map(u => (
                                        <option key={u.id} value={u.id}>
                                            {u.full_name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">Modelo de Pagamento</label>
                                <select
                                    value={paymentType}
                                    onChange={e => setPaymentType(e.target.value as any)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                >
                                    <option value="production">Por Produção</option>
                                    <option value="fixed">Fixo Mensal</option>
                                    <option value="mixed">Misto (Fixo + Produção)</option>
                                </select>
                            </div>
                            
                            {(paymentType === 'fixed' || paymentType === 'mixed') && (
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Salário Fixo (R$)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        value={fixedSalary}
                                        onChange={e => setFixedSalary(Number(e.target.value))}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            )}

                            {(paymentType === 'production' || paymentType === 'mixed') && (
                                <div>
                                    <label className="block text-xs text-neutral-400 mb-1">Taxa de Produção (R$/un)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={productionRate}
                                        onChange={e => setProductionRate(Number(e.target.value))}
                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs text-neutral-400 mb-1">Dia do Pagamento</label>
                                <input
                                    type="date"
                                    placeholder="Selecione uma data"
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                             <button
                                type="submit"
                                disabled={!selectedUserId}
                                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                            >
                                Salvar Configuração
                            </button>
                        </div>
                    </form>
                </motion.div>
            )}

            <div className="grid gap-3">
                {mutumWorkers.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 bg-neutral-800 rounded-xl border border-white/5">
                        Nenhum pagamento configurado ainda.
                    </div>
                ) : (
                    mutumWorkers.map(worker => (
                        <div key={worker.user_id} className="bg-neutral-800 p-4 rounded-xl border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
                                    <User size={20} className="text-neutral-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">{worker.full_name || 'Usuário'}</h3>
                                    <div className="flex items-center gap-2 text-xs text-neutral-400 capitalize">
                                        <span>
                                            {worker.payment_type === 'fixed' ? 'Salário Fixo' : 
                                            worker.payment_type === 'production' ? 'Por Produção' : 'Misto'}
                                        </span>
                                        {worker.payment_date && (
                                            <span className="text-emerald-400 border border-emerald-500/30 px-1.5 rounded bg-emerald-500/10">
                                                {worker.payment_date}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {editingId === worker.user_id ? (
                                <div className="flex-1 bg-neutral-900/50 p-3 rounded-lg border border-emerald-500/30 grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                                    <div>
                                         <label className="block text-[10px] text-neutral-500 mb-1">Tipo</label>
                                         <select
                                            value={editForm.payment_type}
                                            onChange={e => setEditForm({ ...editForm, payment_type: e.target.value as any })}
                                            className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                        >
                                            <option value="production">Produção</option>
                                            <option value="fixed">Fixo</option>
                                            <option value="mixed">Misto</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-neutral-500 mb-1">Fixo (R$)</label>
                                        <input
                                            type="number"
                                            value={editForm.fixed_salary}
                                            onChange={e => setEditForm({ ...editForm, fixed_salary: Number(e.target.value) })}
                                            className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-neutral-500 mb-1">Taxa (R$)</label>
                                        <input
                                            type="number"
                                            value={editForm.production_rate}
                                            onChange={e => setEditForm({ ...editForm, production_rate: Number(e.target.value) })}
                                            className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                        />
                                    </div>
                                     <div>
                                        <label className="block text-[10px] text-neutral-500 mb-1">Data Pagto</label>
                                        <input
                                            type="date"
                                            value={editForm.payment_date || ''}
                                            onChange={e => setEditForm({ ...editForm, payment_date: e.target.value })}
                                            className="w-full bg-neutral-800 text-xs rounded p-1.5 border border-neutral-700"
                                        />
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={saveEdit} className="flex-1 bg-emerald-500 hover:bg-emerald-600 rounded p-1.5 text-white"><Check size={14} className="mx-auto" /></button>
                                        <button onClick={() => setEditingId(null)} className="flex-1 bg-neutral-700 hover:bg-neutral-600 rounded p-1.5 text-white">X</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-6 flex-1 justify-end">
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-400">
                                            {worker.payment_type !== 'production' && <span className="mr-3">R$ {worker.fixed_salary}/mês</span>}
                                            {worker.payment_type !== 'fixed' && <span>R$ {worker.production_rate}/un</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => startEditing(worker)}
                                        className="p-2 bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors text-neutral-400 hover:text-white"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default MutumPayroll;
