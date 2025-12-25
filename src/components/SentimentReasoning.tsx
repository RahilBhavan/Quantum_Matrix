import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ChevronRight, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MarketSentiment } from '../../types';

interface SentimentReasoningProps {
    sentiment: MarketSentiment | null;
    isLoading: boolean;
}

const SentimentReasoning: React.FC<SentimentReasoningProps> = ({ sentiment, isLoading }) => {
    if (isLoading) {
        return (
            <div className="bg-white border-2 border-black p-6 shadow-brutal flex flex-col items-center justify-center gap-4 min-h-[160px]">
                <Brain className="w-8 h-8 animate-pulse text-defi-purple" />
                <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Consulting Global Brain...</p>
            </div>
        );
    }

    if (!sentiment || !sentiment.reasoning) return null;

    const getLabelStyles = (label: string) => {
        switch (label) {
            case 'Bullish': return 'bg-green-500 text-white';
            case 'Bearish': return 'bg-red-500 text-white';
            case 'Euphoric': return 'bg-defi-purple text-white';
            default: return 'bg-gray-800 text-white';
        }
    };

    const getIcon = (label: string) => {
        switch (label) {
            case 'Bullish':
            case 'Euphoric':
                return <TrendingUp className="w-4 h-4" />;
            case 'Bearish':
                return <TrendingDown className="w-4 h-4" />;
            default:
                return <Minus className="w-4 h-4" />;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group mb-8"
            >
                {/* Decorative background element */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                    <Brain className="w-48 h-48 rotate-12" />
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-start relative z-10">
                    {/* Left: Score Circle */}
                    <div className="flex flex-col items-center shrink-0">
                        <div className="relative w-24 h-24 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-gray-100"
                                />
                                <circle
                                    cx="48"
                                    cy="48"
                                    r="44"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 44}
                                    strokeDashoffset={2 * Math.PI * 44 * (1 - sentiment.score / 100)}
                                    className={sentiment.score > 50 ? 'text-green-500' : 'text-red-500'}
                                />
                            </svg>
                            <span className="absolute text-2xl font-black font-mono">{sentiment.score}</span>
                        </div>
                        <div className={`mt-2 px-3 py-1 text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${getLabelStyles(sentiment.label)}`}>
                            {getIcon(sentiment.label)}
                            {sentiment.label}
                        </div>
                    </div>

                    {/* Right: Insight Content */}
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-defi-purple" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-black">AI Brain Insight</h3>
                            {sentiment.confidence && (
                                <span className="text-[10px] font-bold text-gray-400 ml-auto uppercase tracking-widest">
                                    Confidence: {(sentiment.confidence * 100).toFixed(0)}%
                                </span>
                            )}
                        </div>
                        
                        <p className="text-lg font-bold leading-tight mb-4 text-black border-l-4 border-black pl-4">
                            "{sentiment.summary}"
                        </p>

                        <div className="space-y-3">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <ChevronRight className="w-3 h-3 text-defi-purple" />
                                Reasoning Analysis
                            </div>
                            <p className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 border border-dashed border-gray-300">
                                {sentiment.reasoning}
                            </p>
                        </div>

                        {sentiment.trendingTopics && sentiment.trendingTopics.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                                {sentiment.trendingTopics.map((topic, i) => (
                                    <span key={i} className="text-[9px] font-black uppercase tracking-widest bg-black text-white px-2 py-1">
                                        # {topic}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Accuracy Badge (If Correctness data available from Feedback Loop) */}
                <div className="mt-4 pt-4 border-t-2 border-black/5 flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-gray-400" />
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                        Based on real-time news, RSS, and on-chain sentiment aggregates.
                    </span>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SentimentReasoning;
