import React, { useMemo, useState } from 'react';
import { Asset, PortfolioAllocation, Strategy, StrategyCondition, MarketSentiment } from '../types';
import { Plus, X, ArrowRight, Sparkles, BrainCircuit, Layers, Zap, Scale, Wand2 } from 'lucide-react';

interface Props {
  asset: Asset;
  allocation: PortfolioAllocation | null;
  strategies: Strategy[];
  currentSentiment: MarketSentiment | null;
  onDrop: (e: React.DragEvent, assetId: string) => void;
  onRemoveLayer: (assetId: string, layerId: string) => void;
  onUpdateCondition: (assetId: string, layerId: string, condition: StrategyCondition) => void;
  onUpdateWeight: (assetId: string, layerId: string, weight: number) => void;
  onDragStart: (e: React.DragEvent, strategyId: string) => void;
  onAutoFill: (assetId: string) => void;
  isGlobalDragging: boolean;
}

const CONDITIONS: StrategyCondition[] = ['Always', 'AI Adaptive', 'Bullish', 'Bearish', 'Neutral', 'Euphoric', 'High Volatility'];

// Determine if AI Adaptive strategy should be active based on sentiment-risk alignment
const isAiAdaptiveActive = (strategy: Strategy, sentiment: MarketSentiment | null): boolean => {
  if (!sentiment) return false;

  // Match risk levels with sentiment labels
  // High/Degen risk → Bullish/Euphoric sentiment
  // Medium risk → Neutral/Bullish sentiment
  // Low risk → Bearish/Neutral sentiment

  const score = sentiment.score;
  const riskLevel = strategy.riskLevel;

  if (riskLevel === 'Degen' || riskLevel === 'High') {
    // High risk strategies activate in bullish/euphoric markets (score >= 61)
    return score >= 61;
  } else if (riskLevel === 'Medium') {
    // Medium risk strategies activate in neutral to bullish markets (score 41-80)
    return score >= 41 && score <= 80;
  } else if (riskLevel === 'Low') {
    // Low risk strategies activate in bearish to neutral markets (score <= 60)
    return score <= 60;
  }

  return false;
};

const getBarColor = (index: number) => {
  const colors = ['bg-defi-accent', 'bg-defi-danger', 'bg-defi-purple', 'bg-yellow-400', 'bg-black'];
  return colors[index % colors.length];
};

const PipeConnector = () => (
  <div className="h-6 w-full flex items-center justify-center -my-1 relative z-0">
    <div className="w-1.5 h-full bg-black"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-black rounded-full shadow-sm"></div>
  </div>
);

// Deterministic Random for consistent sparklines across renders
const mulberry32 = (a: number) => {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Sparkline Component
const Sparkline = ({ assetId }: { assetId: string }) => {
  const { points, isPositive, percentage } = useMemo(() => {
    // Generate deterministic data based on assetId
    let seed = 0;
    for (let i = 0; i < assetId.length; i++) seed += assetId.charCodeAt(i);
    const rand = mulberry32(seed);

    const data = [];
    let val = 100;
    for (let i = 0; i < 12; i++) {
      val = val * (1 + (rand() - 0.48) * 0.15); // Slight bias for fun
      data.push(val);
    }

    const start = data[0];
    const end = data[data.length - 1];
    const isPositive = end >= start;
    const percentage = ((end - start) / start) * 100;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 40; // More compact width
    const height = 20;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height; // Invert Y
      return `${x},${y}`;
    }).join(' ');

    return { points, isPositive, percentage };
  }, [assetId]);

  const color = isPositive ? '#16a34a' : '#D94545';

  return (
    <div className="flex items-center gap-1.5">
      <svg width="40" height="20" viewBox="0 0 40 20" className="overflow-visible opacity-80">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="40" cy={points.split(' ').pop()?.split(',')[1]} r="1.5" fill={color} />
      </svg>
      <span className={`text-[9px] font-bold font-mono ${isPositive ? 'text-defi-success' : 'text-defi-danger'}`}>
        {isPositive ? '+' : ''}{percentage.toFixed(1)}%
      </span>
    </div>
  );
};

// Circular Gauge Component
const CircularGauge = ({ value, maxValue = 20 }: { value: number; maxValue?: number }) => {
  const percentage = Math.min((value / maxValue) * 100, 100);
  const radius = 28;
  const strokeWidth = 6;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Dynamic color based on yield level
  const getColor = () => {
    if (value >= 15) return '#16a34a'; // High yield - green
    if (value >= 8) return '#eab308'; // Medium yield - yellow
    return '#6b7280'; // Low yield - gray
  };

  const color = getColor();

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress circle */}
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference + ' ' + circumference}
          style={{
            strokeDashoffset,
            transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease'
          }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-sm leading-none tabular-nums" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="text-[8px] font-bold text-gray-400 leading-none mt-0.5">%</span>
      </div>
    </div>
  );
};

const AssetTile: React.FC<Props> = ({
  asset, allocation, strategies, currentSentiment,
  onDrop, onRemoveLayer, onUpdateCondition, onUpdateWeight, onDragStart, onAutoFill, isGlobalDragging
}) => {
  const [isOver, setIsOver] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(e, asset.id);
  };

  const { activeYield, totalAllocatedWeight, activeLayersCount } = useMemo(() => {
    if (!allocation || allocation.layers.length === 0) return { activeYield: 0, totalAllocatedWeight: 0, activeLayersCount: 0 };

    let weightedYieldSum = 0;
    let weightSum = 0;
    let count = 0;

    allocation.layers.forEach(layer => {
      const strategy = strategies.find(s => s.id === layer.strategyId);
      if (!strategy) return;
      weightedYieldSum += strategy.apy * (layer.weight / 100);
      weightSum += layer.weight;
      count++;
    });

    return { activeYield: weightedYieldSum, totalAllocatedWeight: weightSum, activeLayersCount: count };

  }, [allocation, currentSentiment, strategies]);

  return (
    <div
      className={`
        relative flex flex-col bg-white border-2 border-black h-[480px] w-full transition-shadow duration-300
        ${isOver ? 'shadow-brutal-hover ring-2 ring-defi-accent ring-inset' : 'shadow-brutal'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header Section */}
      <div className="p-4 border-b-2 border-black flex items-start justify-between bg-white relative z-10">
        <div className="flex items-start gap-4">
          {/* Square Logo Box */}
          <div className="w-16 h-16 border-2 border-black p-2 flex items-center justify-center bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]">
            <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div className="flex flex-col pt-1">
            <h3 className="font-display text-4xl font-bold leading-none uppercase">{asset.symbol}</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{asset.name}</p>
          </div>
        </div>

        <div className="text-right flex flex-col items-end pt-1">
          {/* Total Balance */}
          <div className="text-2xl font-mono font-bold tabular-nums text-black leading-none mb-2">
            ${asset.balance.toLocaleString()}
          </div>

          {/* Price + Sparkline Pill */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-2 py-1 rounded-sm">
            <span className="text-xs font-bold font-mono text-gray-500 tabular-nums">${asset.price.toLocaleString()}</span>
            <div className="h-3 w-px bg-gray-300"></div>
            <Sparkline assetId={asset.id} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative bg-grid-pattern p-4 flex flex-col">

        {allocation && allocation.layers.length > 0 ? (
          <div className="overflow-y-auto custom-scrollbar h-full pr-1 pb-12">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Active Stack</span>
            </div>

            {allocation.layers.map((layer, index) => {
              const strategy = strategies.find(s => s.id === layer.strategyId);
              if (!strategy) return null;

              // Check if this is an AI Adaptive strategy and if it's currently active
              const isAdaptive = layer.condition === 'AI Adaptive';
              const isActive = isAdaptive ? isAiAdaptiveActive(strategy, currentSentiment) : true;

              return (
                <div
                  key={layer.id}
                  className={`relative mb-2 group transition-opacity duration-300 ${!isActive ? 'opacity-50' : 'opacity-100'}`}
                  onMouseEnter={() => setHoveredLayerId(layer.id)}
                  onMouseLeave={() => setHoveredLayerId(null)}
                >
                  <div className="border-2 border-black bg-white p-3 shadow-sm relative z-10 flex flex-col gap-2">
                    {/* Color Strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBarColor(index)} border-r-2 border-black`} />

                    <div className="pl-3 flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-bold uppercase truncate">{strategy.name}</span>
                        {/* AI Adaptive Status Indicator */}
                        {isAdaptive && (
                          <div
                            className={`flex items-center gap-1 px-1.5 py-0.5 border ${isActive ? 'bg-defi-success/10 border-defi-success text-defi-success' : 'bg-gray-100 border-gray-300 text-gray-400'}`}
                            title={isActive ? 'AI: Active - Risk matches sentiment' : 'AI: Inactive - Waiting for alignment'}
                          >
                            <BrainCircuit className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase">{isActive ? 'ON' : 'OFF'}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onRemoveLayer(asset.id, layer.id) }} className="text-gray-400 hover:text-red-500 ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Adaptive Info Banner */}
                    {isAdaptive && hoveredLayerId === layer.id && (
                      <div className="pl-3 pr-2 pb-1">
                        <div className="bg-gray-50 border border-gray-200 p-2 text-[10px] leading-relaxed">
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="w-3 h-3 text-defi-purple mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-gray-700">AI Adaptive Mode:</span>
                              <span className="text-gray-600"> This strategy activates when </span>
                              <span className="font-bold text-black">{strategy.riskLevel}</span>
                              <span className="text-gray-600"> risk aligns with market sentiment.</span>
                              {currentSentiment && (
                                <div className="mt-1 text-gray-500">
                                  Current: <span className="font-bold">{currentSentiment.label}</span> ({currentSentiment.score}/100) →
                                  <span className={`font-bold ml-1 ${isActive ? 'text-defi-success' : 'text-gray-400'}`}>
                                    {isActive ? '✓ Match' : '✗ No Match'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pl-3 flex items-center justify-between gap-2">
                      {/* Condition Selector */}
                      <div className={`flex items-center gap-1 border px-1.5 py-0.5 ${isAdaptive ? 'bg-defi-purple/5 border-defi-purple' : 'bg-gray-100 border-black'}`}>
                        <span className="text-[10px] font-bold">IF</span>
                        <select
                          value={layer.condition}
                          onChange={(e) => onUpdateCondition(asset.id, layer.id, e.target.value as StrategyCondition)}
                          className="bg-transparent text-[10px] font-bold uppercase focus:outline-none cursor-pointer"
                        >
                          {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      {/* Weight Input */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                          type="range" min="0" max="100" value={layer.weight}
                          onChange={(e) => onUpdateWeight(asset.id, layer.id, parseInt(e.target.value))}
                          className="w-16 h-1 bg-gray-200 rounded-none appearance-none cursor-pointer accent-black"
                        />
                        <span className="text-[10px] font-mono font-bold w-6 text-right">{Math.round(layer.weight)}%</span>
                      </div>
                    </div>
                  </div>
                  {/* Pipe */}
                  {index < allocation.layers.length - 1 && <PipeConnector />}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 hover:opacity-60 transition-opacity border-2 border-dashed border-gray-300 rounded-lg bg-white/50 relative">
            {/* Stacking Illustration */}
            <div className="mb-6 relative">
              <img
                src="/stacking-illustration.png"
                alt="Stack strategies"
                className="w-32 h-32 object-contain opacity-50 pointer-events-none select-none"
              />
            </div>
            <span className="text-sm font-bold uppercase text-gray-400 tracking-widest mb-4">Drag Strategy Block</span>

            <button
              onClick={() => onAutoFill(asset.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 shadow-sm text-xs font-bold text-gray-500 hover:text-black hover:border-black hover:shadow-brutal-sm transition-all uppercase"
            >
              <Wand2 className="w-3 h-3" /> Quick Fill
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-white border-t-2 border-black p-4 shrink-0 flex items-center gap-4">
        <CircularGauge value={activeYield} maxValue={20} />
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest leading-none mb-1">Est. Yield</span>
          <div className="flex items-baseline gap-1">
            <span className="font-mono font-bold text-xl leading-none tabular-nums">
              {activeYield.toFixed(2)}%
            </span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">APY</span>
          </div>
          {totalAllocatedWeight > 0 && (
            <div className="mt-1 flex items-center gap-1">
              <div className="h-1 w-16 bg-gray-200 border border-gray-300 overflow-hidden">
                <div
                  className="h-full bg-black transition-all duration-300"
                  style={{ width: `${Math.min(totalAllocatedWeight, 100)}%` }}
                />
              </div>
              <span className="text-[8px] font-mono font-bold text-gray-500">
                {Math.round(totalAllocatedWeight)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetTile;