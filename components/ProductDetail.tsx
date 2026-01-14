
import React, { useState, useRef } from 'react';
// Fix: Added AnimatePresence to imports from framer-motion
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, History, ShieldCheck, Play, Pause, Headphones, Upload, Mic, Trash2, Plus, Sparkles } from 'lucide-react';
import { Product, Theme, AudioSlot } from '../types';

interface ProductDetailProps {
  product: Product;
  theme: Theme;
}

const ProductDetail: React.FC<ProductDetailProps> = ({ product, theme }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [customAudios, setCustomAudios] = useState<AudioSlot[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const newAudio: AudioSlot = {
        id: `custom-${Date.now()}`,
        title: file.name.split('.')[0],
        author: 'Relato Pessoal',
        url: URL.createObjectURL(file)
      };
      setCustomAudios(prev => [...prev, newAudio]);
    }
  };

  const removeAudio = (id: string) => {
    if (playingAudioId === id) setPlayingAudioId(null);
    setCustomAudios(prev => prev.filter(a => a.id !== id));
  };

  const toggleAudio = (id: string) => {
    setPlayingAudioId(playingAudioId === id ? null : id);
  };

  const sectionClass = `p-10 rounded-[3rem] ${theme === 'dark' ? 'bg-green-950/40 border border-green-800/20 backdrop-blur-xl' : 'bg-white shadow-2xl border border-green-100'}`;

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-16 mt-8">
      
      {/* Left Column: Media Gallery & Technical Details */}
      <div className="lg:col-span-5 space-y-10">
        <motion.div 
          layoutId={`image-${product.id}`}
          className="aspect-[4/5] rounded-[3.5rem] overflow-hidden bg-black/10 relative shadow-2xl"
        >
          <AnimatePresence mode="wait">
            <motion.img 
              key={activeImage}
              src={product.images[activeImage]} 
              alt={product.name}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
              className="w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </motion.div>
        
        <div className="grid grid-cols-4 gap-4">
          {product.images.map((img, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveImage(idx)}
              className={`aspect-square rounded-[1.5rem] overflow-hidden border-2 transition-all duration-300 ${activeImage === idx ? 'border-emerald-500 scale-110 shadow-xl' : 'border-transparent opacity-50 hover:opacity-100 hover:scale-105'}`}
            >
              <img src={img} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-black/30 border-green-800/40' : 'bg-green-50/50 border-green-200 shadow-lg'}`}
        >
          <h4 className="text-xs uppercase tracking-[0.3em] font-black mb-6 flex items-center gap-3 text-emerald-500">
            <ShieldCheck size={18} /> Identificação Técnica
          </h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-green-500/10 pb-3">
              <span className="text-xs opacity-50 uppercase tracking-widest font-bold">Código</span>
              <span className="text-sm font-mono font-bold px-3 py-1 bg-emerald-500/10 rounded-lg">{product.technicalName}</span>
            </div>
            {product.labels.map((label, idx) => (
              <div key={idx} className="flex justify-between items-center border-b border-green-500/10 pb-3">
                <span className="text-xs opacity-50 uppercase tracking-widest font-bold">{label.key}</span>
                <span className="text-sm font-medium text-right max-w-[60%]">{label.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Right Column: Information & Audio Podcast Space */}
      <div className="lg:col-span-7 space-y-16">
        <section>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-black uppercase tracking-[0.2em] mb-6">
              <Sparkles size={14} /> {product.classification}
            </span>
            <h1 className="text-6xl md:text-8xl font-serif mb-8 leading-[0.95] tracking-tighter">
              {product.name}
            </h1>
            <p className="text-2xl md:text-3xl opacity-80 leading-relaxed font-light italic border-l-4 border-emerald-500 pl-8 py-2">
              "{product.benefits}"
            </p>
          </motion.div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className={sectionClass}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-8">
              <Leaf size={32} />
            </div>
            <h3 className="text-3xl font-serif mb-4">Composição</h3>
            <p className="text-lg leading-relaxed opacity-70 font-light">{product.composition}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={sectionClass}
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center mb-8">
              <History size={32} />
            </div>
            <h3 className="text-3xl font-serif mb-4">História</h3>
            <p className="text-lg leading-relaxed opacity-70 font-light">{product.history}</p>
          </motion.div>
        </div>

        {/* Podcast Section: Talk of the Elders */}
        <section className={`${sectionClass} border-2 border-emerald-500/20 overflow-hidden relative group`}>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/5 blur-[80px] rounded-full group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/20">
                  <Mic className="text-white" size={24} />
                </div>
                <h3 className="text-4xl font-serif">Voz dos Anciões</h3>
              </div>
              <p className="text-lg opacity-60 font-light max-w-md">Ensinamentos sagrados e relatos exclusivos diretamente das aldeias.</p>
            </div>
            
            <label className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] cursor-pointer transition-all shadow-xl hover:scale-105 active:scale-95 text-base font-bold">
              <Upload size={20} />
              <span>Subir Relato</span>
              <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
            </label>
          </div>

          <div className="space-y-4">
            {/* Native Audio Slots */}
            {product.audioSlots.map((audio) => (
              <motion.div 
                key={audio.id} 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-500 border-2 ${playingAudioId === audio.id ? 'bg-emerald-500/15 border-emerald-500/40 scale-[1.02] shadow-2xl shadow-emerald-500/10' : 'bg-black/5 border-transparent hover:bg-black/10'}`}
              >
                <button 
                  onClick={() => toggleAudio(audio.id)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${playingAudioId === audio.id ? 'bg-emerald-500 text-white animate-spin-slow' : 'bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                >
                  {playingAudioId === audio.id ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
                <div className="flex-1">
                  <h4 className="font-bold text-xl mb-1">{audio.title}</h4>
                  <p className="text-xs opacity-50 uppercase tracking-[0.2em] font-black">{audio.author}</p>
                </div>
                <div className="hidden md:flex items-center gap-3 opacity-30">
                  <Headphones size={20} />
                  <span className="text-xs font-bold uppercase tracking-widest">Original</span>
                </div>
              </motion.div>
            ))}

            {/* User Uploaded Audio Slots */}
            {customAudios.map((audio) => (
              <motion.div 
                key={audio.id} 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-6 rounded-[2rem] flex items-center gap-6 transition-all border-2 border-dashed border-emerald-500/40 ${playingAudioId === audio.id ? 'bg-amber-500/10 border-amber-500/40' : 'bg-black/5 border-emerald-500/10'}`}
              >
                <button 
                  onClick={() => toggleAudio(audio.id)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${playingAudioId === audio.id ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white'}`}
                >
                  {playingAudioId === audio.id ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                </button>
                <div className="flex-1">
                  <h4 className="font-bold text-xl mb-1 truncate max-w-[200px] md:max-w-md">{audio.title}</h4>
                  <p className="text-xs opacity-50 italic font-medium">{audio.author}</p>
                </div>
                <button 
                  onClick={() => removeAudio(audio.id)}
                  className="p-3 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}

            {customAudios.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                className="py-12 border-2 border-dashed border-black/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-3"
              >
                <Plus size={40} className="text-emerald-500/50" />
                <span className="text-sm uppercase font-black tracking-[0.3em] opacity-40">Adicione seus relatos sagrados</span>
              </motion.div>
            )}
          </div>
        </section>

        {product.safetyRequirement && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            className={`p-8 rounded-[2rem] border-l-[12px] shadow-xl ${theme === 'dark' ? 'bg-amber-950/20 border-amber-600' : 'bg-amber-50 border-amber-500'}`}
          >
            <h4 className="text-amber-500 font-black text-xs uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
              <ShieldCheck size={20} /> Alerta de Segurança
            </h4>
            <p className="text-lg font-medium leading-relaxed italic">"{product.safetyRequirement}"</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
