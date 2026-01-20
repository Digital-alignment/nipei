import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, FileText, ChevronDown, UserCircle } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const ProfileMenu: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [slug, setSlug] = useState<string | null>(null);
    const [fullName, setFullName] = useState<string>('');
    const menuRef = useRef<HTMLDivElement>(null);

    const role = user?.user_metadata?.role as UserRole;

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;

            // Get profile name
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .single();
            
            if (profile) setFullName(profile.full_name || user.email || 'Usuário');

            // Get form slug
            const { data: userForm } = await supabase
                .from('user_forms')
                .select('slug')
                .eq('user_id', user.id)
                .single();
            
            if (userForm) setSlug(userForm.slug);
        };

        if (user && role !== 'public') {
            fetchUserData();
        }
    }, [user, role]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (!user || role === 'public') return null;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-2 pr-4 rounded-full bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-emerald-500/50 transition-all group"
            >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg overflow-hidden">
                    {fullName ? (
                        <span className="font-bold text-lg">{fullName.charAt(0).toUpperCase()}</span>
                    ) : (
                        <User size={20} />
                    )}
                </div>
                <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-bold text-neutral-200 leading-tight max-w-[100px] truncate">{fullName}</span>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-500">{role}</span>
                </div>
                <ChevronDown size={16} className={`text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                    >
                        <div className="p-4 border-b border-neutral-800 bg-neutral-800/30">
                            <p className="text-sm font-bold text-white mb-1">{fullName}</p>
                            <p className="text-xs text-neutral-400 break-all">{user.email}</p>
                        </div>

                        <div className="p-2">
                            {slug && (
                                <Link
                                    to={`/u/${slug}`}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-emerald-500/10 text-neutral-300 hover:text-emerald-400 transition-colors mb-1 group"
                                >
                                    <div className="p-2 rounded-lg bg-neutral-800 group-hover:bg-emerald-500/20 transition-colors">
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-bold">Meu Formulário</span>
                                        <span className="text-[10px] text-neutral-500 group-hover:text-emerald-500/70">Editar informações</span>
                                    </div>
                                </Link>
                            )}

                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-500/10 text-neutral-300 hover:text-red-500 transition-colors group"
                            >
                                <div className="p-2 rounded-lg bg-neutral-800 group-hover:bg-red-500/20 transition-colors">
                                    <LogOut size={18} />
                                </div>
                                <span className="text-sm font-bold">Sair</span>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfileMenu;
