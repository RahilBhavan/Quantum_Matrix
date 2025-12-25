import React, { useState, useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight, Plus, Wallet, TrendingUp } from 'lucide-react';
import { EcosystemConfig, WalletToken, PortfolioAllocation, Strategy, MarketSentiment } from '../types';
import AssetTile from './AssetTile';

interface EcosystemBlockProps {
    ecosystem: EcosystemConfig;
    tokens: WalletToken[];
    allocations: PortfolioAllocation[];
    strategies: Strategy[];
    currentSentiment: MarketSentiment | null;
    onDrop: (e: React.DragEvent, assetId: string) => void;
    onRemoveLayer: (assetId: string, layerId: string) => void;
    onUpdateCondition: (assetId: string, layerId: string, condition: any) => void;
    onUpdateWeight: (assetId: string, layerId: string, weight: number) => void;
    onDragStart: (e: React.DragEvent, strategyId: string) => void;
    onAutoFill: (assetId: string) => void;
    isGlobalDragging: boolean;
    getAssetAllocation: (assetId: string) => PortfolioAllocation | undefined;
    isActive?: boolean;
}

const EcosystemBlock: React.FC<EcosystemBlockProps> = ({
    ecosystem,
    tokens,
    allocations,
    strategies,
    currentSentiment,
    onDrop,
    onRemoveLayer,
    onUpdateCondition,
    onUpdateWeight,
    onDragStart,
    onAutoFill,
    isGlobalDragging,
    getAssetAllocation,
    isActive = true,
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate ecosystem totals
    const ecosystemStats = useMemo(() => {
        const totalBalance = tokens.reduce((sum, t) => sum + t.balance, 0);

        // Calculate weighted yield across all tokens in ecosystem
        let totalWeightedYield = 0;
        let totalWeight = 0;

        for (const token of tokens) {
            const allocation = getAssetAllocation(token.id);
            if (!allocation) continue;

            for (const layer of allocation.layers) {
                const strategy = strategies.find(s => s.id === layer.strategyId);
                if (strategy) {
                    const tokenWeight = token.balance / totalBalance;
                    totalWeightedYield += strategy.apy * (layer.weight / 100) * tokenWeight;
                    totalWeight += (layer.weight / 100) * tokenWeight;
                }
            }
        }

        return {
            totalBalance,
            avgYield: totalWeight > 0 ? totalWeightedYield / totalWeight : 0,
            tokenCount: tokens.length,
            allocatedCount: tokens.filter(t => {
                const alloc = getAssetAllocation(t.id);
                return alloc && alloc.layers.length > 0;
            }).length,
        };
    }, [tokens, allocations, strategies, getAssetAllocation]);

    // dnd-kit droppable for the ecosystem container
    const { setNodeRef, isOver } = useDroppable({
        id: `ecosystem-${ecosystem.id}`,
        data: {
            type: 'ecosystem',
            ecosystemId: ecosystem.id,
        },
    });

    const tokenIds = useMemo(() => tokens.map(t => t.id), [tokens]);

    return (
        <div
            ref={setNodeRef}
            className={`
        relative border-2 border-black bg-white transition-all duration-300
        ${isOver && isGlobalDragging ? 'ring-2 ring-defi-accent ring-inset shadow-brutal-hover' : 'shadow-brutal'}
        ${isActive ? '' : 'opacity-60'}
      `}
        >
            {/* Ecosystem Header */}
            <div
                className="px-6 py-4 border-b-2 border-black flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {/* Expand/Collapse Toggle */}
                    <button className="p-1 hover:bg-gray-100 transition-colors">
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                        ) : (
                            <ChevronRight className="w-5 h-5" />
                        )}
                    </button>

                    {/* Ecosystem Icon & Name */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 border-2 border-black p-1.5 flex items-center justify-center"
                            style={{ backgroundColor: `${ecosystem.color}15` }}
                        >
                            <img
                                src={ecosystem.icon}
                                alt={ecosystem.symbol}
                                className="w-full h-full object-contain"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                        <div>
                            <h3 className="font-display text-xl font-bold uppercase leading-none">
                                {ecosystem.name}
                            </h3>
                            <p className="text-xs font-mono text-gray-500 uppercase tracking-wider">
                                Chain ID: {ecosystem.chainId}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Ecosystem Stats */}
                <div className="flex items-center gap-6">
                    {/* Token Count */}
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-xs font-bold uppercase text-gray-400">
                            <Wallet className="w-3 h-3" />
                            Tokens
                        </div>
                        <div className="font-mono font-bold text-lg">
                            {ecosystemStats.allocatedCount}/{ecosystemStats.tokenCount}
                        </div>
                    </div>

                    {/* Total Balance */}
                    <div className="text-right">
                        <div className="text-xs font-bold uppercase text-gray-400">
                            Total Value
                        </div>
                        <div className="font-mono font-bold text-lg tabular-nums">
                            ${ecosystemStats.totalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>

                    {/* Ecosystem Yield */}
                    <div className="text-right bg-defi-success/10 border border-defi-success px-3 py-1">
                        <div className="flex items-center gap-1 text-xs font-bold uppercase text-defi-success">
                            <TrendingUp className="w-3 h-3" />
                            Est. Yield
                        </div>
                        <div className="font-mono font-bold text-lg text-defi-success tabular-nums">
                            {ecosystemStats.avgYield.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* Token Grid (Collapsible) */}
            {isExpanded && (
                <div className="p-6 bg-grid-pattern">
                    <SortableContext items={tokenIds} strategy={verticalListSortingStrategy}>
                        {tokens.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {tokens.map(token => (
                                    <AssetTile
                                        key={token.id}
                                        asset={token}
                                        allocation={getAssetAllocation(token.id) || null}
                                        strategies={strategies}
                                        currentSentiment={currentSentiment}
                                        onDrop={onDrop}
                                        onRemoveLayer={onRemoveLayer}
                                        onUpdateCondition={onUpdateCondition}
                                        onUpdateWeight={onUpdateWeight}
                                        onDragStart={onDragStart}
                                        onAutoFill={onAutoFill}
                                        isGlobalDragging={isGlobalDragging}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-300 bg-white/50">
                                <Wallet className="w-12 h-12 text-gray-300 mb-4" />
                                <p className="text-sm font-bold uppercase text-gray-400 tracking-wider mb-2">
                                    No tokens found
                                </p>
                                <p className="text-xs text-gray-400 max-w-xs">
                                    Connect your wallet to see tokens in this ecosystem, or switch to the correct network.
                                </p>
                            </div>
                        )}
                    </SortableContext>

                    {/* Add Token Button */}
                    {tokens.length > 0 && (
                        <button className="mt-6 w-full py-3 border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm uppercase flex items-center justify-center gap-2 hover:border-black hover:text-black transition-colors">
                            <Plus className="w-4 h-4" />
                            Add Custom Token
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default EcosystemBlock;
