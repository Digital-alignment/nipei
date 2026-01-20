import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
    id: string;
    message: string;
    type: string;
    created_at: string;
}

const NotificationToast: React.FC = () => {
    const { user } = useAuth();
    const [notification, setNotification] = useState<Notification | null>(null);

    useEffect(() => {
        if (!user) return;
        const role = user.user_metadata?.role as UserRole;
        if (role !== 'superadmin' && role !== 'otter') return;
        
        // Listen to new notifications
        const channel = supabase
            .channel('db-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `recipient_role=eq.${role}`
                },
                (payload) => {
                    // Show notification
                    setNotification(payload.new as Notification);
                    
                    // Auto hide after 5 seconds
                    setTimeout(() => {
                        setNotification(null);
                    }, 8000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    if (!notification) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, x: 50 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="fixed bottom-6 right-6 z-[100] max-w-sm bg-neutral-900 border border-emerald-500/30 rounded-2xl shadow-2xl p-4 flex items-start gap-4"
            >
                <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-500">
                    <Bell size={24} />
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-emerald-400 text-sm mb-1 uppercase tracking-wider">Nova Atividade</h4>
                    <p className="text-white text-sm leading-relaxed">{notification.message}</p>
                </div>
                <button 
                    onClick={() => setNotification(null)}
                    className="text-neutral-500 hover:text-white"
                >
                    <X size={16} />
                </button>
            </motion.div>
        </AnimatePresence>
    );
};

export default NotificationToast;
