import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import { Strategy } from '../types';
import StrategyDraggable from './StrategyDraggable';
import S3SentimentPanel from './S3SentimentPanel';

interface MobileSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    strategies: Strategy[];
    selectedStrategyId: string | null;
    onKeyboardSelect: (strategyId: string) => void;
    onDragStart: (e: React.DragEvent, strategyId: string) => void;
    onDragEnd: () => void;
    onAnalyzeSentiment: () => Promise<any>;
}

const MobileSidebar: React.FC<MobileSidebarProps> = ({
    isOpen,
    onClose,
    strategies,
    selectedStrategyId,
    onKeyboardSelect,
    onDragStart,
    onDragEnd,
    onAnalyzeSentiment,
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    />

                    {/* Sidebar */}
                    <motion.aside
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed left-0 top-0 bottom-0 w-[300px] flex flex-col border-r-2 border-black bg-white z-50 lg:hidden shadow-2xl"
                    >
                        {/* Header */}
                        <div className="p-4 border-b-2 border-black bg-black text-white shrink-0 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5" />
                                <h1 className="text-lg font-display font-bold tracking-tight uppercase">DEFI LEGO</h1>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/20 transition-colors"
                                aria-label="Close sidebar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Strategy Blocks */}
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar bg-gray-50">
                            <div className="flex items-center justify-between mb-4 pt-4 pb-2 border-b-2 border-black sticky top-0 bg-gray-50 z-10">
                                <span className="text-sm font-bold text-black uppercase tracking-wider">Strategy Blocks</span>
                                <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">{strategies.length}</span>
                            </div>

                            <div className="pb-2">
                                {strategies.map(strat => (
                                    <StrategyDraggable
                                        key={strat.id}
                                        strategy={strat}
                                        onDragStart={onDragStart}
                                        onDragEnd={onDragEnd}
                                        isKeyboardSelected={selectedStrategyId === strat.id}
                                        onKeyboardSelect={onKeyboardSelect}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* S³ Sentiment Panel */}
                        <S3SentimentPanel onAnalyze={onAnalyzeSentiment} />
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default MobileSidebar;
