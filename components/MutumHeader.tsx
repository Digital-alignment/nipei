import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SunCalc from 'suncalc';
import { LogOut, LayoutDashboard, Bell, ChevronLeft, ChevronRight, Moon } from 'lucide-react';

const MutumHeader: React.FC = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'Guardião';

    // Navigation handlers
    const prevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const nextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    // Moon Calculation
    const getMoonInfo = (date: Date) => {
        const illumination = SunCalc.getMoonIllumination(date);
        const phase = illumination.phase; // 0 - 1
        const fraction = illumination.fraction; // 0 - 1 (illumination percentage)

        let phaseName = '';
        if (phase < 0.03 || phase > 0.97) phaseName = 'Lua Nova';
        else if (phase < 0.25) phaseName = 'Lua Crescente';
        else if (phase < 0.28) phaseName = 'Quarto Crescente';
        else if (phase < 0.47) phaseName = 'Lua Crescente Gibosa';
        else if (phase < 0.53) phaseName = 'Lua Cheia';
        else if (phase < 0.72) phaseName = 'Lua Minguante Gibosa';
        else if (phase < 0.78) phaseName = 'Quarto Minguante';
        else phaseName = 'Lua Minguante';

        // Calculate days to next full moon (approximate relative to phase cycle 0.5)
        // 0.5 is full moon. 
        // If phase < 0.5, it's waxing. Days = (0.5 - phase) * 29.53
        // If phase > 0.5, it's waning. Next full moon is next cycle. Days = (1 - phase + 0.5) * 29.53
        let daysToFull = 0;
        if (phase <= 0.5) {
            daysToFull = (0.5 - phase) * 29.53;
        } else {
            daysToFull = (1.5 - phase) * 29.53;
        }

        return {
            phaseName,
            illumination: Math.round(fraction * 100),
            daysToFull: Math.round(daysToFull)
        };
    };

    const moonInfo = getMoonInfo(currentDate);

    // Format Date: "segunda-feira, 26 de janeiro"
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
    };

    return (
        <div className="bg-neutral-900/50 backdrop-blur-md border-b border-white/5 py-4 px-4 mb-6 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Left Section: User & Date & Moon */}
                <div className="flex flex-col gap-2 w-full md:w-auto">
                    {/* User Greeting */}
                    <div>
                        <p className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-bold mb-1">Produção Mutum</p>
                        <h1 className="text-xl font-bold text-white">
                            Olá, <span className="text-emerald-400">{firstName}</span>
                        </h1>
                    </div>

                    {/* Date Navigator */}
                    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2 w-fit mt-1 border border-white/5">
                        <button onClick={prevDay} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-sm text-white font-medium capitalize min-w-[180px] text-center">
                            {formatDate(currentDate)}
                        </span>
                        <button onClick={nextDay} className="p-1 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Moon Info */}
                    <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 pl-1">
                        <div className="flex items-center gap-1.5 text-purple-300/90" title={`Iluminação: ${moonInfo.illumination}%`}>
                            <Moon size={14} className={moonInfo.illumination > 50 ? "fill-purple-300/20" : ""} />
                            <span className="font-medium">{moonInfo.phaseName}</span>
                            <span className="text-white/20">|</span>
                            <span>{moonInfo.illumination}% Iluminada</span>
                        </div>
                        {moonInfo.daysToFull > 0 && (
                            <>
                                <span className="text-white/20">•</span>
                                <span className="text-neutral-500">
                                    Faltam <span className="text-white font-bold">{moonInfo.daysToFull}</span> dias para a Lua Cheia
                                </span>
                            </>
                        )}
                        {moonInfo.daysToFull === 0 && (
                            <>
                                <span className="text-white/20">•</span>
                                <span className="text-yellow-400 font-bold animate-pulse">
                                    Hoje é Lua Cheia!
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-3 self-end md:self-center">
                    {/* Notification (Placeholder) */}
                    <button 
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:bg-white/10 hover:text-white transition-colors relative group"
                        title="Notificações (Em breve)"
                    >
                        <Bell size={18} />
                        <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                    </button>

                    {/* Guardiao Panel */}
                    <button
                        onClick={() => navigate('/guardiao')}
                        className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                        title="Painel do Guardião"
                    >
                        <LayoutDashboard size={18} />
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
                        title="Sair"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MutumHeader;
