import React, { useState } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { Plus, Trash2, TrendingDown, TrendingUp, AlertCircle } from 'lucide-react';
import { Expense } from '../../../types';

const CostDashboard: React.FC = () => {
    const { expenses, addExpense, deleteExpense, getTotalExpenses } = useFinance();
    const [showForm, setShowForm] = useState(false);

    // New Expense State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<Expense['category']>('other');
    const [recurrence, setRecurrence] = useState('');

    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addExpense({
                description,
                amount: Number(amount),
                category,
                recurrence: recurrence || undefined,
                date: new Date().toISOString()
            });
            setShowForm(false);
            setDescription('');
            setAmount('');
            setCategory('other');
            setRecurrence('');
        } catch (error) {
            alert('Erro ao adicionar despesa');
        }
    };

    const total = getTotalExpenses();

    return (
        <div className="space-y-8">
            {/* Header Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-neutral-800 p-6 rounded-xl border border-white/5">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1">Custo Total (Mês Atual)</h3>
                    <div className="text-3xl font-bold text-white flex items-center gap-2">
                        R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <TrendingDown className="text-red-400 h-5 w-5" />
                    </div>
                </div>
                <div className="bg-neutral-800 p-6 rounded-xl border border-white/5">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1">Fundo de Reserva</h3>
                    <div className="text-3xl font-bold text-white flex items-center gap-2">
                        R$ 15.240,00
                        <TrendingUp className="text-emerald-400 h-5 w-5" />
                    </div>
                </div>
                <div className="bg-neutral-800 p-6 rounded-xl border border-white/5">
                    <h3 className="text-neutral-400 text-sm font-medium mb-1">Status do Ciclo</h3>
                    <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                        Semana de Produção (Lua Cheia)
                    </div>
                    <p className="text-xs text-neutral-500 mt-2">Atenção para compra de Vidros Âmbar</p>
                </div>
            </div>

            {/* Expenses List */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Registro de Despesas</h2>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-bold text-sm transition-colors"
                    >
                        <Plus size={16} /> Nova Despesa
                    </button>
                </div>

                {showForm && (
                    <form onSubmit={handleAddExpense} className="bg-neutral-800 p-4 rounded-xl mb-6 border border-white/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                        <div className="lg:col-span-2">
                            <label className="block text-xs text-neutral-400 mb-1">Descrição</label>
                            <input
                                required
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                placeholder="Ex: Compra de Álcool Orgânico"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Valor (R$)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-400 mb-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value as any)}
                                className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 outline-none"
                            >
                                <option value="raw_material">Insumos</option>
                                <option value="logistics">Logística</option>
                                <option value="marketing">Marketing</option>
                                <option value="fixed">Fixo</option>
                                <option value="other">Outros</option>
                            </select>
                        </div>
                        <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-lg transition-colors h-[38px]">
                            Salvar
                        </button>
                    </form>
                )}

                <div className="bg-neutral-800 rounded-xl border border-white/5 overflow-hidden">
                    <table className="w-full text-left text-sm text-neutral-400">
                        <thead className="bg-neutral-900 text-neutral-500 font-medium border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Data</th>
                                <th className="px-6 py-4">Descrição</th>
                                <th className="px-6 py-4">Categoria</th>
                                <th className="px-6 py-4 text-right">Valor</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center opacity-50">
                                        Nenhuma despesa registrada.
                                    </td>
                                </tr>
                            ) : (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-white">{expense.description}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-white/5 text-xs border border-white/10 uppercase tracking-wider">
                                                {expense.category === 'raw_material' ? 'Insumos' :
                                                    expense.category === 'fixed' ? 'Custo Fixo' : expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-white">
                                            R$ {Number(expense.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 flex justify-center">
                                            <button
                                                onClick={() => deleteExpense(expense.id)}
                                                className="text-neutral-500 hover:text-red-400 transition-colors p-2"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CostDashboard;
