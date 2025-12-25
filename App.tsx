import React, { useState, useEffect, useMemo, useRef } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { config } from './config/wagmi';
import { useAccount } from 'wagmi';

import { STRATEGIES, ECOSYSTEMS, MOCK_NEWS_FEED } from './constants';
import { PortfolioAllocation, MarketSentiment, AiRecommendation, StrategyCondition } from './types';
import AssetTile from './components/AssetTile';
import PortfolioOverview from './components/PortfolioOverview';
import StrategyDraggable from './components/StrategyDraggable';
import S3SentimentPanel from './components/S3SentimentPanel';
import SentimentReasoning from './src/components/SentimentReasoning';
import RebalanceHistory from './src/components/RebalanceHistory';
import { ApiClient } from './services/apiClient';
import { ToastProvider, toast } from './components/ToastProvider';
import RebalanceHistoryModal from './components/RebalanceHistoryModal';
import { useKeyboardDnd } from './hooks/useKeyboardDnd';
import MobileHeader from './components/MobileHeader';
import MobileSidebar from './components/MobileSidebar';
import { DndProvider } from './components/DndProvider';
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

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [selectedEcosystemId, setSelectedEcosystemId] = useState<string>(ECOSYSTEMS[2].id);
  const [allocations, setAllocations] = useState<PortfolioAllocation[]>([]);
  const [sentiment, setSentiment] = useState<MarketSentiment | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState(INITIAL_HISTORY);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDraggingStrategy, setIsDraggingStrategy] = useState(false);
  const [isLoadingAllocations, setIsLoadingAllocations] = useState(false);
  const [ecosystemsWithBalances, setEcosystemsWithBalances] = useState(ECOSYSTEMS);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [showRebalanceHistory, setShowRebalanceHistory] = useState(false);

  // Keyboard accessibility for drag-and-drop
  const { selectedStrategyId, selectStrategy, clearSelection } = useKeyboardDnd();

  // Mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Debounce ref for saving allocations
  const saveTimeouts = useRef<{ [key: string]: NodeJS.Timeout }>({});

  // Handle keyboard drop
  const handleKeyboardDrop = (strategyId: string, assetId: string) => {
    addLayer(assetId, strategyId);
    clearSelection();
    toast.success('Strategy added via keyboard');
  };

  // Handle dnd-kit drop (for touch/mouse)
  const handleDndKitDrop = (strategyId: string, assetId: string) => {
    addLayer(assetId, strategyId);
  };

  const currentEcosystem = useMemo(() =>
    ecosystemsWithBalances.find(e => e.id === selectedEcosystemId) || ecosystemsWithBalances[0],
    [selectedEcosystemId, ecosystemsWithBalances]
  );

  const filteredStrategies = useMemo(() =>
    STRATEGIES.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.type.toLowerCase().includes(searchTerm.toLowerCase())),
    [searchTerm]
  );

  const ecosystemBalance = useMemo(() =>
    currentEcosystem.assets.reduce((sum, asset) => sum + asset.balance, 0),
    [currentEcosystem]
  );

  // Load allocations and balances when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadUserAllocations();
      loadWalletBalances();
    } else {
      // Reset to default mock balances when wallet disconnects
      setEcosystemsWithBalances(ECOSYSTEMS);
    }
  }, [isConnected, address]);

  // Initialize allocations for all assets
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

  // Load wallet balances from blockchain
  const loadWalletBalances = async () => {
    if (!address) return;

    setIsLoadingBalances(true);
    try {
      // Fetch balances for Ethereum Mainnet (chainId: 1)
      const ethBalances: any = await ApiClient.getWalletBalances(address, 1);

      // Fetch balances for Arbitrum (chainId: 42161)
      const arbBalances: any = await ApiClient.getWalletBalances(address, 42161);

      // Update ecosystems with real balances
      const updatedEcosystems = ECOSYSTEMS.map(ecosystem => {
        const balances = ecosystem.id === 'eco-eth' ? ethBalances :
          ecosystem.id === 'eco-arb' ? arbBalances : null;

        if (!balances) {
          return ecosystem; // Keep Solana as-is (not supported yet)
        }

        // Map token symbols to balances
        const tokenMap = new Map(
          balances.tokens.map((token: any) => [token.symbol, token])
        );

        // Update assets with real balances
        const updatedAssets = ecosystem.assets.map(asset => {
          const tokenBalance = tokenMap.get(asset.symbol) as any;
          if (tokenBalance) {
            return {
              ...asset,
              balance: tokenBalance.balanceUsd,
              price: tokenBalance.price,
            };
          }
          return { ...asset, balance: 0 }; // Zero out if not found
        });

        return {
          ...ecosystem,
          assets: updatedAssets,
        };
      });

      setEcosystemsWithBalances(updatedEcosystems);
      toast.success('Wallet balances loaded successfully');

    } catch (error) {
      console.error('Failed to load wallet balances:', error);
      toast.error('Failed to load wallet balances. Using mock data.');
      // Keep using default ECOSYSTEMS on error
    } finally {
      setIsLoadingBalances(false);
    }
  };

  const loadUserAllocations = async () => {
    if (!address) return;

    setIsLoadingAllocations(true);
    try {
      const data: any = await ApiClient.getUserAllocations(address);
      if (data.allocations && data.allocations.length > 0) {
        // Convert backend allocations to frontend format
        const loadedAllocations = data.allocations.map((alloc: any) => ({
          assetId: alloc.assetId,
          layers: alloc.strategyLayers.map((layer: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            strategyId: layer.strategyId,
            condition: layer.condition,
            weight: layer.weight
          }))
        }));

        // Merge with existing allocations
        setAllocations(prev => {
          const merged = [...prev];
          loadedAllocations.forEach((loaded: PortfolioAllocation) => {
            const index = merged.findIndex(a => a.assetId === loaded.assetId);
            if (index >= 0) {
              merged[index] = loaded;
            } else {
              merged.push(loaded);
            }
          });
          return merged;
        });
      }
    } catch (error) {
      console.error('Failed to load allocations:', error);
      toast.error('Failed to load your allocations');
    } finally {
      setIsLoadingAllocations(false);
    }
  };

  const saveAllocation = async (assetId: string, layers: any[]) => {
    if (!address) return;

    const asset = currentEcosystem.assets.find(a => a.id === assetId);
    if (!asset) return;

    // Clear existing timeout for this asset
    if (saveTimeouts.current[assetId]) {
      clearTimeout(saveTimeouts.current[assetId]);
    }

    // Set new timeout (debounce)
    saveTimeouts.current[assetId] = setTimeout(async () => {
      try {
        await ApiClient.saveAllocation({
          walletAddress: address,
          ecosystem: currentEcosystem.name,
          assetId,
          assetSymbol: asset.symbol,
          amount: asset.balance,
          strategyLayers: layers.map(l => ({
            strategyId: l.strategyId,
            condition: l.condition,
            weight: l.weight
          }))
        });
      } catch (error) {
        console.error('Failed to save allocation:', error);
        toast.error('Failed to save allocation');
      } finally {
        delete saveTimeouts.current[assetId];
      }
    }, 1000); // 1s debounce
  };

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
        const updatedLayers = [...adjustedLayers, newLayer];

        // Save to backend
        saveAllocation(assetId, updatedLayers);

        return { ...a, layers: updatedLayers };
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
        const updatedLayers = a.layers.map(l => l.id === layerId ? { ...l, condition } : l);
        saveAllocation(assetId, updatedLayers);
        return { ...a, layers: updatedLayers };
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

        saveAllocation(assetId, updatedLayers);
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
          const updatedLayers = remainingLayers.map(l => ({ ...l, weight: l.weight * scaleFactor }));
          saveAllocation(assetId, updatedLayers);
          return { ...a, layers: updatedLayers };
        }
        saveAllocation(assetId, []);
        return { ...a, layers: remainingLayers };
      }
      return a;
    }));
  };

  const handleAutoRebalance = async () => {
    if (!sentiment) return;
    setIsRebalancing(true);
    try {
      const recommendation: any = await ApiClient.getPortfolioRecommendation({
        sentiment,
        ecosystem: currentEcosystem.name,
        assets: currentEcosystem.assets.map(a => ({ id: a.id, symbol: a.symbol })),
        strategies: STRATEGIES.map(s => ({ id: s.id, name: s.name, risk: s.riskLevel, type: s.type }))
      });

      setAiRecommendation(recommendation);
      setTimeout(() => {
        setAllocations(prev => {
          return prev.map(current => {
            const rec = recommendation.allocations.find((r: any) => r.assetId === current.assetId);
            if (rec) {
              const newLayers = rec.layers.map((l: any) => ({
                id: Math.random().toString(36).substr(2, 9),
                strategyId: l.strategyId,
                condition: l.condition,
                weight: l.weight
              }));

              // Save to backend
              saveAllocation(current.assetId, newLayers);

              return { ...current, layers: newLayers };
            }
            return current;
          });
        });
        setIsRebalancing(false);
        toast.success('Portfolio rebalanced by AI');
      }, 1500);
    } catch (e) {
      console.error(e);
      toast.error('AI Auto-Pilot failed');
      setIsRebalancing(false);
    }
  };

  const getAssetAllocation = (assetId: string) => allocations.find(a => a.assetId === assetId);

  return (
    <DndProvider strategies={STRATEGIES} onStrategyDrop={handleDndKitDrop}>
      <div className="flex flex-col lg:flex-row h-screen bg-defi-bg text-defi-text font-sans overflow-hidden">
        {/* Mobile Header - only visible on mobile */}
        <MobileHeader onMenuClick={() => setIsMobileSidebarOpen(true)} />

        {/* Mobile Sidebar Overlay */}
        <MobileSidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          strategies={filteredStrategies}
          selectedStrategyId={selectedStrategyId}
          onKeyboardSelect={selectStrategy}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onAnalyzeSentiment={async () => {
            try {
              const result: any = await ApiClient.getS3Sentiment({ timeHorizon: 'short' });
              if (result) {
                setSentiment({
                  score: result.normalizedScore,
                  label: result.label,
                  summary: result.summary,
                  trendingTopics: result.trendingTopics,
                });
              }
              return result;
            } catch (error) {
              console.error('Failed to fetch S³ sentiment:', error);
              return null;
            }
          }}
        />

        {/* Desktop Sidebar - Glassmorphism */}
        <aside className="hidden lg:flex w-[320px] flex-col glass-dark z-20 border-r border-defi-border">
          {/* Logo Section */}
          <div className="p-6 border-b border-defi-border shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-defi-accent to-defi-purple flex items-center justify-center shadow-glow-accent">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-display font-bold tracking-tight gradient-text">DEFI LEGO</h1>
                <p className="text-[10px] text-defi-text-muted font-mono tracking-widest uppercase">Quantum Matrix v1.0</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-defi-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-defi-text-muted" />
              <input
                type="text"
                placeholder="Search strategies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-defi-card border border-defi-border text-sm text-defi-text placeholder:text-defi-text-muted focus:outline-none focus:border-defi-accent focus:ring-1 focus:ring-defi-accent/50 transition-all"
              />
            </div>
          </div>

          {/* Strategy List */}
          <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2 custom-scrollbar">
            <div className="flex items-center justify-between py-4 sticky top-0 bg-transparent backdrop-blur-md z-10">
              <span className="text-xs font-semibold text-defi-text-secondary uppercase tracking-wider">Strategy Blocks</span>
              <span className="text-xs bg-defi-accent/20 text-defi-accent-light px-2.5 py-1 rounded-full font-semibold">{filteredStrategies.length}</span>
            </div>

            <div className="space-y-2 pb-2">
              {filteredStrategies.map(strat => (
                <StrategyDraggable
                  key={strat.id}
                  strategy={strat}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  isKeyboardSelected={selectedStrategyId === strat.id}
                  onKeyboardSelect={selectStrategy}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col relative">

          {/* Header - Enhanced Glassmorphism */}
          <header className="h-20 glass-dark border-b border-defi-border flex items-center justify-between px-4 lg:px-6 z-20 sticky top-0">
            {/* Left: Network Selector with Container */}
            <div className="flex items-center gap-4 h-full flex-1 min-w-0">
              {/* Network Label */}
              <div className="hidden lg:flex flex-col items-start gap-0.5 shrink-0">
                <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-defi-text-muted">Network</span>
                <div className="w-8 h-0.5 bg-gradient-to-r from-defi-accent to-transparent rounded-full"></div>
              </div>

              {/* Network Pills Container */}
              <div className="flex items-center h-11 overflow-x-auto no-scrollbar gap-1.5 bg-defi-card/30 border border-defi-border/50 rounded-2xl p-1.5 backdrop-blur-sm">
                <button
                  onClick={() => { setSelectedEcosystemId('all'); setAiRecommendation(null); }}
                  className={`
                    group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 relative shrink-0
                    ${selectedEcosystemId === 'all'
                      ? 'bg-gradient-to-r from-defi-accent to-defi-purple text-white shadow-glow-accent'
                      : 'text-defi-text-secondary hover:text-defi-text hover:bg-defi-card/50'
                    }
                  `}
                >
                  <LayoutGrid className={`w-4 h-4 transition-transform duration-300 ${selectedEcosystemId === 'all' ? '' : 'opacity-60 group-hover:opacity-100 group-hover:scale-110'}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wide`}>All</span>
                </button>

                {ECOSYSTEMS.map(eco => {
                  const isActive = selectedEcosystemId === eco.id;

                  return (
                    <button
                      key={eco.id}
                      onClick={() => { setSelectedEcosystemId(eco.id); setAiRecommendation(null); }}
                      className={`
                        group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 relative shrink-0
                        ${isActive
                          ? 'bg-gradient-to-r from-defi-accent to-defi-purple text-white shadow-glow-accent'
                          : 'text-defi-text-secondary hover:text-defi-text hover:bg-defi-card/50'
                        }
                      `}
                    >
                      <img
                        src={eco.icon}
                        alt=""
                        className={`w-5 h-5 object-contain transition-all duration-300 ${isActive ? 'drop-shadow-lg' : 'grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110'}`}
                      />
                      <span className={`text-xs font-semibold uppercase tracking-wide hidden sm:inline`}>{eco.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center: Divider */}
            <div className="hidden xl:block h-8 w-px bg-gradient-to-b from-transparent via-defi-border to-transparent mx-4"></div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 lg:gap-3 h-full shrink-0">
              {/* S3 Sentiment Panel */}
              <S3SentimentPanel
                compact={true}
                onAnalyze={async () => {
                  try {
                    const result: any = await ApiClient.getS3Sentiment({ timeHorizon: 'short' });
                    if (result) {
                      setSentiment({
                        score: result.normalizedScore,
                        label: result.label,
                        summary: result.summary,
                        trendingTopics: result.trendingTopics,
                      });
                    }
                    return result;
                  } catch (error) {
                    console.error('Failed to fetch S³ sentiment:', error);
                    return null;
                  }
                }}
              />

              {/* Divider */}
              <div className="h-6 w-px bg-defi-border hidden sm:block"></div>

              {/* Connect Button */}
              <ConnectButton />

              {/* AI Recommendations */}
              <div className="relative group">
                <button
                  onClick={handleAutoRebalance}
                  disabled={isRebalancing || !sentiment || !isConnected}
                  className={`
                      relative flex items-center gap-2 px-3 lg:px-5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-300
                      ${isRebalancing || !isConnected
                      ? 'bg-defi-card border border-defi-border text-defi-text-muted cursor-not-allowed'
                      : 'bg-gradient-to-r from-defi-accent via-defi-purple to-defi-accent bg-[length:200%_100%] animate-gradient-x text-white shadow-glow-purple hover:shadow-glow-accent hover:scale-[1.02]'
                    }
                  `}
                  title="Get one-time AI recommendations for your portfolio"
                >
                  {isRebalancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                  <span className="hidden md:inline font-semibold tracking-wide">{isRebalancing ? 'Processing...' : 'AI Recommendations'}</span>
                  <span className="inline md:hidden font-semibold">AI</span>
                </button>

                {/* Tooltip */}
                <div className="absolute right-0 top-full mt-3 w-72 p-4 glass-dark rounded-2xl text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 shadow-glass-lg border border-defi-border/50">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-defi-accent to-defi-purple flex items-center justify-center">
                      <BrainCircuit className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-semibold text-defi-text text-sm">AI Portfolio Insights</span>
                  </div>
                  <p className="text-defi-text-secondary mb-3 leading-relaxed">Generates intelligent recommendations based on real-time market sentiment analysis.</p>
                  <div className="flex items-center gap-2 text-defi-text-muted text-[10px] bg-defi-card/50 rounded-lg p-2">
                    <Zap className="w-3 h-3 text-defi-warning" />
                    <span>Auto-rebalancing runs every 30 minutes in background</span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Canvas */}
          <div className="flex-1 overflow-auto bg-grid-pattern relative p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Page Title */}
              <div className="mb-8 pb-6 border-b border-defi-border">
                <h2 className="text-4xl lg:text-6xl font-display font-bold leading-none tracking-tight mb-3 gradient-text">
                  {selectedEcosystemId === 'all' ? 'Global Portfolio' : currentEcosystem.name}
                </h2>
                <div className="flex items-center gap-2 text-defi-text-secondary">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-defi-success animate-pulse' : 'bg-defi-text-muted'}`} />
                  <p className="text-xs font-medium">
                    {isConnected ? `Connected: ${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Connect wallet to save allocations'}
                  </p>
                </div>
              </div>

              {/* Automated Rebalancing Info Banner */}
              {isConnected && selectedEcosystemId !== 'all' && (
                <div className="mb-6 p-4 glass-card rounded-2xl border-defi-purple/30 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-defi-purple/20 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4 text-defi-purple-light" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1 text-defi-purple-light">Automated Rebalancing Active</h3>
                      <p className="text-xs text-defi-text-secondary leading-relaxed">
                        Your saved allocations are automatically monitored and rebalanced <span className="text-defi-text font-medium">every 30 minutes</span> based on market sentiment.
                        <button
                          onClick={() => setShowRebalanceHistory(true)}
                          className="ml-1 text-defi-accent-light hover:text-defi-accent font-medium transition-colors"
                        >
                          View history →
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid or Portfolio Overview */}
              {selectedEcosystemId === 'all' ? (
                <PortfolioOverview
                  ecosystems={ecosystemsWithBalances}
                  allocations={allocations}
                  strategies={STRATEGIES}
                />
              ) : isLoadingAllocations ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 animate-spin text-defi-accent" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                  {currentEcosystem.assets.map((asset, index) => {
                    const allocation = getAssetAllocation(asset.id);
                    return (
                      <div key={asset.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        <AssetTile
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
                          onAddStrategy={(assetId, strategyId) => addLayer(assetId, strategyId)}
                          isGlobalDragging={isDraggingStrategy}
                          selectedStrategyId={selectedStrategyId}
                          onKeyboardDrop={handleKeyboardDrop}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <RebalanceHistory walletAddress={address} />
        </main>
      </div>
    </DndProvider>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <AppContent />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ToastProvider>
  );
};

export default App;