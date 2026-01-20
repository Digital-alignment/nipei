import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { 
    Globe, 
    Crown, 
    Feather, 
    Truck, 
    Megaphone, 
    BadgeDollarSign, 
    Scale, 
    Hammer, 
    Building, 
    HeartHandshake, 
    Rocket, 
    Bug, 
    Users,
    LogOut
} from 'lucide-react';
import ProfileMenu from '../components/ProfileMenu';

interface DashboardCardProps {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick?: () => void;
    isActive?: boolean;
    color?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, description, icon, onClick, isActive = false, color = "emerald" }) => {
    return (
        <div 
            onClick={isActive ? onClick : undefined}
            className={`
                relative overflow-hidden p-6 rounded-3xl border transition-all duration-300
                ${isActive 
                    ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] bg-neutral-800 border-neutral-700 hover:border-emerald-500/50 shadow-lg hover:shadow-emerald-900/20' 
                    : 'cursor-not-allowed bg-neutral-800/50 border-neutral-800 opacity-70'
                }
            `}
        >
            <div className={`
                absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4
                ${isActive ? `text-${color}-500` : 'text-neutral-500'}
            `}>
                {React.cloneElement(icon as React.ReactElement, { size: 120 })}
            </div>
            
            <div className="relative z-10">
                <div className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white
                    ${isActive ? `bg-${color}-500/20 text-${color}-400` : 'bg-neutral-700/30 text-neutral-500'}
                `}>
                    {icon}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2 font-serif">{title}</h3>
                <p className="text-sm text-neutral-400 mb-4 h-10 overflow-hidden">{description}</p>
                
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    {isActive ? (
                        <span className={`text-${color}-500 flex items-center gap-1`}>
                            Acessar <span className="text-lg">→</span>
                        </span>
                    ) : (
                        <span className="text-neutral-600 border border-neutral-700 px-2 py-1 rounded">
                            Em Breve
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const SupadminDashboard: React.FC = () => {
    const { session, loading, signOut } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (!session) {
                navigate('/login');
            } else {
                const role = session.user?.user_metadata?.role as UserRole;
                if (role !== 'superadmin' && role !== 'otter') {
                    navigate('/');
                }
            }
        }
    }, [session, loading, navigate]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    if (loading || !session) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-white">Carregando...</div>;

    const cards = [
        {
            title: "Global",
            description: "Resumo geral de todos os squads e métricas principais.",
            icon: <Globe size={24} />,
            active: true,
            onClick: () => navigate('/supaglobal'),
            color: "emerald"
        },
        {
            title: "Squad 1: Liderança & Estratégia",
            description: "Direcionamento e visão de longo prazo.",
            icon: <Crown size={24} />,
            active: false
        },
        {
            title: "Squad 2: Mutum",
            description: "Yawanawa aqui chegou. Dashboard, produtos, envios e finanças.",
            icon: <Feather size={24} />,
            active: true,
            onClick: () => navigate('/s2admin'),
            color: "emerald"
        },
        {
            title: "Squad 3: Logística & Hospitalidade",
            description: "Gestão de transporte, estadia e fluxo de pessoas.",
            icon: <Truck size={24} />,
            active: false
        },
        {
            title: "Squad 4: Marketing",
            description: "Comunicação, redes sociais e campanhas.",
            icon: <Megaphone size={24} />,
            active: false
        },
        {
            title: "Squad 5: Vendas",
            description: "Gestão comercial e relacionamento com clientes.",
            icon: <BadgeDollarSign size={24} />,
            active: true,
            onClick: () => navigate('/s5admin'),
            color: "blue"
        },
        {
            title: "Squad 6: Administrativo & Legal",
            description: "Documentação, contratos e conformidade.",
            icon: <Scale size={24} />,
            active: false
        },
        {
            title: "Squad 7: Infraestrutura & Operações",
            description: "Manutenção e gestão física dos espaços.",
            icon: <Hammer size={24} />,
            active: false
        },
        {
            title: "Squad 8: Instituto Nipëi",
            description: "Projetos sociais e educacionais do instituto.",
            icon: <Building size={24} />,
            active: false
        },
        {
            title: "Squad 9: Captação & Grants",
            description: "Captação de recursos e gestão de editais.",
            icon: <HeartHandshake size={24} />,
            active: false
        },
        {
            title: "Squad 10: Expansão Global",
            description: "Parcerias internacionais e novos territórios.",
            icon: <Rocket size={24} />,
            active: false
        },
        {
            title: "Dev Panel",
            description: "Report de bugs e comunicação com time de desenvolvimento.",
            icon: <Bug size={24} />,
            active: false
        },
        {
            title: "Usuários",
            description: "Informações sobre futuros compradores e base de usuários.",
            icon: <Users size={24} />,
            active: true,
            onClick: () => navigate('/supadmin/users'),
            color: "blue"
        }
    ];

    return (
        <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold font-serif bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                            Firmeza no pensamento. Eu sou.
                        </h1>
                        <p className="text-neutral-400 mt-2">Central de Comando Unificada</p>
                    </div>

                    <div className="self-start md:self-auto">
                        <ProfileMenu />
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {cards.map((card, index) => (
                        <DashboardCard
                            key={index}
                            title={card.title}
                            description={card.description}
                            icon={card.icon}
                            onClick={card.onClick}
                            isActive={card.active}
                            color={card.color}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SupadminDashboard;
