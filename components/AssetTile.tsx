import React, { useMemo, useState } from 'react';
import { Asset, PortfolioAllocation, Strategy, StrategyCondition, MarketSentiment } from '../types';
import { Plus, X, ArrowRight, Sparkles, BrainCircuit, Layers, Zap, Scale, Wand2, Box } from 'lucide-react';

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
    return function() {
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
        for(let i = 0; i < assetId.length; i++) seed += assetId.charCodeAt(i);
        const rand = mulberry32(seed);

        const data = [];
        let val = 100;
        for(let i = 0; i < 12; i++) {
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

               return (
                 <div 
                    key={layer.id} 
                    className="relative mb-2 group"
                    onMouseEnter={() => setHoveredLayerId(layer.id)}
                    onMouseLeave={() => setHoveredLayerId(null)}
                 >
                    <div className="border-2 border-black bg-white p-3 shadow-sm relative z-10 flex flex-col gap-2">
                        {/* Color Strip */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getBarColor(index)} border-r-2 border-black`} />
                        
                        <div className="pl-3 flex justify-between items-center">
                            <span className="text-sm font-bold uppercase truncate">{strategy.name}</span>
                            <button onClick={(e) => {e.stopPropagation(); onRemoveLayer(asset.id, layer.id)}} className="text-gray-400 hover:text-red-500">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="pl-3 flex items-center justify-between gap-2">
                             {/* Condition Selector */}
                             <div className="flex items-center gap-1 bg-gray-100 border border-black px-1.5 py-0.5">
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
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40 hover:opacity-100 transition-opacity border-2 border-dashed border-gray-300 rounded-lg bg-white/50">
             <div className="mb-4">
                 <Box className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
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
      <div className="bg-white border-t-2 border-black p-4 shrink-0 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-black flex items-center justify-center">
                <Zap className="w-4 h-4 text-black" fill="currentColor" />
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-gray-400 tracking-widest leading-none mb-1">Est. Yield</span>
                <span className="font-mono font-bold text-xl leading-none tabular-nums">
                    {activeYield.toFixed(2)}%
                </span>
            </div>
      </div>
    </div>
  );
};

export default AssetTile;