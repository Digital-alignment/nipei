import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { TreePine, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

import { UserRole } from '../types';

const Login: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<UserRole>('public');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Fetch the role consistently from the profiles table
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.session?.user?.id)
                    .single();

                // Fallback to metadata if profile fetch fails or role is missing (though profile reference is safer)
                const userRole = profileData?.role || data.session?.user?.user_metadata?.role as UserRole;
                
                if (userRole === 'mutum_manager') {
                    navigate('/inventory');
                } else if (userRole === 'superadmin' || userRole === 'otter') {
                    navigate('/supadmin');
                } else if (userRole === 'guardiao') {
                    navigate('/guardiao');
                } else {
                    navigate('/'); // Default for public/squads for now
                }
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            role: role
                        }
                    }
                });
                if (error) throw error;
                setSuccessMessage('Conta criada com sucesso! Verifique seu email para confirmar ou faça login se a confirmação não for necessária.');
                setIsLogin(true); // Switch back to login
            }
        } catch (err: any) {
            console.error('Registration/Login Error:', err);
            setError(err.message || 'Erro ao realizar autenticação.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-neutral-800 p-8 rounded-3xl border border-neutral-700 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-500 mb-4">
                        <TreePine size={40} />
                    </div>
                    <h1 className="text-2xl font-serif text-white mb-2">{isLogin ? 'Acesso Restrito' : 'Criar Conta'}</h1>
                    <p className="text-neutral-400">{isLogin ? 'Entre para gerenciar o catálogo' : 'Preencha os dados para se registrar'}</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6 text-sm">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl mb-6 text-sm">
                        {successMessage}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    {!isLogin && (
                        <>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                                    placeholder="Seu Nome"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-neutral-400 mb-2">Tipo de Conta</label>
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value as UserRole)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors appearance-none"
                                >
                                    <option value="public">Visitante (Público)</option>
                                    <option value="guardiao">Guardião</option>
                                    <option value="superadmin">Superadmin</option>
                                </select>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="seu@email.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-neutral-400 mb-2">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="••••••••"
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : (isLogin ? 'Entrar' : 'Cadastrar')}
                    </button>
                </form>

                <div className="mt-6 text-center space-y-4">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-emerald-500 hover:text-emerald-400 text-sm font-medium transition-colors"
                    >
                        {isLogin ? 'Não tem uma conta? Crie agora' : 'Já tem uma conta? Entre aqui'}
                    </button>

                    <Link to="/" className="text-neutral-500 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors block">
                        <ArrowLeft size={16} /> Voltar para o site
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
