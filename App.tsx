import React, { useState, useEffect, useMemo } from 'react';
import { STRATEGIES, ECOSYSTEMS, MOCK_NEWS_FEED } from './constants';
import { PortfolioAllocation, MarketSentiment, AiRecommendation, StrategyCondition } from './types';
import StrategyDraggable from './components/StrategyDraggable';
import AssetTile from './components/AssetTile';
import { analyzeSentiment, getPortfolioRecommendation } from './services/geminiService';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  Layers, Box, BrainCircuit, Search,
  ArrowRight, Loader2, RefreshCw, Zap, TrendingUp,
  LayoutGrid, Sparkles, Wallet
} from 'lucide-react';

const INITIAL_HISTORY = [
  { time: '09:00', score: 62 },
  { time: '10:00', score: 65 },
  { time: '11:00', score: 58 },
  { time: '12:00', score: 72 },
];

const App: React.FC = () => {
  const [selectedEcosystemId, setSelectedEcosystemId] = useState<string>(ECOSYSTEMS[2].id); // Default to Arbitrum
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState(INITIAL_HISTORY);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDraggingStrategy, setIsDraggingStrategy] = useState(false);

  const currentEcosystem = useMemo(() => 
    ECOSYSTEMS.find(e => e.id === selectedEcosystemId) || ECOSYSTEMS[0], 
    [selectedEcosystemId]
  );

  const filteredStrategies = useMemo(() => 
    STRATEGIES.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.type.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm]
  );

  const ecosystemBalance = useMemo(() => 
    currentEcosystem.assets.reduce((sum, asset) => sum + asset.balance, 0),
    [currentEcosystem]
  );

  useEffect(() => {
    handleAnalyzeMarket();
  }, []);

  useEffect(() => {
    const existingIds = new Set(allocations.map(a => a.assetId));
    const newAllocations: PortfolioAllocation[] = [];
    ECOSYSTEMS.forEach(eco => {
      eco.assets.forEach(asset => {
        if (!existingIds.has(asset.id)) {
          newAllocations.push({ assetId: asset.id, layers: [] });
        }
      });
    });
    if (newAllocations.length > 0) {
      setAllocations(prev => [...prev, ...newAllocations]);
    }
  }, []); 

  const handleDragStart = (e: React.DragEvent, strategyId: string) => {
    e.dataTransfer.setData('strategyId', strategyId);
    setIsDraggingStrategy(true);
  };

  const handleDragEnd = () => {
    setIsDraggingStrategy(false);
  };

  const handleDrop = (e: React.DragEvent, assetId: string) => {
    const strategyId = e.dataTransfer.getData('strategyId');
    setIsDraggingStrategy(false);
    if (!strategyId) return;
    addLayer(assetId, strategyId);
  };

  const addLayer = (assetId: string, strategyId: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.assetId === assetId) {
        const currentLayers = a.layers;
        const newWeight = currentLayers.length === 0 ? 100 : 50; 
        const scaleFactor = (100 - newWeight) / 100;
        const adjustedLayers = currentLayers.map(l => ({ ...l, weight: l.weight * scaleFactor }));
        const newLayer = {
          id: Math.random().toString(36).substr(2, 9),
          strategyId,
          condition: 'Always' as StrategyCondition,
          weight: newWeight
        };
        return { ...a, layers: [...adjustedLayers, newLayer] };
      }
      return a;
    }));
  };

  const handleAutoFill = (assetId: string) => {
    const targetStrategy = sentiment?.label.includes('Bull') 
        ? STRATEGIES.find(s => s.type === 'Momentum') 
        : STRATEGIES.find(s => s.type === 'Yield');
    if (targetStrategy) addLayer(assetId, targetStrategy.id);
  };

  const handleUpdateCondition = (assetId: string, layerId: string, condition: StrategyCondition) => {
    setAllocations(prev => prev.map(a => {
      if (a.assetId === assetId) {
        return { ...a, layers: a.layers.map(l => l.id === layerId ? { ...l, condition } : l) };
      }
      return a;
    }));
  };

  const handleUpdateWeight = (assetId: string, layerId: string, weight: number) => {
    const newWeight = Math.max(0, Math.min(100, weight));
    setAllocations(prev => prev.map(a => {
      if (a.assetId === assetId) {
        const otherLayers = a.layers.filter(l => l.id !== layerId);
        if (otherLayers.length === 0) {
          return { ...a, layers: a.layers.map(l => l.id === layerId ? { ...l, weight: newWeight } : l) };
        }
        const remainingSpace = 100 - newWeight;
        const currentOtherTotal = otherLayers.reduce((sum, l) => sum + l.weight, 0);
        const updatedLayers = a.layers.map(l => {
            if (l.id === layerId) return { ...l, weight: newWeight };
            const proportion = currentOtherTotal === 0 ? 1 / otherLayers.length : l.weight / currentOtherTotal;
            return { ...l, weight: remainingSpace * proportion };
        });
        return { ...a, layers: updatedLayers };
      }
      return a;
    }));
  };

  const handleRemoveLayer = (assetId: string, layerId: string) => {
    setAllocations(prev => prev.map(a => {
      if (a.assetId === assetId) {
        const remainingLayers = a.layers.filter(l => l.id !== layerId);
        if (remainingLayers.length > 0) {
            const totalWeight = remainingLayers.reduce((sum, l) => sum + l.weight, 0);
            const scaleFactor = totalWeight > 0 ? 100 / totalWeight : 1;
            return { ...a, layers: remainingLayers.map(l => ({ ...l, weight: l.weight * scaleFactor })) };
        }
        return { ...a, layers: remainingLayers };
      }
      return a;
    }));
  };

  const handleAnalyzeMarket = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSentiment(MOCK_NEWS_FEED);
      setSentiment(result);
      setSentimentHistory(prev => {
        const newPoint = { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), score: result.score };
        return [...prev, newPoint].slice(-10);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoRebalance = async () => {
    if (!sentiment) return;
    setIsRebalancing(true);
    try {
      const recommendation = await getPortfolioRecommendation(sentiment, currentEcosystem, STRATEGIES);
      setAiRecommendation(recommendation);
      setTimeout(() => {
        setAllocations(prev => {
           return prev.map(current => {
             const rec = recommendation.allocations.find(r => r.assetId === current.assetId);
             if (rec) {
                const newLayers = rec.layers.map(l => ({
                   id: Math.random().toString(36).substr(2, 9),
                   strategyId: l.strategyId,
                   condition: l.condition,
                   weight: l.weight
                }));
                return { ...current, layers: newLayers };
             }
             return current;
           });
        });
        setIsRebalancing(false);
      }, 1500);
    } catch (e) {
      console.error(e);
      setIsRebalancing(false);
    }
  };

  const getAssetAllocation = (assetId: string) => allocations.find(a => a.assetId === assetId);

  return (
    <div className="flex h-screen bg-defi-bg text-black font-sans overflow-hidden">
      <style>{`
          @keyframes gradientMove {
              0% { background-position: 0% 50%; }
              50% { background-position: 100% 50%; }
              100% { background-position: 0% 50%; }
          }
      `}</style>
      
      {/* Sidebar */}
      <aside className="w-[340px] flex flex-col border-r-2 border-black bg-white z-20 shadow-xl">
        <div className="p-6 border-b-2 border-black bg-black text-white shrink-0">
          <div className="flex items-center gap-2 mb-1">
             <Layers className="w-6 h-6" />
             <h1 className="text-2xl font-display font-bold tracking-tight uppercase">DEFI LEGO</h1>
          </div>
          <p className="text-xs text-gray-400 font-mono tracking-widest uppercase opacity-70">Quantum Matrix v1.0</p>
        </div>

        <div className="p-4 border-b-2 border-black sticky top-0 z-20 bg-white">
           <button className="w-full border-2 border-black p-3 flex items-center justify-center gap-2 text-sm font-bold uppercase hover:bg-gray-100 transition-colors">
              Search Strategies
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar bg-gray-50 relative">
           <div className="flex items-center justify-between mb-4 pt-4 pb-2 border-b-2 border-black sticky top-0 bg-gray-50 z-10">
              <span className="text-sm font-bold text-black uppercase tracking-wider">Strategy Blocks</span>
              <span className="text-xs bg-black text-white px-2 py-0.5 font-bold">{filteredStrategies.length}</span>
           </div>
           
           <div className="pb-2">
             {filteredStrategies.map(strat => (
               <StrategyDraggable 
                 key={strat.id} 
                 strategy={strat} 
                 onDragStart={handleDragStart} 
                 onDragEnd={handleDragEnd}
               />
             ))}
           </div>
        </div>

        {/* Sentiment Footer */}
        <div className="p-4 border-t-2 border-black bg-white shrink-0 z-20">
           <div className="flex justify-between items-center mb-2">
             <span className="text-xs font-bold uppercase tracking-wider">Market Sentiment</span>
             <button onClick={handleAnalyzeMarket} disabled={isAnalyzing} className="hover:rotate-180 transition-transform">
               <RefreshCw className={`w-3 h-3 text-black ${isAnalyzing ? 'animate-spin' : ''}`} />
             </button>
           </div>
           
           <div className="border-2 border-black bg-white p-4 shadow-brutal-sm relative">
              {sentiment ? (
                <>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-xl font-display font-bold uppercase ${
                        sentiment.label.includes('Bull') ? 'text-defi-success' : 
                        sentiment.label.includes('Bear') ? 'text-defi-danger' : 'text-black'
                        }`}>
                        {sentiment.label}
                        </span>
                        <span className="text-3xl font-mono font-bold">{sentiment.score}</span>
                    </div>
                    {/* Tiny Chart */}
                     <div className="h-12 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sentimentHistory}>
                                <Line 
                                    type="step" 
                                    dataKey="score" 
                                    stroke="#000000" 
                                    strokeWidth={2} 
                                    dot={false}
                                    isAnimationActive={true}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
              ) : (
                <div className="h-16 bg-gray-100 animate-pulse w-full"></div>
              )}
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-defi-bg">
        
        {/* Header - Compact Version */}
        <header className="h-16 border-b-2 border-black bg-white flex items-end justify-between px-6 z-20 sticky top-0 shadow-sm">
           {/* Left: Ecosystem Tabs */}
           <div className="flex items-end gap-4 h-full flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 hidden md:block shrink-0">Active Ecosystem:</span>
              
              <div className="flex items-end -mb-[2px] h-full w-full overflow-x-auto no-scrollbar gap-1">
                {ECOSYSTEMS.map(eco => {
                  const isActive = selectedEcosystemId === eco.id;
                  const nameParts = eco.name.split(' ');
                  
                  return (
                    <button
                      key={eco.id}
                      onClick={() => { setSelectedEcosystemId(eco.id); setAiRecommendation(null); }}
                      className={`
                        group flex items-center gap-2 px-5 transition-all relative shrink-0
                        ${isActive 
                          ? 'bg-defi-bg border-2 border-black border-b-0 rounded-t-lg text-black z-10 h-[48px]' 
                          : 'text-gray-400 hover:text-black hover:bg-gray-50 rounded-t-lg mb-2 h-auto py-1.5'
                        }
                      `}
                    >
                      <img 
                        src={eco.icon} 
                        alt="" 
                        className={`w-4 h-4 object-contain ${isActive ? '' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100'}`} 
                      />
                      <div className={`flex flex-col items-start leading-none ${isActive ? 'font-bold' : 'font-medium text-xs'}`}>
                          <span className={`${isActive ? 'text-base' : 'text-xs'} uppercase`}>{nameParts[0]}</span>
                          {nameParts.length > 1 && (
                              <span className={`${isActive ? 'text-[10px]' : 'text-[9px]'} uppercase tracking-wider`}>{nameParts.slice(1).join(' ')}</span>
                          )}
                      </div>
                      
                      {/* Connector Line Cover for Active Tab */}
                      {isActive && (
                          <div className="absolute -bottom-[2px] left-0 right-0 h-[4px] bg-defi-bg z-20" />
                      )}
                    </button>
                  );
                })}
              </div>
           </div>

           {/* Right: Actions */}
           <div className="flex items-center gap-4 h-full pb-2.5 shrink-0 pl-4">
              <button className="text-[10px] font-bold text-gray-500 hover:text-black hover:underline uppercase tracking-wide transition-colors">
                  Connect Wallet
              </button>

              <div className="relative group perspective-1000">
                <button 
                  onClick={handleAutoRebalance}
                  disabled={isRebalancing || !sentiment}
                  className={`
                      relative flex items-center gap-2 px-4 py-2 border-2 border-black font-bold text-xs uppercase transition-all overflow-hidden
                      ${isRebalancing ? 'bg-gray-100 text-gray-500' : 'bg-defi-purple text-white shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5'}
                  `}
                >
                  {isRebalancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3" />}
                  {isRebalancing ? 'PROCESSING...' : 'AI AUTO-PILOT'}
                </button>
              </div>
           </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-grid-pattern relative p-8">
           <div className="max-w-7xl mx-auto">
              {/* Page Title */}
              <div className="mb-8 pb-4 border-b-2 border-black">
                 <h2 className="text-7xl font-display font-bold uppercase text-black leading-none tracking-tight mb-2">
                     {currentEcosystem.name}
                 </h2>
                 <div className="flex items-center gap-2 text-gray-600">
                    <Box className="w-4 h-4" />
                    <p className="text-xs font-mono font-bold uppercase tracking-widest">
                        Drag strategies to construct portfolio
                    </p>
                 </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20">
                 {currentEcosystem.assets.map(asset => {
                    const allocation = getAssetAllocation(asset.id);
                    return (
                      <AssetTile
                        key={asset.id}
                        asset={asset}
                        allocation={allocation || null}
                        strategies={STRATEGIES}
                        currentSentiment={sentiment}
                        onDrop={handleDrop}
                        onRemoveLayer={handleRemoveLayer}
                        onUpdateCondition={handleUpdateCondition}
                        onUpdateWeight={handleUpdateWeight}
                        onDragStart={handleDragStart}
                        onAutoFill={handleAutoFill}
                        isGlobalDragging={isDraggingStrategy}
                      />
                    );
                 })}
              </div>
           </div>
        </div>
      </main>
    </div>
  );
};

export default App;