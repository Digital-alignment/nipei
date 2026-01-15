import React, { useState, useEffect } from 'react';
import { useFinance } from '../../../context/FinanceContext';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';

const FinancialCalendar: React.FC = () => {
    const { seasons, loading } = useFinance();
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    // Simple Moon Phase Approximation
    // Reference New Moon: Jan 11, 2024
    const getMoonPhase = (date: Date) => {
        const synodicMonth = 29.53058867;
        const referenceNewMoon = new Date('2024-01-11T11:57:00Z');
        const diffDays = (date.getTime() - referenceNewMoon.getTime()) / (1000 * 60 * 60 * 24);
        const cycles = diffDays / synodicMonth;
        const currentCyclePos = cycles - Math.floor(cycles);

        if (currentCyclePos < 0.05 || currentCyclePos > 0.95) return 'Nova';
        if (currentCyclePos < 0.20) return 'Crescente';
        if (currentCyclePos < 0.30) return 'Quarto Crescente';
        if (currentCyclePos < 0.45) return 'Gibosa Crescente';
        if (currentCyclePos < 0.55) return 'Cheia';
        if (currentCyclePos < 0.70) return 'Gibosa Minguante';
        if (currentCyclePos < 0.80) return 'Quarto Minguante';
        return 'Minguante';
    };

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-32 bg-neutral-900/30 border border-neutral-800/50 rounded-lg"></div>);
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isToday = new Date().toDateString() === date.toDateString();
            const moonPhase = getMoonPhase(date);
            const isPaymentDay = day === 5; // Example: 5th of every month

            // Check active harvest seasons
            // season.start_month and end_month are 1-12
            const currentMonthNum = currentDate.getMonth() + 1;
            const activeSeasons = seasons.filter(s => {
                const start = s.start_month || 1;
                const end = s.end_month || 12;
                if (start <= end) {
                    return currentMonthNum >= start && currentMonthNum <= end;
                } else {
                    // Span across year end (e.g. Nov to Feb)
                    return currentMonthNum >= start || currentMonthNum <= end;
                }
            });

            days.push(
                <div key={day} className={`h-32 p-2 border rounded-lg relative flex flex-col justify-between ${isToday ? 'bg-emerald-900/20 border-emerald-500' : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'}`}>
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-bold ${isToday ? 'text-emerald-400' : 'text-neutral-400'}`}>{day}</span>
                        <div title={`Lua ${moonPhase}`}>
                            {moonPhase === 'Cheia' && <div className="w-3 h-3 rounded-full bg-yellow-200 shadow-[0_0_8px_rgba(254,240,138,0.8)]"></div>}
                            {moonPhase === 'Nova' && <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-600"></div>}
                            {moonPhase.includes('Crescente') && <div className="w-3 h-3 rounded-full border-r-4 border-yellow-200 rounded-r-lg"></div>}
                            {moonPhase.includes('Minguante') && <div className="w-3 h-3 rounded-full border-l-4 border-yellow-200 rounded-l-lg"></div>}
                        </div>
                    </div>

                    <div className="space-y-1 overflow-y-auto custom-scrollbar">
                        {isPaymentDay && (
                            <div className="text-[10px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded border border-blue-500/30 font-medium truncate">
                                💰 Pagamento
                            </div>
                        )}
                        {activeSeasons.map(s => (
                            <div key={s.id} className="text-[10px] bg-amber-500/10 text-amber-300 px-1 py-0.5 rounded border border-amber-500/20 truncate">
                                🌾 {s.product_name || 'Colheita'}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <CalendarIcon className="text-emerald-500" />
                        Calendário Bioeconômico
                    </h2>
                    <p className="text-sm text-neutral-400">Sincronia entre ciclos financeiros e naturais.</p>
                </div>
                <div className="flex items-center gap-4 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button onClick={prevMonth} className="p-2 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold min-w-[140px] text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-neutral-800 rounded-md transition-colors text-neutral-400 hover:text-white">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-4 mb-2 text-center text-sm font-bold text-neutral-500">
                <div>DOM</div>
                <div>SEG</div>
                <div>TER</div>
                <div>QUA</div>
                <div>QUI</div>
                <div>SEX</div>
                <div>SÁB</div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {renderCalendarGrid()}
            </div>

            <div className="flex gap-4 text-xs text-neutral-400 bg-neutral-900 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-200"></div> Lua Cheia
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-600"></div> Lua Nova
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500/20 rounded"></div> Dia de Pagamento
                </div>
            </div>
        </div>
    );
};

export default FinancialCalendar;
