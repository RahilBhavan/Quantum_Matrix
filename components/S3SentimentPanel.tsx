import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Minus, AlertCircle, Zap, X, Activity, Globe, BarChart3, Brain } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, Tooltip, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';
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
    const [history, setHistory] = useState<Array<{ time: string; score: number }>>([]);
    const [showModal, setShowModal] = useState(false);

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
                return [...prev, newPoint].slice(-12);
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
                toast.success('Sentiment data updated');
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
        return 'text-defi-text-muted';
    };

    const getLabelBg = (label: string) => {
        if (label === 'Bullish' || label === 'Euphoric') return 'from-defi-success/20 to-defi-cyan/20';
        if (label === 'Bearish') return 'from-defi-danger/20 to-defi-warning/20';
        return 'from-defi-card to-defi-card';
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return '#10B981';
        if (score >= 50) return '#7C3AED';
        if (score >= 30) return '#F59E0B';
        return '#EF4444';
    };

    const ComponentCard: React.FC<{ label: string; value: number; weight: number; icon: React.ReactNode }> = ({ label, value, weight, icon }) => {
        const isPositive = value > 0;
        const percentage = Math.abs(value) * 100;

        return (
            <div className="glass-card p-4 rounded-xl border border-defi-border hover:border-defi-accent/30 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-defi-purple/20 flex items-center justify-center">
                            {icon}
                        </div>
                        <span className="text-sm font-semibold text-defi-text">{label}</span>
                    </div>
                    <span className="text-xs font-mono px-2 py-1 rounded bg-defi-card text-defi-text-muted">
                        {(weight * 100).toFixed(0)}% weight
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-defi-card rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 rounded-full ${isPositive ? 'bg-gradient-to-r from-defi-success to-defi-cyan' : 'bg-gradient-to-r from-defi-danger to-defi-warning'}`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <span className={`text-sm font-mono font-bold ${isPositive ? 'text-defi-success' : 'text-defi-danger'}`}>
                        {isPositive ? '+' : ''}{value.toFixed(2)}
                    </span>
                </div>
            </div>
        );
    };

    // Compact Header Button
    if (compact) {
        return (
            <>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 glass-card border border-defi-border hover:border-defi-accent/50 transition-all duration-300 rounded-xl group"
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-defi-purple to-defi-accent flex items-center justify-center shadow-glow-purple">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    {data ? (
                        <div className="flex items-center gap-2">
                            {data.label === 'Bullish' || data.label === 'Euphoric' ? (
                                <TrendingUp className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            ) : data.label === 'Bearish' ? (
                                <TrendingDown className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            ) : (
                                <Minus className={`w-4 h-4 ${getLabelColor(data.label)}`} />
                            )}
                            <span className="font-mono font-bold text-lg text-defi-text">{data.normalizedScore}</span>
                            <span className={`text-xs font-semibold uppercase hidden lg:block ${getLabelColor(data.label)}`}>
                                {data.label}
                            </span>
                        </div>
                    ) : isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-defi-accent" />
                    ) : (
                        <span className="text-xs text-defi-text-muted">Load S³</span>
                    )}
                </button>

                {/* Full Page Modal */}
                {showModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-md animate-fade-in"
                        onClick={() => setShowModal(false)}
                    >
                        <div
                            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto glass-dark border border-defi-border rounded-3xl shadow-glass-lg animate-scale-in"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-defi-border bg-defi-bg/80 backdrop-blur-xl rounded-t-3xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-defi-purple to-defi-accent flex items-center justify-center shadow-glow-purple">
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-display font-bold text-defi-text">S³ Sentiment Analysis</h2>
                                        <p className="text-sm text-defi-text-secondary">Sentiment Synthesis Score • Real-time Market Intelligence</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={(e) => handleRefresh(e)}
                                        disabled={isLoading}
                                        className="p-3 rounded-xl glass-card border border-defi-border hover:border-defi-accent/50 transition-all"
                                    >
                                        <RefreshCw className={`w-5 h-5 text-defi-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-3 rounded-xl glass-card border border-defi-border hover:border-defi-danger/50 hover:bg-defi-danger/10 transition-all"
                                    >
                                        <X className="w-5 h-5 text-defi-text-secondary" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {data ? (
                                    <>
                                        {/* Main Score Section */}
                                        <div className={`p-8 rounded-2xl bg-gradient-to-br ${getLabelBg(data.label)} border border-defi-border`}>
                                            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                                                {/* Score Display */}
                                                <div className="flex items-center gap-6">
                                                    <div className="relative">
                                                        <div className="w-32 h-32 rounded-full bg-defi-card/50 flex items-center justify-center border-4 border-defi-border">
                                                            <span className="text-5xl font-mono font-bold text-defi-text">{data.normalizedScore}</span>
                                                        </div>
                                                        <div
                                                            className="absolute inset-0 rounded-full"
                                                            style={{
                                                                background: `conic-gradient(${getScoreColor(data.normalizedScore)} ${data.normalizedScore}%, transparent ${data.normalizedScore}%)`,
                                                                opacity: 0.3
                                                            }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {data.label === 'Bullish' || data.label === 'Euphoric' ? (
                                                                <TrendingUp className={`w-8 h-8 ${getLabelColor(data.label)}`} />
                                                            ) : data.label === 'Bearish' ? (
                                                                <TrendingDown className={`w-8 h-8 ${getLabelColor(data.label)}`} />
                                                            ) : (
                                                                <Minus className={`w-8 h-8 ${getLabelColor(data.label)}`} />
                                                            )}
                                                            <span className={`text-3xl font-display font-bold uppercase ${getLabelColor(data.label)}`}>
                                                                {data.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-defi-text-secondary">Confidence:</span>
                                                            <div className="w-24 h-2 bg-defi-card rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-defi-accent to-defi-purple rounded-full"
                                                                    style={{ width: `${data.confidence * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-sm font-mono font-bold text-defi-text">{Math.round(data.confidence * 100)}%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mini Chart */}
                                                {history.length > 1 && (
                                                    <div className="flex-1 h-32 min-w-[200px]">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <AreaChart data={history}>
                                                                <defs>
                                                                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                                                                        <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                                                                        <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                                                                    </linearGradient>
                                                                </defs>
                                                                <Tooltip
                                                                    content={({ active, payload }) => {
                                                                        if (active && payload && payload.length) {
                                                                            return (
                                                                                <div className="glass-dark text-defi-text px-3 py-2 text-sm font-mono rounded-lg border border-defi-border">
                                                                                    {payload[0].payload.time}: <span className="font-bold">{payload[0].value}</span>
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    }}
                                                                />
                                                                <Area
                                                                    type="monotone"
                                                                    dataKey="score"
                                                                    stroke="#7C3AED"
                                                                    strokeWidth={2}
                                                                    fill="url(#scoreGradient)"
                                                                />
                                                            </AreaChart>
                                                        </ResponsiveContainer>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        {data.summary && (
                                            <div className="glass-card p-6 rounded-2xl border border-defi-border">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-defi-text-secondary mb-3">Market Summary</h3>
                                                <p className="text-defi-text leading-relaxed">{data.summary}</p>
                                            </div>
                                        )}

                                        {/* Signal Components Grid */}
                                        <div>
                                            <h3 className="text-sm font-semibold uppercase tracking-wider text-defi-text-secondary mb-4">Signal Components</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                <ComponentCard
                                                    label="Fear & Greed Index"
                                                    value={data.components.S_lex}
                                                    weight={data.weights.w_lex}
                                                    icon={<Activity className="w-4 h-4 text-defi-purple-light" />}
                                                />
                                                <ComponentCard
                                                    label="Reddit Sentiment"
                                                    value={data.components.S_ml}
                                                    weight={data.weights.w_ml}
                                                    icon={<BarChart3 className="w-4 h-4 text-defi-purple-light" />}
                                                />
                                                <ComponentCard
                                                    label="News Trend"
                                                    value={data.components.S_dl}
                                                    weight={data.weights.w_dl}
                                                    icon={<Globe className="w-4 h-4 text-defi-purple-light" />}
                                                />
                                                <ComponentCard
                                                    label="Gemini AI Analysis"
                                                    value={data.components.S_trans}
                                                    weight={data.weights.w_trans}
                                                    icon={<Brain className="w-4 h-4 text-defi-purple-light" />}
                                                />
                                                <ComponentCard
                                                    label="Macro Economics"
                                                    value={data.components.S_macro}
                                                    weight={data.weights.w_macro}
                                                    icon={<TrendingUp className="w-4 h-4 text-defi-purple-light" />}
                                                />
                                            </div>
                                        </div>

                                        {/* Macro Signals */}
                                        {data.macroSignals && (
                                            <div className="glass-card p-6 rounded-2xl border border-defi-border">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-sm font-semibold uppercase tracking-wider text-defi-text-secondary">Macro Economic Signals</h3>
                                                    <span className={`text-xs px-2 py-1 rounded-full font-mono ${data.macroSignals.dataFreshness === 'fresh'
                                                            ? 'bg-defi-success/20 text-defi-success'
                                                            : data.macroSignals.dataFreshness === 'stale'
                                                                ? 'bg-defi-warning/20 text-defi-warning'
                                                                : 'bg-defi-card text-defi-text-muted'
                                                        }`}>
                                                        {data.macroSignals.dataFreshness}
                                                    </span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-4 bg-defi-card/50 rounded-xl">
                                                        <span className="text-xs text-defi-text-muted">CPI (Inflation)</span>
                                                        <div className={`text-xl font-mono font-bold mt-1 ${data.macroSignals.cpiSignal > 0.1 ? 'text-defi-success' :
                                                                data.macroSignals.cpiSignal < -0.1 ? 'text-defi-danger' :
                                                                    'text-defi-text-muted'
                                                            }`}>
                                                            {data.macroSignals.cpiSignal >= 0 ? '+' : ''}{data.macroSignals.cpiSignal.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-defi-card/50 rounded-xl">
                                                        <span className="text-xs text-defi-text-muted">Fed Funds Rate</span>
                                                        <div className={`text-xl font-mono font-bold mt-1 ${data.macroSignals.rateSignal > 0.1 ? 'text-defi-success' :
                                                                data.macroSignals.rateSignal < -0.1 ? 'text-defi-danger' :
                                                                    'text-defi-text-muted'
                                                            }`}>
                                                            {data.macroSignals.rateSignal >= 0 ? '+' : ''}{data.macroSignals.rateSignal.toFixed(2)}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-defi-card/50 rounded-xl">
                                                        <span className="text-xs text-defi-text-muted">DXY (Dollar Index)</span>
                                                        <div className={`text-xl font-mono font-bold mt-1 ${data.macroSignals.dxySignal > 0.1 ? 'text-defi-success' :
                                                                data.macroSignals.dxySignal < -0.1 ? 'text-defi-danger' :
                                                                    'text-defi-text-muted'
                                                            }`}>
                                                            {data.macroSignals.dxySignal >= 0 ? '+' : ''}{data.macroSignals.dxySignal.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                                {data.macroSignals.interpretation.summary && (
                                                    <p className="text-sm text-defi-text-secondary mt-4 leading-relaxed">
                                                        {data.macroSignals.interpretation.summary}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        {/* Trending Topics */}
                                        {data.trendingTopics && data.trendingTopics.length > 0 && (
                                            <div className="glass-card p-6 rounded-2xl border border-defi-border">
                                                <h3 className="text-sm font-semibold uppercase tracking-wider text-defi-text-secondary mb-4">Trending Topics</h3>
                                                <div className="flex flex-wrap gap-2">
                                                    {data.trendingTopics.map((topic, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1.5 bg-defi-purple/20 text-defi-purple-light font-medium text-sm rounded-full border border-defi-purple/30"
                                                        >
                                                            #{topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Resolution Info */}
                                        {data.disagreementResolved && data.resolution && (
                                            <div className="flex items-center gap-3 p-4 bg-defi-warning/10 rounded-xl border border-defi-warning/30">
                                                <AlertCircle className="w-5 h-5 text-defi-warning shrink-0" />
                                                <span className="text-sm text-defi-text">
                                                    Signal disagreement resolved via <strong>{data.resolution.source}</strong> ({data.resolution.signal})
                                                </span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-16">
                                        {isLoading ? (
                                            <>
                                                <RefreshCw className="w-12 h-12 animate-spin text-defi-accent mb-4" />
                                                <p className="text-defi-text-secondary">Analyzing market sentiment...</p>
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-12 h-12 text-defi-text-muted mb-4" />
                                                <p className="text-defi-text-secondary mb-4">No sentiment data available</p>
                                                <button
                                                    onClick={(e) => handleRefresh(e)}
                                                    className="px-6 py-3 bg-gradient-to-r from-defi-accent to-defi-purple text-white font-semibold rounded-xl hover:shadow-glow-purple transition-all"
                                                >
                                                    Analyze Now
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Default Sidebar View (non-compact)
    return (
        <div className="p-4 border-t border-defi-border glass-dark shrink-0 z-20">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-defi-purple to-defi-accent flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider text-defi-text">S³ Sentiment</span>
                </div>
                <button
                    onClick={(e) => handleRefresh(e)}
                    disabled={isLoading}
                    className="p-2 rounded-lg hover:bg-defi-card transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 text-defi-text-secondary ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {data ? (
                <div className="glass-card rounded-xl border border-defi-border p-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {data.label === 'Bullish' || data.label === 'Euphoric' ? (
                                <TrendingUp className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                            ) : data.label === 'Bearish' ? (
                                <TrendingDown className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                            ) : (
                                <Minus className={`w-5 h-5 ${getLabelColor(data.label)}`} />
                            )}
                            <span className={`text-lg font-bold uppercase ${getLabelColor(data.label)}`}>
                                {data.label}
                            </span>
                        </div>
                        <span className="text-2xl font-mono font-bold text-defi-text">{data.normalizedScore}</span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-defi-text-muted">Confidence</span>
                        <div className="flex-1 h-1.5 bg-defi-card rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-defi-accent to-defi-purple rounded-full"
                                style={{ width: `${data.confidence * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-mono text-defi-text">{Math.round(data.confidence * 100)}%</span>
                    </div>

                    {history.length > 1 && (
                        <div className="h-12">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#7C3AED"
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <button
                        onClick={() => setShowModal(true)}
                        className="w-full mt-3 py-2 text-xs font-semibold text-defi-accent hover:text-defi-accent-light transition-colors"
                    >
                        View Full Analysis →
                    </button>
                </div>
            ) : (
                <div className="glass-card rounded-xl border border-defi-border p-4 flex items-center justify-center h-24">
                    {isLoading ? (
                        <RefreshCw className="w-6 h-6 animate-spin text-defi-accent" />
                    ) : (
                        <span className="text-sm text-defi-text-muted">Click refresh to load</span>
                    )}
                </div>
            )}
        </div>
    );
};

export default S3SentimentPanel;
