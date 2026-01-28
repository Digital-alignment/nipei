import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import SunCalc from 'suncalc';
import { LogOut, LayoutDashboard, Bell, ChevronLeft, ChevronRight, Moon } from 'lucide-react';

// Moon Icon Component (Southern Hemisphere View)
const DynamicMoonIcon: React.FC<{ phase: number }> = ({ phase }) => {
    // Phase: 0 = New, 0.5 = Full, 1.0 = New
    // Southern Hemisphere (Brazil):
    // Waxing (0 < p < 0.5): Light on Left ("C" shape - Crescente)
    // Waning (0.5 < p < 1): Light on Right ("D" shape - Decrescente)

    // Simplified 8-phase logic for visual clarity
    const getPath = () => {
        // New Moon (0)
        if (phase < 0.03 || phase > 0.97) return <circle cx="12" cy="12" r="10" className="fill-neutral-800 stroke-neutral-700" strokeWidth="1" />;

        // Full Moon (0.5)
        if (phase >= 0.47 && phase <= 0.53) return <circle cx="12" cy="12" r="10" className="fill-yellow-100 stroke-yellow-200" strokeWidth="1" />;

        // For intermediate phases, use SVG masks or paths
        // We'll use a simple "lit" path approach.
        // Base is dark. We draw the light part.
        
        let d = "";
        
        // Waxing (Growing) - Light on Left for South Hemisphere
        if (phase < 0.5) {
            if (phase < 0.25) {
                 // Waxing Crescent (Light is a crescent on the Left)
                 // Start top (12, 2), arc to bottom (12, 22), curve back via control point
                 // Simple crescent approx: Outer arc (circle), Inner arc (ellipse)
                 return (
                    <g>
                        <circle cx="12" cy="12" r="10" className="fill-neutral-800 stroke-none" />
                        <path d="M12,2 A10,10 0 0,0 12,22 A6,10 0 0,1 12,2 Z" className="fill-yellow-100" />
                    </g>
                 );
            } else if (phase >= 0.25 && phase < 0.28) {
                // First Quarter (Left half lit)
                return (
                    <g>
                        <circle cx="12" cy="12" r="10" className="fill-neutral-800 stroke-none" />
                        <path d="M12,2 A10,10 0 0,0 12,22 L11.5,22 Z" className="fill-yellow-100" /> 
                         {/* Fix: Standard First Quarter logic */}
                         <path d="M12,2 L12,22 A10,10 0 0,1 12,2 Z" className="fill-neutral-800" /> {/* Right Dark */}
                         <path d="M12,2 L12,22 A10,10 0 0,0 12,2 Z" className="fill-yellow-100" /> {/* Left Lit */}
                    </g>
                );
            } else {
                 // Waxing Gibbous (Mostly lit, dark crescent on Right)
                 return (
                    <g>
                        <circle cx="12" cy="12" r="10" className="fill-yellow-100 stroke-none" />
                        <path d="M12,2 A10,10 0 0,1 12,22 A6,10 0 0,0 12,2 Z" className="fill-neutral-800" />
                    </g>
                 );
            }
        } 
        
        // Waning (Shrinking) - Light on Right for South Hemisphere
        else {
             if (phase < 0.72) {
                 // Waning Gibbous (Mostly lit, dark crescent on Left)
                 return (
                    <g>
                        <circle cx="12" cy="12" r="10" className="fill-yellow-100 stroke-none" />
                        <path d="M12,2 A10,10 0 0,0 12,22 A6,10 0 0,1 12,2 Z" className="fill-neutral-800" />
                    </g>
                 );
             } else if (phase >= 0.72 && phase < 0.78) {
                // Last Quarter (Right half lit)
                return (
                     <g>
                         <circle cx="12" cy="12" r="10" className="fill-neutral-800 stroke-none" />
                         <path d="M12,2 L12,22 A10,10 0 0,1 12,2 Z" className="fill-yellow-100" /> {/* Right Lit */}
                    </g>
                );
             } else {
                 // Waning Crescent (Light is a crescent on the Right)
                 return (
                    <g>
                        <circle cx="12" cy="12" r="10" className="fill-neutral-800 stroke-none" />
                        <path d="M12,2 A10,10 0 0,1 12,22 A6,10 0 0,0 12,2 Z" className="fill-yellow-100" />
                    </g>
                 );
             }
        }

        return <circle cx="12" cy="12" r="10" className="fill-neutral-800" />;
    };

    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-8 h-8 md:w-10 md:h-10 shrink-0 drop-shadow-lg">
             {getPath()}
        </svg>
    );
};

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
            phase,
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
            <div className="max-w-7xl mx-auto flex flex-col gap-4">
                
                {/* Top Row: User Greeting & Actions */}
                <div className="flex justify-between items-start md:items-center">
                    {/* User Greeting */}
                    <div>
                        <p className="text-[10px] text-emerald-500/80 uppercase tracking-widest font-bold mb-1">Produção Mutum</p>
                        <h1 className="text-xl md:text-2xl font-bold text-white">
                            Olá, <span className="text-emerald-400">{firstName}</span>
                        </h1>
                    </div>

                    {/* Actions (Desktop & Mobile) */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Notification */}
                        <button 
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-neutral-400 hover:bg-white/10 hover:text-white transition-colors relative group"
                            title="Notificações"
                        >
                            <Bell size={18} />
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
                        </button>

                        {/* Guardiao Panel */}
                        <button
                            onClick={() => navigate('/guardiao')}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                            title="Painel do Guardião"
                        >
                            <LayoutDashboard size={18} />
                        </button>

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/20 transition-colors"
                            title="Sair"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Bottom Row: Controls (Date & Moon) */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                    
                    {/* Date Navigator */}
                    <div className="flex items-center justify-between md:justify-start gap-4 bg-white/5 rounded-xl p-2 px-3 border border-white/5 shadow-sm">
                        <button onClick={prevDay} className="p-1.5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition active:scale-95">
                            <ChevronLeft size={20} />
                        </button>
                        <span className="text-sm md:text-base text-white font-medium capitalize flex-1 text-center md:flex-none md:min-w-[200px]">
                            {formatDate(currentDate)}
                        </span>
                        <button onClick={nextDay} className="p-1.5 hover:bg-white/10 rounded-full text-neutral-400 hover:text-white transition active:scale-95">
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className="hidden md:block w-px h-8 bg-white/10 mx-2"></div>

                    {/* Moon Info Block */}
                    <div className="flex items-center gap-4 bg-white/5 md:bg-transparent rounded-xl p-3 md:p-0 border border-white/5 md:border-none">
                        <DynamicMoonIcon phase={moonInfo.phase} />
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="text-purple-300 font-bold text-sm tracking-wide">{moonInfo.phaseName}</span>
                                <span className="hidden md:inline-block w-1 h-1 rounded-full bg-white/20"></span>
                                <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium">{moonInfo.illumination}% Iluminada</span>
                            </div>
                            
                            {moonInfo.daysToFull > 0 ? (
                                <span className="text-xs text-neutral-400 mt-0.5">
                                    Faltam <span className="text-white font-bold">{moonInfo.daysToFull}</span> dias para a Lua Cheia
                                </span>
                            ) : (
                                    <span className="text-xs text-yellow-400 font-bold animate-pulse mt-0.5">
                                    Hoje é Lua Cheia!
                                </span>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );

};

export default MutumHeader;
