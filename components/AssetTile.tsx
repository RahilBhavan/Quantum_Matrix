import React, { useMemo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Asset, PortfolioAllocation, Strategy, StrategyCondition, MarketSentiment } from '../types';
import { Plus, X, ArrowRight, Sparkles, BrainCircuit, Layers, Zap, Scale, Wand2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import VaultActionModal from './VaultActionModal';
import StrategyPickerModal from './StrategyPickerModal';

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
  onAddStrategy?: (assetId: string, strategyId: string) => void;
  isGlobalDragging: boolean;
  useDndKit?: boolean; // Enable dnd-kit mode
  // Keyboard accessibility props
  selectedStrategyId?: string | null;
  onKeyboardDrop?: (strategyId: string, assetId: string) => void;
}

const CONDITIONS: StrategyCondition[] = ['Always', 'AI Adaptive', 'Bullish', 'Bearish', 'Neutral', 'Euphoric', 'High Volatility'];

// Determine if AI Adaptive strategy should be active based on sentiment-risk alignment
const isAiAdaptiveActive = (strategy: Strategy, sentiment: MarketSentiment | null): boolean => {
  if (!sentiment) return false;

  const score = sentiment.score;
  const riskLevel = strategy.riskLevel;

  if (riskLevel === 'Degen' || riskLevel === 'High') {
    return score >= 61;
  } else if (riskLevel === 'Medium') {
    return score >= 41 && score <= 80;
  } else if (riskLevel === 'Low') {
    return score <= 60;
  }

  return false;
};

// Determine if any layer is active based on condition and sentiment
const isLayerActive = (condition: StrategyCondition, strategy: Strategy, sentiment: MarketSentiment | null): boolean => {
  if (condition === 'Always') return true;
  if (!sentiment) return false;

  const { score } = sentiment;
  switch (condition) {
    case 'AI Adaptive': return isAiAdaptiveActive(strategy, sentiment);
    case 'Bullish': return score >= 61;
    case 'Bearish': return score <= 40;
    case 'Neutral': return score > 40 && score < 61;
    case 'Euphoric': return score >= 81;
    case 'High Volatility': return false; // Not supported yet
    default: return false;
  }
};

// Gradient colors for strategy layers
const getLayerGradient = (index: number) => {
  const gradients = [
    'from-defi-accent to-defi-purple',
    'from-defi-danger to-defi-warning',
    'from-defi-purple to-defi-cyan',
    'from-defi-success to-defi-cyan',
    'from-defi-warning to-defi-accent',
  ];
  return gradients[index % gradients.length];
};

// Pipe connector between strategy layers
const PipeConnector = () => (
  <div className="h-4 w-full flex items-center justify-center -my-0.5 relative z-0">
    <div className="w-0.5 h-full bg-defi-border"></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-defi-accent/50 rounded-full shadow-glow-accent"></div>
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

// Sparkline Component with gradient
const Sparkline = ({ assetId }: { assetId: string }) => {
  const { points, isPositive, percentage } = useMemo(() => {
    // Generate deterministic data based on assetId
    let seed = 0;
    for (let i = 0; i < assetId.length; i++) seed += assetId.charCodeAt(i);
    const rand = mulberry32(seed);

    const data = [];
    let val = 100;
    for (let i = 0; i < 12; i++) {
      val = val * (1 + (rand() - 0.48) * 0.15);
      data.push(val);
    }

    const start = data[0];
    const end = data[data.length - 1];
    const isPositive = end >= start;
    const percentage = ((end - start) / start) * 100;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const width = 48;
    const height = 24;

    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return { points, isPositive, percentage };
  }, [assetId]);

  const gradientId = `sparkline-${assetId}`;
  const color = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="flex items-center gap-2">
      <svg width="48" height="24" viewBox="0 0 48 24" className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <polyline
          points={points}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="48" cy={points.split(' ').pop()?.split(',')[1]} r="2.5" fill={color} className="animate-pulse" />
      </svg>
      <span className={`text-xs font-semibold font-mono tabular-nums ${isPositive ? 'text-defi-success' : 'text-defi-danger'}`}>
        {isPositive ? '+' : ''}{percentage.toFixed(1)}%
      </span>
    </div>
  );
};

// CircularGauge removed - using text-only APY display for cleaner UI

const AssetTile: React.FC<Props> = ({
  asset, allocation, strategies, currentSentiment,
  onDrop, onRemoveLayer, onUpdateCondition, onUpdateWeight, onDragStart, onAutoFill, onAddStrategy,
  isGlobalDragging,
  useDndKit = true,
  selectedStrategyId,
  onKeyboardDrop,
}) => {
  const [isOver, setIsOver] = useState(false);
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [vaultAction, setVaultAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // dnd-kit droppable
  const { setNodeRef, isOver: isDndKitOver } = useDroppable({
    id: asset.id,
    data: {
      type: 'asset',
      assetId: asset.id,
      asset,
    },
  });

  // Use dnd-kit isOver or HTML5 isOver based on mode
  const isActiveOver = useDndKit ? isDndKitOver : isOver;

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

      const isActive = isLayerActive(layer.condition, strategy, currentSentiment);

      if (isActive) {
        weightedYieldSum += strategy.apy * (layer.weight / 100);
      }

      weightSum += layer.weight;
      count++;
    });

    return { activeYield: weightedYieldSum, totalAllocatedWeight: weightSum, activeLayersCount: count };

  }, [allocation, currentSentiment, strategies]);

  return (
    <div
      ref={useDndKit ? setNodeRef : undefined}
      tabIndex={selectedStrategyId ? 0 : -1}
      role="button"
      aria-label={`${asset.symbol} asset tile. ${selectedStrategyId ? 'Press Enter to drop selected strategy here.' : ''}`}
      aria-dropeffect={selectedStrategyId ? 'move' : 'none'}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && selectedStrategyId && onKeyboardDrop) {
          e.preventDefault();
          onKeyboardDrop(selectedStrategyId, asset.id);
        }
      }}
      className={`
        relative flex flex-col rounded-xl w-full transition-all duration-200
        bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-lg
        border border-white/[0.08] hover:border-white/[0.12]
        shadow-lg shadow-black/10
        focus:outline-none focus-visible:ring-2 focus-visible:ring-defi-accent
        ${isActiveOver ? 'ring-2 ring-defi-accent border-defi-accent/40' : ''}
        ${selectedStrategyId ? 'cursor-pointer hover:ring-1 hover:ring-defi-purple/50' : ''}
      `}
      {...(!useDndKit ? {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
      } : {})}
    >
      {/* Header Section - Compact */}
      <div className="px-4 py-3 border-b border-defi-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-defi-card border border-white/10 p-1.5 flex items-center justify-center">
            <img src={asset.icon} alt={asset.symbol} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-defi-text leading-none">{asset.symbol}</h3>
            <p className="text-[10px] text-defi-text-muted">{asset.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-mono font-bold tabular-nums text-defi-text">
            ${asset.balance.toLocaleString()}
          </div>
          <div className="flex items-center gap-2 justify-end">
            <span className="text-[10px] font-mono text-defi-text-muted">${asset.price.toLocaleString()}</span>
            <Sparkline assetId={asset.id} />
          </div>
        </div>
      </div>

      {/* Main Content Area - Compact */}
      <div className="flex-1 overflow-hidden relative p-3 flex flex-col min-h-[120px]">

        {allocation && allocation.layers.length > 0 ? (
          <div className="overflow-y-auto custom-scrollbar h-full pr-1 pb-12">
            <div className="flex items-center justify-between mb-3 pr-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-defi-text-muted" />
                <span className="text-xs font-medium text-defi-text-secondary">Active Stack</span>
              </div>
              <button
                onClick={() => setIsPickerOpen(true)}
                className="text-xs font-medium flex items-center gap-1 text-defi-accent-light hover:text-defi-accent transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Strategy
              </button>
            </div>

            {allocation.layers.map((layer, index) => {
              const strategy = strategies.find(s => s.id === layer.strategyId);
              if (!strategy) return null;

              // Check if this layer is currently active based on condition and sentiment
              const isAdaptive = layer.condition === 'AI Adaptive';
              const isActive = isLayerActive(layer.condition, strategy, currentSentiment);

              return (
                <div
                  key={layer.id}
                  className={`relative mb-2 group transition-all duration-300 animate-fade-in ${!isActive ? 'opacity-50 grayscale-[30%]' : 'opacity-100'}`}
                  onMouseEnter={() => setHoveredLayerId(layer.id)}
                  onMouseLeave={() => setHoveredLayerId(null)}
                >
                  <div className={`bg-white/[0.03] border rounded-xl p-3 relative z-10 flex flex-col gap-2 transition-all duration-200 ${hoveredLayerId === layer.id ? 'border-white/20 bg-white/[0.05] shadow-lg' : 'border-white/[0.08]'}`}>
                    {/* Gradient accent strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${getLayerGradient(index)} ${hoveredLayerId === layer.id ? 'opacity-100' : 'opacity-70'}`} />

                    <div className="pl-3 flex justify-between items-center">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-semibold text-defi-text truncate">{strategy.name}</span>
                        {/* AI Adaptive Status Indicator */}
                        {isAdaptive && (
                          <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isActive ? 'bg-defi-success/20 text-defi-success-light' : 'bg-defi-card text-defi-text-muted'}`}
                            title={isActive ? 'AI: Active - Risk matches sentiment' : 'AI: Inactive - Waiting for alignment'}
                          >
                            <BrainCircuit className="w-3 h-3" />
                            <span>{isActive ? 'ON' : 'OFF'}</span>
                          </div>
                        )}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); onRemoveLayer(asset.id, layer.id) }} className="text-defi-text-muted hover:text-defi-danger transition-colors ml-2">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Adaptive Info Banner */}
                    {isAdaptive && hoveredLayerId === layer.id && (
                      <div className="pl-3 pr-2 pb-1">
                        <div className="glass rounded-lg p-2.5 text-[10px] leading-relaxed">
                          <div className="flex items-start gap-1.5">
                            <Sparkles className="w-3 h-3 text-defi-purple-light mt-0.5 shrink-0" />
                            <div>
                              <span className="font-semibold text-defi-text">AI Adaptive Mode:</span>
                              <span className="text-defi-text-secondary"> This strategy activates when </span>
                              <span className="font-semibold text-defi-accent-light">{strategy.riskLevel}</span>
                              <span className="text-defi-text-secondary"> risk aligns with market sentiment.</span>
                              {currentSentiment && (
                                <div className="mt-1.5 text-defi-text-muted">
                                  Current: <span className="font-semibold text-defi-text">{currentSentiment.label}</span> ({currentSentiment.score}/100) →
                                  <span className={`font-semibold ml-1 ${isActive ? 'text-defi-success' : 'text-defi-text-muted'}`}>
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
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isAdaptive ? 'bg-defi-purple/10 border border-defi-purple/30' : 'bg-defi-card border border-defi-border'}`}>
                        <span className="text-[10px] font-semibold text-defi-text-muted">IF</span>
                        <select
                          value={layer.condition}
                          onChange={(e) => onUpdateCondition(asset.id, layer.id, e.target.value as StrategyCondition)}
                          className="bg-transparent text-[10px] font-semibold text-defi-text focus:outline-none cursor-pointer"
                        >
                          {CONDITIONS.map(c => <option key={c} value={c} className="bg-defi-bg-secondary text-defi-text">{c}</option>)}
                        </select>
                      </div>

                      {/* Weight Input */}
                      <div className="flex items-center gap-2 flex-1 justify-end">
                        <input
                          type="range" min="0" max="100" value={layer.weight}
                          onChange={(e) => onUpdateWeight(asset.id, layer.id, parseInt(e.target.value))}
                          className="w-16 h-1 bg-defi-border rounded-full appearance-none cursor-pointer accent-defi-accent"
                        />
                        <span className="text-[10px] font-mono font-semibold w-8 text-right text-defi-text">{Math.round(layer.weight)}%</span>
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
          <div className={`h-full flex flex-col items-center justify-center text-center p-4 m-1 rounded-lg border border-dashed transition-colors ${isActiveOver ? 'border-defi-accent bg-defi-accent/5' : 'border-defi-border/40'}`}>
            <Layers className={`w-6 h-6 mb-2 ${isActiveOver ? 'text-defi-accent' : 'text-defi-text-muted/50'}`} />
            <span className="text-xs text-defi-text-muted mb-3">Drop strategy or use Quick Fill</span>
            <button
              onClick={() => onAutoFill(asset.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-defi-accent/10 border border-defi-accent/30 rounded-lg text-xs font-medium text-defi-accent-light hover:bg-defi-accent hover:text-white transition-colors"
            >
              <Wand2 className="w-3 h-3" /> Quick Fill
            </button>
          </div>
        )}
      </div>

      {/* Footer - Streamlined */}
      <div className="border-t border-defi-border/40 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className={`font-mono font-bold text-lg tabular-nums ${activeYield >= 15 ? 'text-defi-success' : activeYield >= 8 ? 'text-defi-warning' : 'text-defi-text'}`}>
              {activeYield.toFixed(2)}%
            </span>
            <span className="text-[10px] text-defi-text-muted">APY</span>
          </div>
          {totalAllocatedWeight > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-defi-bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-defi-accent to-defi-purple rounded-full"
                  style={{ width: `${Math.min(totalAllocatedWeight, 100)}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-defi-text-muted">{Math.round(totalAllocatedWeight)}%</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setVaultAction('deposit'); setShowVaultModal(true); }}
            className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-defi-accent to-defi-purple text-white font-medium text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" /> Deposit
          </button>
          <button
            onClick={() => { setVaultAction('withdraw'); setShowVaultModal(true); }}
            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-defi-text font-medium text-xs flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors"
          >
            <ArrowUpFromLine className="w-3.5 h-3.5" /> Withdraw
          </button>
        </div>
      </div>

      {/* Vault Modal */}
      <VaultActionModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
        action={vaultAction}
        asset={asset}
        onSuccess={() => {
          // Optionally refresh balances or show success message
          console.log('Vault transaction successful');
        }}
      />

      {/* Strategy Picker Modal */}
      <StrategyPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        strategies={strategies}
        currentSentiment={currentSentiment}
        onSelect={(strategy) => {
          if (onAddStrategy) onAddStrategy(asset.id, strategy.id);
        }}
        remainingWeight={Math.max(0, 100 - totalAllocatedWeight)}
      />
    </div>
  );
};

export default AssetTile;