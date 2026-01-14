import React, { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Loader2, Package, Send, Calendar as CalendarIcon, Droplet } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CalendarEvent {
    id: string;
    date: Date;
    type: 'produced' | 'sent' | 'arrival' | 'request';
    quantity?: number;
    product_name: string;
    description?: string;
}

const AdminCalendar: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const fetchMonthEvents = async () => {
        setLoading(true);
        const start = startOfMonth(currentDate).toISOString();
        const end = endOfMonth(currentDate).toISOString();

        // fetch logs created in this month OR expected to arrive in this month
        const { data: logs, error: logsError } = await supabase
            .from('production_logs')
            .select(`
                id,
                created_at,
                action_type,
                quantity,
                description,
                expected_arrival_date,
                products (name)
            `)
            .or(`created_at.gte.${start},expected_arrival_date.gte.${start}`) // simplified filter, might need more refinement for exact ranges overlap
            // Note: complex querying for mixed date columns is tricky in one go without a raw query or separate requests. 
            // For simplicity/performance lets fetch a slightly wider range or just fetch recent logs and filter in JS if dataset isn't huge. 
            // Better: client-side filtering for the strict month view to handle specific 'created_at' vs 'arrival_date' logic.
            .order('created_at', { ascending: false })
            .limit(500); // Reasonable limit for monthly view

        if (logsError) {
            console.error('Error fetching production logs:', logsError);
        }

        // fetch production requests for this month
        const { data: requests, error: requestsError } = await supabase
            .from('production_requests')
            .select(`
                id,
                needed_date,
                quantity,
                status,
                products (name)
            `)
            .gte('needed_date', start)
            .lte('needed_date', end);

        if (requestsError) {
            console.error('Error fetching production requests:', requestsError);
        }

        const mappedEvents: CalendarEvent[] = [];

        if (logs) {
            logs.forEach((log: any) => {
                // Event 1: The action itself (Produced or Sent)
                if (log.created_at) {
                    mappedEvents.push({
                        id: `${log.id}-action`,
                        date: parseISO(log.created_at),
                        type: log.action_type,
                        quantity: log.quantity,
                        product_name: log.products?.name || 'Produto desconhecido',
                        description: log.description
                    });
                }

                // Event 2: Expected Arrival (only if 'sent' and date exists)
                if (log.action_type === 'sent' && log.expected_arrival_date) {
                    mappedEvents.push({
                        id: `${log.id}-arrival`,
                        date: parseISO(log.expected_arrival_date),
                        type: 'arrival',
                        quantity: log.quantity,
                        product_name: log.products?.name || 'Produto desconhecido',
                        description: 'Chegada Prevista'
                    });
                }
            });
        }

        if (requests) {
            requests.forEach((req: any) => {
                mappedEvents.push({
                    id: `${req.id}-request`,
                    date: parseISO(req.needed_date), // needed_date is YYYY-MM-DD
                    type: 'request', // Need to add this to type definition
                    quantity: req.quantity,
                    product_name: req.products?.name || 'Produto desconhecido',
                    description: `Solicitado (${req.status === 'pending' ? 'Pendente' : 'Concluído'})`
                });
            });
        }

        setEvents(mappedEvents);
        setLoading(false);
    };

    useEffect(() => {
        fetchMonthEvents();

        const logsSubscription = supabase
            .channel('calendar_logs_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => {
                fetchMonthEvents();
            })
            .subscribe();

        const requestsSubscription = supabase
            .channel('calendar_requests_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_requests' }, () => {
                fetchMonthEvents();
            })
            .subscribe();

        return () => {
            logsSubscription.unsubscribe();
            requestsSubscription.unsubscribe();
        };
    }, [currentDate]);

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = "d";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const getDayEvents = (day: Date) => {
        return events.filter(event => isSameDay(event.date, day));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'produced': return 'bg-emerald-500';
            case 'sent': return 'bg-orange-500';
            case 'arrival': return 'bg-blue-500';
            case 'request': return 'bg-purple-500';
            default: return 'bg-gray-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'produced': return <Droplet size={14} className="text-emerald-200" />;
            case 'sent': return <Send size={14} className="text-orange-200" />;
            case 'arrival': return <CalendarIcon size={14} className="text-blue-200" />;
            case 'request': return <Package size={14} className="text-purple-200" />;
            default: return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
        }
    };

    const selectedDayEvents = selectedDate ? getDayEvents(selectedDate) : [];

    return (
        <div className="bg-[#1A1A1A]/80 border border-white/5 rounded-3xl p-6 backdrop-blur-xl flex flex-col lg:flex-row gap-8">
            {/* Calendar Grid */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white capitalize flex items-center gap-3">
                        <CalendarIcon className="text-emerald-500" />
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                    <div className="flex gap-2">
                        <button onClick={prevMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition">
                            <ChevronLeft size={20} />
                        </button>
                        <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white text-sm font-medium transition">
                            Hoje
                        </button>
                        <button onClick={nextMonth} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition">
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-7 mb-4">
                    {weekDays.map(d => (
                        <div key={d} className="text-center text-white/40 text-sm font-medium py-2 uppercase tracking-wider">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                    {days.map((day, idx) => {
                        const dayEvents = getDayEvents(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    min-h-[80px] p-2 rounded-xl cursor-pointer transition-all border
                                    ${!isSameMonth(day, monthStart) ? 'bg-white/[0.02] border-transparent text-white/20' : 'bg-white/5 border-white/5 text-white'}
                                    ${isToday(day) ? 'ring-1 ring-emerald-500/50 bg-emerald-500/10' : ''}
                                    ${isSelected ? 'ring-2 ring-white/50 bg-white/10' : 'hover:bg-white/10'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-sm font-medium ${isToday(day) ? 'text-emerald-400' : ''}`}>{format(day, 'd')}</span>
                                    {dayEvents.length > 0 && (
                                        <div className="flex gap-1">
                                            {dayEvents.slice(0, 3).map((ev, i) => (
                                                <div key={i} className={`w-2 h-2 rounded-full ${getTypeColor(ev.type)}`} />
                                            ))}
                                            {dayEvents.length > 3 && <div className="w-2 h-2 rounded-full bg-white/30" />}
                                        </div>
                                    )}
                                </div>

                                {/* Tiny event bars for desktop */}
                                <div className="space-y-1 hidden md:block">
                                    {dayEvents.slice(0, 2).map((ev, i) => (
                                        <div key={i} className={`text-[10px] px-1 rounded truncate ${getTypeColor(ev.type)}/20 ${ev.type === 'produced' ? 'text-emerald-200' :
                                            ev.type === 'sent' ? 'text-orange-200' :
                                                ev.type === 'arrival' ? 'text-blue-200' :
                                                    'text-purple-200'
                                            }`}>
                                            {ev.product_name}
                                        </div>
                                    ))}
                                    {dayEvents.length > 2 && <div className="text-[10px] text-white/40 pl-1">+{dayEvents.length - 2} mais</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Side Panel / Details */}
            <div className="lg:w-80 flex flex-col border-l border-white/5 lg:pl-8">
                <div className="mb-6">
                    <h3 className="text-white/60 text-sm font-medium uppercase tracking-wider mb-4">Legenda</h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-white text-sm">Produção</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-white text-sm">Envio</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-white text-sm">Previsão Chegada</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-white text-sm">Solicitação</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-white/5 rounded-2xl p-4 overflow-y-auto max-h-[500px]">
                    <h3 className="text-lg text-white font-bold mb-4 sticky top-0 bg-[#232323] py-2 z-10 border-b border-white/10">
                        {selectedDate
                            ? format(selectedDate, "d 'de' MMMM", { locale: ptBR })
                            : format(new Date(), "'Hoje,' d 'de' MMMM", { locale: ptBR })
                        }
                    </h3>

                    <div className="space-y-3">
                        {(selectedDate ? selectedDayEvents : getDayEvents(new Date())).length === 0 ? (
                            <div className="text-white/30 text-center py-8 text-sm">
                                Nenhuma atividade neste dia.
                            </div>
                        ) : (
                            (selectedDate ? selectedDayEvents : getDayEvents(new Date())).map(ev => (
                                <div key={ev.id} className="bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-lg ${getTypeColor(ev.type)} bg-opacity-20 mt-1`}>
                                            {getTypeIcon(ev.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-white font-medium text-sm">{ev.product_name}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${ev.type === 'produced' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    ev.type === 'sent' ? 'bg-orange-500/20 text-orange-400' :
                                                        ev.type === 'arrival' ? 'bg-blue-500/20 text-blue-400' :
                                                            'bg-purple-500/20 text-purple-400'
                                                    }`}>
                                                    {ev.type === 'produced' ? 'Produzido' : ev.type === 'sent' ? 'Enviado' : ev.type === 'arrival' ? 'Chegada' : 'Solicitado'}
                                                </span>
                                            </div>
                                            {ev.quantity && (
                                                <div className="text-white/60 text-xs mt-1">
                                                    Quantidade: <strong className="text-white">{ev.quantity}</strong>
                                                </div>
                                            )}
                                            {ev.description && (
                                                <div className="text-white/40 text-xs mt-1 line-clamp-2">
                                                    "{ev.description}"
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminCalendar;
