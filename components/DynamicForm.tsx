import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Send, Loader2, CheckCircle, AlertTriangle, ChevronRight, ChevronLeft, Upload, Plus, Trash2 } from 'lucide-react';
import { UserRole } from '../types';
import { FORM_CONFIG } from '../constants/formConfig';

interface DynamicFormProps {
    slug: string;
    userId: string;
    isOwner: boolean;
    isAdmin: boolean;
}

const DynamicForm: React.FC<DynamicFormProps> = ({ slug, userId, isOwner, isAdmin }) => {
    // State for form data - initialized as empty object, will grow dynamic
    const [formData, setFormData] = useState<any>({});
    const [status, setStatus] = useState<'draft' | 'submitted'>('draft');
    
    // UI State
    const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null); // Key of field being uploaded
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const currentSection = FORM_CONFIG.sections[currentSectionIndex];
    const isLastSection = currentSectionIndex === FORM_CONFIG.sections.length - 1;
    const canEdit = isOwner || isAdmin;

    useEffect(() => {
        fetchForm();
    }, [slug]);

    const fetchForm = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('user_forms')
            .select('*')
            .eq('slug', slug)
            .single();

        if (data) {
            setFormData(data.content || {});
            setStatus(data.status);
        } else if (error) {
            setError("Erro ao carregar o formulário.");
        }
        setLoading(false);
    };

    const handleInputChange = (key: string, value: any, parentKey?: string, index?: number) => {
        if (!canEdit) return;

        if (parentKey && typeof index === 'number') {
            // Check if it's a repeater field update
            const list = formData[parentKey] || [];
            const updatedList = [...list];
            updatedList[index] = { ...(updatedList[index] || {}), [key]: value };
            setFormData({ ...formData, [parentKey]: updatedList });
        } else if (parentKey) {
            // Group update
            const group = formData[parentKey] || {};
            setFormData({ ...formData, [parentKey]: { ...group, [key]: value } });
        } else {
            // Direct update
            setFormData({ ...formData, [key]: value });
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        if (!e.target.files || e.target.files.length === 0) return;
        
        const file = e.target.files[0];
        setUploading(key);
        
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            
            handleInputChange(key, data.publicUrl);
            
            // If it's the profile photo, we might want to sync immediately or just wait for save
        } catch (error) {
            console.error('Error uploading image:', error);
            setError('Erro ao fazer upload da imagem.');
        } finally {
            setUploading(null);
        }
    };

    const handleSave = async (submit = false) => {
        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Keep status as 'submitted' if it was already submitted, or change to 'submitted' if submitting now
            const newStatus = submit ? 'submitted' : (status === 'submitted' ? 'submitted' : 'draft');
            
            // 1. Update Form Data
            const { error: updateError } = await supabase
                .from('user_forms')
                .update({
                    content: formData,
                    status: newStatus,
                    last_submitted_at: submit ? new Date().toISOString() : undefined,
                    updated_at: new Date().toISOString() // Always update this
                })
                .eq('slug', slug);

            if (updateError) throw updateError;

            // 2. Profile Sync
            const syncUpdates: any = {};
            if (formData.profile_photo) syncUpdates.avatar_url = formData.profile_photo;
            if (formData.nome_yawanawa) syncUpdates.yawanawa_name = formData.nome_yawanawa;
            if (formData.contatos?.telefone) syncUpdates.phone = formData.contatos.telefone; 
            
            if (formData.nome_civil && formData.sobrenome) {
                syncUpdates.full_name = `${formData.nome_civil} ${formData.sobrenome}`;
            }

            if (Object.keys(syncUpdates).length > 0) {
                 await supabase
                    .from('profiles')
                    .update(syncUpdates)
                    .eq('id', userId);
            }

            setStatus(newStatus);
            
            if(submit) {
                setSuccessMessage("Jornada finalizada com sucesso!");
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // We keep the view on the form or switch to a 'Success' mode? 
                // User requested: "lets create a page that says: Muito obrigado..."
            } else {
                 setSuccessMessage("Progresso salvo.");
            }

        } catch (err) {
            console.error(err);
            setError("Erro ao salvar. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };
    


    // New Success View Logic
    if (successMessage === "Jornada finalizada com sucesso!" && status === 'submitted') {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-700">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                    <CheckCircle size={48} className="text-emerald-400" />
                </div>
                <h2 className="text-3xl font-bold font-serif text-white mb-4">Gratidão por sua entrega, Guardião!</h2>
                <p className="text-neutral-400 max-w-md mb-8">Suas respostas foram recebidas com carinho. Agora, seus dados estão seguros e nos ajudarão a co-criar este santuário.</p>
                
                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
                    <button 
                        onClick={() => window.location.href = '/'} // Or navigate('/')
                        className="flex-1 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl font-bold transition-all border border-neutral-700"
                    >
                        Voltar a Home
                    </button>
                    <button 
                        onClick={() => window.open('https://wa.me/YOUR_SUGGESTION_NUMBER', '_blank')}
                        className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-900/20"
                    >
                        Enviar Sugestão
                    </button>
                    
                     <button 
                         onClick={() => setSuccessMessage(null)} 
                         className="flex-1 sm:hidden text-xs text-neutral-500 mt-2 hover:text-neutral-300 underline"
                    >
                        Voltar para o formulário (Editar)
                    </button>
                </div>
                 <button 
                     onClick={() => setSuccessMessage(null)} 
                     className="hidden sm:block text-sm text-neutral-500 mt-8 hover:text-neutral-300 underline"
                >
                    Voltar para visualizar/editar respostas
                </button>
            </div>
        );
    }

    const renderField = (field: any, parentKey?: string, index?: number) => {
        // Resolve current value based on hierarchy
        let value: any = '';
        if (parentKey && typeof index === 'number') {
            value = formData[parentKey]?.[index]?.[field.key] || '';
        } else if (parentKey) {
            value = formData[parentKey]?.[field.key] || '';
        } else {
            value = formData[field.key] || '';
        }

        const handleChange = (val: any) => handleInputChange(field.key, val, parentKey, index);

        switch (field.type) {
            case 'text':
            case 'email':
            case 'tel':
            case 'number':
            case 'date':
            case 'color_picker':
                return (
                    <input
                        type={field.type === 'color_picker' ? 'color' : field.type}
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={!canEdit}
                        placeholder={field.placeholder}
                        className={`w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors ${field.type === 'color_picker' ? 'h-12 w-24 p-1' : ''}`}
                    />
                );
            case 'text_area':
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={!canEdit}
                        rows={4}
                        placeholder={field.placeholder}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors resize-none"
                    />
                );
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        disabled={!canEdit}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 focus:border-emerald-500 outline-none transition-colors"
                    >
                        <option value="">Selecione...</option>
                        {field.options?.map((opt: string) => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );
            case 'radio':
                return (
                    <div className="space-y-2">
                        {field.options?.map((opt: any) => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const detail = typeof opt === 'string' ? null : opt.detail;
                            return (
                                <label key={label} className={`flex items-start gap-3 p-3 rounded-xl border ${value === label ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-700 bg-neutral-800/30'} cursor-pointer hover:bg-neutral-800 transition-all`}>
                                    <input
                                        type="radio"
                                        name={`${field.key}-${parentKey || 'root'}-${index || '0'}`}
                                        value={label}
                                        checked={value === label}
                                        onChange={() => handleChange(label)}
                                        disabled={!canEdit}
                                        className="mt-1"
                                    />
                                    <div>
                                        <span className="font-medium text-neutral-200">{label}</span>
                                        {detail && <p className="text-xs text-neutral-400 mt-1">{detail}</p>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'checkbox_group':
                return (
                     <div className="space-y-2">
                        {field.options?.map((opt: any) => {
                            const label = typeof opt === 'string' ? opt : opt.label;
                            const id = typeof opt === 'string' ? opt : opt.id;
                            const detail = typeof opt === 'string' ? null : opt.detail;
                            const currentValues = Array.isArray(value) ? value : [];
                            const isChecked = currentValues.includes(label);

                            return (
                                <label key={id} className={`flex items-start gap-3 p-3 rounded-xl border ${isChecked ? 'border-emerald-500 bg-emerald-500/10' : 'border-neutral-700 bg-neutral-800/30'} cursor-pointer hover:bg-neutral-800 transition-all`}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleChange([...currentValues, label]);
                                            } else {
                                                handleChange(currentValues.filter((v: string) => v !== label));
                                            }
                                        }}
                                        disabled={!canEdit}
                                        className="mt-1"
                                    />
                                    <div>
                                        <span className="font-medium text-neutral-200">{label}</span>
                                        {detail && <p className="text-xs text-neutral-400 mt-1">{detail}</p>}
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'file_upload':
                return (
                    <div className="space-y-2">
                        {value && (
                           <div className="relative w-32 h-32 rounded-full overflow-hidden border-2 border-emerald-500 mb-4">
                               <img src={value} alt="Preview" className="w-full h-full object-cover" />
                           </div>
                        )}
                        <label className="flex items-center gap-2 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-xl cursor-pointer border border-dashed border-neutral-600 hover:border-emerald-500 transition-all w-full max-w-sm justify-center">
                            {uploading === field.key ? <Loader2 size={20} className="animate-spin text-emerald-500"/> : <Upload size={20} className="text-neutral-400"/>}
                            <span className="text-neutral-300 text-sm font-medium">{value ? 'Alterar Foto' : 'Carregar Arquivo'}</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e, field.key)}
                                disabled={!canEdit || !!uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                );
            case 'slider_range':
                return (
                   <div className="px-2 py-4">
                       <input 
                           type="range" 
                           min="0" max="100" 
                           value={value || 50} 
                           onChange={(e) => handleChange(e.target.value)}
                           disabled={!canEdit}
                           className="w-full h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                       />
                       <div className="flex justify-between text-xs text-neutral-400 mt-2">
                           <span>{field.min_label}</span>
                           <span>{field.max_label}</span>
                       </div>
                   </div> 
                );
            case 'repeater':
                 const items = formData[field.key] || [{}]; // Start with one item
                 return (
                     <div className="space-y-4">
                         {items.map((_: any, i: number) => (
                             <div key={i} className="p-4 border border-neutral-700 rounded-xl bg-neutral-800/20 relative">
                                 <div className="absolute right-4 top-4">
                                     {items.length > (field.min_items || 1) && (
                                         <button onClick={() => {
                                             const newItems = items.filter((__, idx) => idx !== i);
                                             setFormData({ ...formData, [field.key]: newItems });
                                         }} className="text-red-500 hover:text-red-400"><Trash2 size={16}/></button>
                                     )}
                                 </div>
                                 <h5 className="font-bold text-neutral-400 text-xs uppercase mb-3">Item {i + 1}</h5>
                                 <div className="grid gap-4">
                                     {field.fields.map((subField: any) => (
                                         <div key={subField.key}>
                                             <label className="text-sm font-bold text-neutral-300 mb-1 block">{subField.label}</label>
                                             {renderField(subField, field.key, i)}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         ))}
                         {items.length < (field.max_items || 5) && (
                             <button 
                                 onClick={() => setFormData({ ...formData, [field.key]: [...items, {}] })}
                                 className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-bold"
                             >
                                 <Plus size={16} /> Adicionar Item
                             </button>
                         )}
                     </div>
                 );
            case 'group':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {field.fields.map((subField: any) => (
                            <div key={subField.key} className="space-y-1">
                                <label className="text-sm font-bold text-neutral-300">{subField.label}</label>
                                {renderField(subField, field.key)}
                            </div>
                        ))}
                    </div>
                );
            case 'section_title':
                return (
                    <div className="mt-6 mb-2 pt-4 border-t border-neutral-700/50">
                        <h4 className="text-xl font-bold text-emerald-400 font-serif">{field.label}</h4>
                        {field.description && <p className="text-sm text-neutral-400">{field.description}</p>}
                    </div>
                );
            default:
                return null;
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-500" size={32}/></div>;

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Header / Intro */}
             <div className="mb-8 text-center md:text-left">
                <h2 className="text-3xl font-bold font-serif text-white mb-2">{FORM_CONFIG.ui_config.welcome_message.title}</h2>
                <p className="text-neutral-400 max-w-2xl">{FORM_CONFIG.ui_config.welcome_message.text}</p>
            </div>

            {/* Status Bar */}
            <div className="bg-neutral-800/50 rounded-xl p-4 mb-8 flex items-center justify-between border border-neutral-700">
                <div className="flex items-center gap-3">
                    {status === 'submitted' ? (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20">
                            <CheckCircle size={16}/> <span className="font-bold text-sm">Enviado</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                            <AlertTriangle size={16}/> <span className="font-bold text-sm">Rascunho</span>
                        </div>
                    )}
                </div>
                 {canEdit && <div className="flex gap-2">
                    <button onClick={() => handleSave(false)} disabled={saving} className="text-neutral-400 hover:text-white px-3 py-1 text-sm font-medium flex items-center gap-2">
                        {saving ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>} Salvar
                    </button>
                 </div>}
            </div>

            {/* Error/Success Messages */}
             {successMessage && (
                <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2 animate-pulse">
                    <CheckCircle size={18} /> {successMessage}
                </div>
            )}
            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Wizard Navigation Tabs */}
            <div className="flex overflow-x-auto gap-2 mb-8 pb-2 no-scrollbar">
                {FORM_CONFIG.sections.map((sec: any, idx: number) => (
                    <button
                        key={sec.id}
                        onClick={() => {
                            setCurrentSectionIndex(idx);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all
                            ${currentSectionIndex === idx 
                                ? 'bg-emerald-500 text-neutral-900 shadow-lg shadow-emerald-500/20' 
                                : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'}`}
                    >
                        {sec.title}
                    </button>
                ))}
            </div>

            {/* Dynamic Content Area */}
            <div className="bg-neutral-800/30 rounded-3xl border border-neutral-700 p-6 md:p-10 shadow-2xl min-h-[400px]">
                <div className="mb-8">
                    <h3 className="text-2xl font-bold text-emerald-400 font-serif mb-2">{currentSection.title}</h3>
                    <p className="text-neutral-400">{currentSection.description}</p>
                </div>

                <div className="space-y-8">
                    {currentSection.fields.map((field: any) => (
                        <div key={field.key} className="space-y-2">
                            {field.type !== 'group' && field.type !== 'repeater' && (
                                <div className="flex justify-between">
                                    <label className="text-sm font-bold text-neutral-300">
                                        {field.label} {field.required && <span className="text-red-400">*</span>}
                                    </label>
                                </div>
                            )}
                            {field.description && <p className="text-xs text-neutral-500 mb-2">{field.description}</p>}
                            
                            {renderField(field)}
                        </div>
                    ))}
                </div>

                {/* Footer Navigation */}
                <div className="mt-12 pt-8 border-t border-neutral-700 flex justify-between items-center">
                    <button
                        onClick={() => {
                            setCurrentSectionIndex(prev => Math.max(0, prev - 1));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        disabled={currentSectionIndex === 0}
                        className="flex items-center gap-2 text-neutral-400 hover:text-white disabled:opacity-30 disabled:hover:text-neutral-400 px-4 py-2 rounded-xl transition-colors"
                    >
                        <ChevronLeft size={20} /> Anterior
                    </button>

                    {isLastSection ? (
                        <button
                            onClick={() => handleSave(true)}
                            disabled={saving}
                            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/20 transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:transform-none"
                        >
                            {saving ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} />}
                            {status === 'submitted' ? 'Atualizar Envio' : 'Finalizar Jornada'}
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setCurrentSectionIndex(prev => Math.min(FORM_CONFIG.sections.length - 1, prev + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 bg-neutral-700 hover:bg-neutral-600 text-white font-bold px-6 py-3 rounded-xl transition-all"
                        >
                            Próximo <ChevronRight size={20} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DynamicForm;

