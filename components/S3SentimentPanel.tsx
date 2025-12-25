import React, { useState, useEffect } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertCircle, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { toast } from './ToastProvider';


interface S3Components {
    S_lex: number;
    S_ml: number;
    S_dl: number;
    S_trans: number;
    S_macro: number;
}

interface S3Result {
    score: number;
    normalizedScore: number;
    label: 'Bearish' | 'Neutral' | 'Bullish' | 'Euphoric';
    confidence: number;
    components: S3Components;
    weights: {
        w_lex: number;
        w_ml: number;
        w_dl: number;
        w_trans: number;
        w_macro: number;
    };
    disagreementResolved: boolean;
    resolution?: {
        source: string;
        signal: 'bullish' | 'bearish' | 'neutral';
        nudge: number;
    };
    summary: string;
    trendingTopics: string[];
    macroSignals?: {
        compositeScore: number;
        interpretation: {
            signal: 'bullish' | 'bearish' | 'neutral';
            strength: 'weak' | 'moderate' | 'strong';
            summary: string;
        };
        cpiSignal: number;
        rateSignal: number;
        dxySignal: number;
        dataFreshness: 'fresh' | 'stale' | 'fallback';
    };
}

interface S3SentimentPanelProps {
    onAnalyze: () => Promise<S3Result | null>;
    initialData?: S3Result | null;
    compact?: boolean;
}

const S3SentimentPanel: React.FC<S3SentimentPanelProps> = ({ onAnalyze, initialData, compact = false }) => {
    const [data, setData] = useState<S3Result | null>(initialData || null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [history, setHistory] = useState<Array<{ time: string; score: number }>>([]);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (!data) {
            handleRefresh();
        }
    }, []);

    useEffect(() => {
        if (data) {
            setHistory(prev => {
                const newPoint = {
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    score: data.normalizedScore
                };
                return [...prev, newPoint].slice(-10);
            });
        }
    }, [data?.normalizedScore]);

    const handleRefresh = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsLoading(true);
        try {
            const result = await onAnalyze();
            if (result) {
                setData(result);
            }
        } catch (error) {
            console.error('Failed to fetch S³ score:', error);
            toast.error('Failed to refresh sentiment data');
        } finally {
            setIsLoading(false);
        }
    };

    const getLabelColor = (label: string) => {
        if (label === 'Bullish' || label === 'Euphoric') return 'text-defi-success';
        if (label === 'Bearish') return 'text-defi-danger';
        return 'text-gray-600';
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'bg-defi-success';
        if (confidence >= 0.6) return 'bg-yellow-500';
        return 'bg-defi-danger';
    };

    const ComponentBar: React.FC<{ label: string; value: number; weight: number }> = ({ label, value, weight }) => {
        const percentage = ((value + 1) / 2) * 100; // Convert -1 to +1 to 0-100%
        const isPositive = value > 0;

        return (
            <div className="flex items-center gap-2 text-xs">
                <span className="w-20 text-gray-600 truncate">{label}</span>
                <div className="flex-1 h-2 bg-gray-200 relative overflow-hidden">
                    <div
                        className={`absolute h-full transition-all duration-500 ${isPositive ? 'bg-defi-success' : 'bg-defi-danger'}`}
                        style={{
                            width: `${Math.abs(value) * 50}%`,
                            left: isPositive ? '50%' : `${50 - Math.abs(value) * 50}%`
                        }}
                    />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-black" />
                </div>
                <span className="w-10 text-right font-mono text-gray-500">{(weight * 100).toFixed(0)}%</span>
            </div>
        );
    };

    const DetailedView = () => (
        <div className="bg-white shadow-brutal-sm relative overflow-hidden h-full flex flex-col">
            {data ? (
                <>
                    {/* Main Score Display */}
                    <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                {data.label === 'Bullish' || data.label === 'Euphoric' ? (
                                    <TrendingUp className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                                ) : data.label === 'Bearish' ? (
                                    <TrendingDown className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                                ) : (
                                    <Minus className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                                )}
                                <span className={`text-xl font-display font-bold uppercase ${getLabelColor(data.label)}`}>
                                    {data.label}
                                </span>
                            </div>
                            <span className="text-3xl font-mono font-bold">{data.normalizedScore}</span>
                        </div>

                        {/* Confidence Bar */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-gray-500 uppercase">Confidence</span>
                            <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${getConfidenceColor(data.confidence)}`}
                                    style={{ width: `${data.confidence * 100}%` }}
                                />
                            </div>
                            <span className="text-xs font-mono font-bold">{Math.round(data.confidence * 100)}%</span>
                        </div>

                        {/* Mini Chart */}
                        {history.length > 1 && (
                            <div className="h-10 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={history}>
                                        <Tooltip
                                            content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                    return (
                                                        <div className="bg-black text-white px-2 py-1 text-[10px] font-mono">
                                                            {payload[0].payload.time}: {payload[0].value}
                                                        </div>
                                                    );
                                                }
                                                return null;
                                            }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="score"
                                            stroke="#7C3AED"
                                            strokeWidth={2}
                                            dot={false}
                                            activeDot={{ r: 3, fill: '#7C3AED' }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Expandable Components Section */}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full px-4 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            Signal Components
                        </span>
                        {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                            <ChevronDown className="w-3 h-3 text-gray-500" />
                        )}
                    </button>

                    {isExpanded && (
                        <div className="px-4 py-3 space-y-2 bg-gray-50 border-t border-gray-200 overflow-y-auto max-h-[300px] custom-scrollbar">
                            <ComponentBar label="Fear & Greed" value={data.components.S_lex} weight={data.weights.w_lex} />
                            <ComponentBar label="Reddit" value={data.components.S_ml} weight={data.weights.w_ml} />
                            <ComponentBar label="News Trend" value={data.components.S_dl} weight={data.weights.w_dl} />
                            <ComponentBar label="Gemini AI" value={data.components.S_trans} weight={data.weights.w_trans} />
                            <ComponentBar label="Macro Econ" value={data.components.S_macro} weight={data.weights.w_macro} />

                            {/* Macro Signals Breakdown */}
                            {data.macroSignals && (
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                                            Macro Breakdown
                                        </span>
                                        <span className={`text-[9px] px-1.5 py-0.5 font-mono uppercase ${
                                            data.macroSignals.dataFreshness === 'fresh'
                                                ? 'bg-green-100 text-green-700'
                                                : data.macroSignals.dataFreshness === 'stale'
                                                ? 'bg-yellow-100 text-yellow-700'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {data.macroSignals.dataFreshness}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-600">CPI (Inflation)</span>
                                            <span className={`font-mono ${
                                                data.macroSignals.cpiSignal > 0.1 ? 'text-defi-success' :
                                                data.macroSignals.cpiSignal < -0.1 ? 'text-defi-danger' :
                                                'text-gray-500'
                                            }`}>
                                                {(data.macroSignals.cpiSignal >= 0 ? '+' : '') + data.macroSignals.cpiSignal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-600">Fed Funds Rate</span>
                                            <span className={`font-mono ${
                                                data.macroSignals.rateSignal > 0.1 ? 'text-defi-success' :
                                                data.macroSignals.rateSignal < -0.1 ? 'text-defi-danger' :
                                                'text-gray-500'
                                            }`}>
                                                {(data.macroSignals.rateSignal >= 0 ? '+' : '') + data.macroSignals.rateSignal.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px]">
                                            <span className="text-gray-600">DXY (Dollar)</span>
                                            <span className={`font-mono ${
                                                data.macroSignals.dxySignal > 0.1 ? 'text-defi-success' :
                                                data.macroSignals.dxySignal < -0.1 ? 'text-defi-danger' :
                                                'text-gray-500'
                                            }`}>
                                                {(data.macroSignals.dxySignal >= 0 ? '+' : '') + data.macroSignals.dxySignal.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                                                data.macroSignals.interpretation.signal === 'bullish' ? 'bg-defi-success/10 text-defi-success' :
                                                data.macroSignals.interpretation.signal === 'bearish' ? 'bg-defi-danger/10 text-defi-danger' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {data.macroSignals.interpretation.signal}
                                            </span>
                                            <span className="text-[9px] text-gray-500 uppercase">
                                                {data.macroSignals.interpretation.strength}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {data.disagreementResolved && data.resolution && (
                                <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-yellow-500" />
                                    <span className="text-[10px] text-gray-500">
                                        Resolved via {data.resolution.source} ({data.resolution.signal})
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trending Topics */}
                    {data.trendingTopics.length > 0 && (
                        <div className="px-4 py-2 border-t border-gray-200 bg-black mt-auto">
                            <div className="flex flex-wrap gap-1">
                                {data.trendingTopics.slice(0, 4).map((topic, i) => (
                                    <span
                                        key={i}
                                        className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white font-mono uppercase"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="h-24 bg-gray-100 animate-pulse" />
            )}
        </div>
    );

    if (compact) {
        return (
            <>
                <button 
                    onClick={() => setShowDetails(true)}
                    className="flex items-center gap-3 px-3 py-1.5 bg-white border-2 border-black hover:bg-gray-50 transition-colors shadow-brutal-sm hover:shadow-brutal h-10"
                >
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-defi-purple" />
                        <span className="text-xs font-bold uppercase tracking-wider hidden md:block">S³ Sentiment</span>
                    </div>
                    {data ? (
                        <div className="flex items-center gap-2 pl-2 border-l-2 border-gray-200">
                            {data.label === 'Bullish' || data.label === 'Euphoric' ? (
                                <TrendingUp className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            ) : data.label === 'Bearish' ? (
                                <TrendingDown className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            ) : (
                                <Minus className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            )}
                            <span className="font-mono font-bold text-sm">{data.normalizedScore}</span>
                        </div>
                    ) : (
                        <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
                    )}
                </button>

                {showDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetails(false)}>
                        <div className="bg-white border-2 border-black w-full max-w-sm max-h-[80vh] flex flex-col shadow-brutal" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center p-3 border-b-2 border-black bg-gray-50">
                                <h3 className="font-bold uppercase text-sm flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-defi-purple" />
                                    S³ Sentiment Analysis
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={(e) => handleRefresh(e)} className="p-1 hover:bg-gray-200 rounded">
                                        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button onClick={() => setShowDetails(false)} className="p-1 hover:bg-gray-200 rounded">
                                        <Minus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <DetailedView />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Default Sidebar View
    return (
        <div className="p-4 border-t-2 border-black bg-white shrink-0 z-20">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-defi-purple" />
                    <span className="text-xs font-bold uppercase tracking-wider">S³ Sentiment</span>
                </div>
                <button
                    onClick={(e) => handleRefresh(e)}
                    disabled={isLoading}
                    className="hover:rotate-180 transition-transform"
                >
                    <RefreshCw className={`w-3 h-3 text-black ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="border-2 border-black">
                <DetailedView />
            </div>
        </div>
    );
};

export default S3SentimentPanel;
