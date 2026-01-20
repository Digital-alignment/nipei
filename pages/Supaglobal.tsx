import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Supaglobal: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-neutral-900 text-white p-4 md:p-8 flex flex-col">
             <button
                onClick={() => navigate('/supadmin')}
                className="mb-8 flex items-center gap-2 text-neutral-400 hover:text-white transition-colors self-start"
            >
                <ArrowLeft size={20} />
                <span>Voltar</span>
            </button>
            <div className="flex-1 flex items-center justify-center">
                <h1 className="text-4xl md:text-6xl font-bold font-serif bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent text-center">
                    O poder se manifiesta
                </h1>
            </div>
        </div>
    );
};

export default Supaglobal;
