import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, TreePine, Leaf, Info, Volume2, ArrowLeft, Sparkles, Youtube, Play, X, UserCog } from 'lucide-react';
import { Product, Theme } from '../types';
import { useProducts } from '../context/ProductContext';
import ProductGrid from '../components/ProductGrid';
import ProductDetail from '../components/ProductDetail';
import { Link, useNavigate } from 'react-router-dom';

const Home: React.FC = () => {
    const { products, loading } = useProducts();
    const [theme, setTheme] = useState<Theme>('dark');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState<string>('');
    const [videoId, setVideoId] = useState<string | null>(null);
    const navigate = useNavigate();

    // Body theme class toggle
    useEffect(() => {
        if (theme === 'dark') {
            document.body.classList.add('jungle-gradient-dark');
            document.body.classList.remove('jungle-gradient-light');
            document.body.style.backgroundColor = '#052e16';
        } else {
            document.body.classList.add('jungle-gradient-light');
            document.body.classList.remove('jungle-gradient-dark');
            document.body.style.backgroundColor = '#f0fdf4';
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    // Handle scroll position when opening detail
    useEffect(() => {
        if (selectedProduct) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [selectedProduct]);

    const extractVideoId = (url: string) => {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    };

    const handleVideoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const id = extractVideoId(youtubeUrl);
        setVideoId(id);
    };

    return (
        <div className={`min-h-screen transition-colors duration-500 ${theme === 'dark' ? 'text-green-50' : 'text-green-900'}`}>

            {/* Navigation Header */}
            <nav className="fixed top-0 left-0 right-0 z-[60] px-6 py-6 flex justify-between items-center backdrop-blur-xl bg-opacity-10 border-b border-white/5">
                <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedProduct(null)}>
                    <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500 group-hover:scale-110 transition-transform">
                        <TreePine size={28} />
                    </div>
                    <span className="text-2xl font-serif tracking-tighter font-bold">Medicinas da Floresta</span>
                </div>

                <div className="flex items-center gap-4">
                    <Link to="/admin" className={`p-3 rounded-2xl transition-all duration-300 ${theme === 'dark' ? 'hover:bg-green-800 text-green-200' : 'hover:bg-emerald-100 text-emerald-800'}`}>
                        <UserCog size={20} />
                    </Link>
                    <button
                        onClick={toggleTheme}
                        className={`p-3 rounded-2xl transition-all duration-300 shadow-xl ${theme === 'dark' ? 'bg-green-800 text-yellow-400 hover:bg-green-700' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </nav>

            <main className="pt-32 pb-32 px-4 md:px-12">
                <AnimatePresence mode="wait">
                    {!selectedProduct ? (
                        <motion.div
                            key="grid-view"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.4 } }}
                            className="max-w-7xl mx-auto"
                        >
                            <header className="mb-20 text-center relative">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-widest mb-6"
                                >
                                    <Sparkles size={14} /> Sabedoria Ancestral
                                </motion.div>
                                <motion.h1
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-6xl md:text-8xl font-serif mb-8 leading-none"
                                >
                                    O Jardim Sagrado
                                </motion.h1>
                                <p className="max-w-3xl mx-auto text-xl md:text-2xl opacity-70 font-light leading-relaxed mb-12">
                                    Explore nosso catálogo de medicinas tradicionais. Cada frasco guarda o espírito da floresta e o conhecimento dos nossos anciões.
                                </p>
                                <div className="w-24 h-1 bg-emerald-500/30 mx-auto rounded-full" />
                            </header>

                            {loading ? (
                                <div className="flex justify-center items-center py-40">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-emerald-500"></div>
                                </div>
                            ) : (
                                <ProductGrid
                                    products={products.filter(p => p.isVisible)}
                                    onSelect={setSelectedProduct}
                                    theme={theme}
                                />
                            )}

                            {/* YouTube Video Section */}
                            <section className="mt-40 max-w-5xl mx-auto">
                                <div className={`p-10 md:p-16 rounded-[4rem] overflow-hidden relative border ${theme === 'dark' ? 'bg-green-950/30 border-white/10' : 'bg-emerald-50/50 border-emerald-500/10 shadow-2xl shadow-emerald-500/10'}`}>
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] pointer-events-none" />

                                    <div className="flex flex-col items-center text-center mb-12">
                                        <div className="w-16 h-16 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center mb-6">
                                            <Youtube size={36} />
                                        </div>
                                        <h2 className="text-4xl md:text-5xl font-serif mb-4">Visão da Floresta</h2>
                                        <p className="text-lg opacity-60 font-light max-w-xl">
                                            Cole aqui um link do YouTube para mergulhar em cerimônias, cantos e visões da nossa comunidade diretamente na plataforma.
                                        </p>
                                    </div>

                                    {!videoId ? (
                                        <form onSubmit={handleVideoSubmit} className="max-w-2xl mx-auto flex flex-col md:flex-row gap-4">
                                            <input
                                                type="text"
                                                placeholder="https://www.youtube.com/watch?v=..."
                                                value={youtubeUrl}
                                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                                className={`flex-1 px-8 py-5 rounded-[2rem] text-lg outline-none transition-all ${theme === 'dark' ? 'bg-black/40 border border-white/10 focus:border-emerald-500 focus:bg-black/60' : 'bg-white border border-emerald-200 focus:border-emerald-500 shadow-inner'}`}
                                            />
                                            <button
                                                type="submit"
                                                className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 shadow-xl transition-all hover:scale-105 active:scale-95"
                                            >
                                                <Play size={20} fill="currentColor" /> Reproduzir
                                            </button>
                                        </form>
                                    ) : (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="relative w-full aspect-video rounded-[3rem] overflow-hidden shadow-2xl border-4 border-emerald-500/20"
                                        >
                                            <button
                                                onClick={() => { setVideoId(null); setYoutubeUrl(''); }}
                                                className="absolute top-6 right-6 z-20 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
                                            >
                                                <X size={20} />
                                            </button>
                                            <iframe
                                                className="w-full h-full"
                                                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                                                title="YouTube video player"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                            ></iframe>
                                        </motion.div>
                                    )}
                                </div>
                            </section>

                            <div className="mt-40 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm max-w-6xl mx-auto">
                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className={`flex flex-col items-center text-center gap-6 p-10 rounded-[3rem] transition-colors ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-emerald-500/5 border border-emerald-500/10 shadow-xl shadow-emerald-500/5'}`}
                                >
                                    <div className="p-5 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                                        <Leaf size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-serif mb-3">Colheita Ética</h3>
                                        <p className="opacity-60 text-base leading-relaxed">Respeito absoluto aos ciclos da natureza e sustentabilidade tribal em cada extração.</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className={`flex flex-col items-center text-center gap-6 p-10 rounded-[3rem] transition-colors ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-amber-500/5 border border-amber-500/10 shadow-xl shadow-amber-500/5'}`}
                                >
                                    <div className="p-5 rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
                                        <Volume2 size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-serif mb-3">Voz dos Anciões</h3>
                                        <p className="opacity-60 text-base leading-relaxed">Preservamos a herança oral através de relatos e rezo gravados nas próprias aldeias.</p>
                                    </div>
                                </motion.div>

                                <motion.div
                                    whileHover={{ y: -5 }}
                                    className={`flex flex-col items-center text-center gap-6 p-10 rounded-[3rem] transition-colors ${theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-sky-500/5 border border-sky-500/10 shadow-xl shadow-sky-500/5'}`}
                                >
                                    <div className="p-5 rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/30">
                                        <Info size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-serif mb-3">Rastreabilidade</h3>
                                        <p className="opacity-60 text-base leading-relaxed">Identificação técnica única para garantir a pureza laboratorial e origem sagrada.</p>
                                    </div>
                                </motion.div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="detail-view"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30 }}
                            transition={{ type: "spring", damping: 30, stiffness: 200 }}
                        >
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className={`fixed top-28 left-6 md:left-12 z-[60] flex items-center gap-3 px-6 py-3 backdrop-blur-2xl rounded-2xl transition-all shadow-2xl hover:scale-105 active:scale-95 ${theme === 'dark' ? 'bg-white/10 text-white border border-white/20' : 'bg-emerald-900/10 text-emerald-900 border border-emerald-900/10'}`}
                            >
                                <ArrowLeft size={20} />
                                <span className="font-bold tracking-tight">Ver Todas as Medicinas</span>
                            </button>
                            <div className="max-w-7xl mx-auto pt-16">
                                <ProductDetail
                                    product={selectedProduct}
                                    theme={theme}
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Decorative Jungle Leaves in background */}
            <div className="fixed bottom-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />
            <div className="fixed top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none -z-10" />
        </div>
    );
};

export default Home;
