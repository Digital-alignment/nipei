import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Send, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { UserRole } from '../types';

interface DynamicFormProps {
    slug: string;
    userId: string;
    isOwner: boolean;
    isAdmin: boolean;
}

interface FormData {
    fullName: string;
    bio: string;
    phone: string;
    pixParams: string;
    roleCategory: string; // Specific field example
    observations: string;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ slug, userId, isOwner, isAdmin }) => {
    const [formData, setFormData] = useState<FormData>({
        fullName: '',
        bio: '',
        phone: '',
        pixParams: '',
        roleCategory: '',
        observations: ''
    });
    const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchForm = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('user_forms')
                .select('*')
                .eq('slug', slug)
                .single();

            if (data) {
                setFormData({ ...formData, ...data.content });
                setStatus(data.status);
            } else if (error) {
                setError("Erro ao carregar o formulário.");
            }
            setLoading(false);
        };

        fetchForm();
    }, [slug]);

    const handleSave = async (submit = false) => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const newStatus = submit ? 'submitted' : 'draft';
            
            const { error: updateError } = await supabase
                .from('user_forms')
                .update({
                    content: formData,
                    status: newStatus,
                    last_submitted_at: submit ? new Date().toISOString() : undefined,
                    updated_at: new Date().toISOString()
                })
                .eq('slug', slug);

            if (updateError) throw updateError;

            setStatus(newStatus);
            setSuccessMessage(submit ? "Formulário enviado com sucesso!" : "Rascunho salvo.");

        } catch (err) {
            console.error(err);
            setError("Erro ao salvar. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const isReadOnly = !isOwner && !isAdmin;
    // Admins can view/edit everything for now or just view? Request implies "send the form... but they can come back and edit". 
    // And Supadmin receives notification.
    // Let's assume admins can edit too, or at least help. For now, allow edit if Owner or Admin.
    const canEdit = isOwner || isAdmin;

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

    return (
        <div className="bg-neutral-800/50 rounded-3xl border border-neutral-700 p-6 md:p-10 shadow-xl max-w-4xl mx-auto">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-neutral-700 pb-6">
                <div>
                    <h2 className="text-2xl font-bold font-serif text-emerald-400 mb-2">Informações do Guardião</h2>
                    <p className="text-neutral-400 text-sm">
                        {status === 'submitted' ? (
                            <span className="flex items-center gap-2 text-emerald-500"><CheckCircle size={14}/> Enviado e Recebido</span>
                        ) : (
                            <span className="flex items-center gap-2 text-amber-500"><AlertTriangle size={14}/> Rascunho - Não enviado</span>
                        )}
                    </p>
                </div>
                
                {canEdit && (
                    <div className="flex gap-3">
                        <button 
                            onClick={() => handleSave(false)}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl bg-neutral-700 hover:bg-neutral-600 text-white font-bold text-sm transition-all flex items-center gap-2"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                            Salvar Rascunho
                        </button>
                        <button 
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-lg
                                ${status === 'submitted' 
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 hover:bg-emerald-500/30' 
                                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'}`}
                        >
                            <Send size={16}/>
                            {status === 'submitted' ? 'Atualizar Envio' : 'Enviar Formulário'}
                        </button>
                    </div>
                )}
            </header>

            {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2">
                    <CheckCircle size={18} /> {successMessage}
                </div>
            )}
            
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-300">Nome Completo</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                            disabled={!canEdit}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors"
                            placeholder="Seu nome completo"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-neutral-300">Telefone / WhatsApp</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                            disabled={!canEdit}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors"
                            placeholder="(00) 00000-0000"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300">Bio / Apresentação Resumida</label>
                    <textarea
                        value={formData.bio}
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                        disabled={!canEdit}
                        rows={3}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors resize-none"
                        placeholder="Conte um pouco sobre você e sua conexão com a medicina..."
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300">Chave PIX (Para Pagamentos/Reembolsos)</label>
                    <input
                        type="text"
                        value={formData.pixParams}
                        onChange={e => setFormData({...formData, pixParams: e.target.value})}
                        disabled={!canEdit}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors"
                        placeholder="CPF, Email ou Chave Aleatória"
                    />
                </div>
                
                 <div className="space-y-2">
                    <label className="text-sm font-bold text-neutral-300">Observações Extras</label>
                    <textarea
                        value={formData.observations}
                        onChange={e => setFormData({...formData, observations: e.target.value})}
                        disabled={!canEdit}
                        rows={3}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors resize-none"
                        placeholder="Algo mais que devamos saber?"
                    />
                </div>
            </div>
        </div>
    );
};

export default DynamicForm;
