import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Clock, History, AlertCircle, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ApiClient } from '../services/apiClient';

interface RebalanceHistory {
    id: number;
    userId: number;
    allocationId: number | null;
    ecosystem: string;
    assetId: string;
    triggerType: string;
    sentimentScore: number | null;
    sentimentLabel: string | null;
    gasCostUsd: number | null;
    profitUsd: number | null;
    txHash: string | null;
    status: 'pending' | 'success' | 'failed';
    errorMessage: string | null;
    executedAt: string;
}

interface RebalanceHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    walletAddress: string;
}

const RebalanceHistoryModal: React.FC<RebalanceHistoryModalProps> = ({
    isOpen,
    onClose,
    walletAddress,
}) => {
    const [history, setHistory] = useState<RebalanceHistory[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [offset, setOffset] = useState(0);
    const LIMIT = 20;

    useEffect(() => {
        if (isOpen && walletAddress) {
            fetchHistory(0, true);
        }
    }, [isOpen, walletAddress]);

    const fetchHistory = async (newOffset: number, reset: boolean = false) => {
        setIsLoading(true);
        setError(null);

        try {
            const response: any = await ApiClient.getRebalanceHistory(walletAddress, LIMIT, newOffset);
            const data = response.data || response;

            if (reset) {
                setHistory(data.history || []);
            } else {
                setHistory(prev => [...prev, ...(data.history || [])]);
            }

            setTotal(data.total || 0);
            setOffset(newOffset);
        } catch (err: any) {
            console.error('Failed to fetch rebalance history:', err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMore = () => {
        fetchHistory(offset + LIMIT, false);
    };

    const handleRetry = () => {
        fetchHistory(0, true);
    };

    const getStatusIndicator = (status: string) => {
        if (status === 'success') {
            return (
                <div className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-defi-success" />
                    <span className="text-xs font-bold text-defi-success">Success</span>
                </div>
            );
        }
        if (status === 'failed') {
            return (
                <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-defi-danger" />
                    <span className="text-xs font-bold text-defi-danger">Failed</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-600">Pending</span>
            </div>
        );
    };

    const getSentimentColor = (label: string | null) => {
        if (!label) return 'bg-gray-100 text-gray-600';
        if (label === 'Bullish' || label === 'Euphoric') return 'bg-defi-success/10 text-defi-success';
        if (label === 'Bearish') return 'bg-defi-danger/10 text-defi-danger';
        return 'bg-gray-100 text-gray-600';
    };

    const getTriggerBadge = (triggerType: string) => {
        const badges: Record<string, { label: string; color: string }> = {
            'automated': { label: 'Auto', color: 'bg-defi-purple/10 text-defi-purple' },
            'manual': { label: 'Manual', color: 'bg-blue-100 text-blue-700' },
            'ai_adaptive': { label: 'AI Adaptive', color: 'bg-purple-100 text-purple-700' },
        };

        const badge = badges[triggerType.toLowerCase()] || { label: triggerType, color: 'bg-gray-100 text-gray-600' };

        return (
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const getExplorerUrl = (txHash: string, ecosystem: string) => {
        if (ecosystem.toLowerCase().includes('sepolia')) {
            return `https://sepolia.etherscan.io/tx/${txHash}`;
        }
        if (ecosystem.toLowerCase().includes('arbitrum')) {
            return `https://arbiscan.io/tx/${txHash}`;
        }
        return `https://etherscan.io/tx/${txHash}`;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getAssetSymbol = (assetId: string) => {
        // Extract symbol from assetId (e.g., "asset-eth" -> "ETH")
        return assetId.replace('asset-', '').toUpperCase();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-black shadow-brutal max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-4 border-b-2 border-black flex items-center justify-between bg-gray-50 shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <History className="w-5 h-5" />
                            <h2 className="font-display text-xl font-bold uppercase">Rebalance History</h2>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            {total > 0 && `Total: ${total} rebalance${total !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-black"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && history.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600">Loading rebalance history...</p>
                        </div>
                    ) : error ? (
                        <div className="p-8 flex flex-col items-center justify-center">
                            <AlertCircle className="w-12 h-12 text-defi-danger mb-3" />
                            <h3 className="font-bold text-gray-700 mb-1">Failed to Load History</h3>
                            <p className="text-sm text-gray-600 mb-4">{error.message}</p>
                            <button
                                onClick={handleRetry}
                                className="px-4 py-2 bg-black text-white font-bold text-xs uppercase border-2 border-black hover:bg-gray-800"
                            >
                                Retry
                            </button>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <History className="w-12 h-12 text-gray-300 mb-3" />
                            <h3 className="font-bold text-gray-600 mb-1">No Rebalancing History Yet</h3>
                            <p className="text-sm text-gray-500">
                                Automated rebalancing runs every 30 minutes.<br />
                                Check back soon to see your first rebalance.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {history.map(rebalance => (
                                <div key={rebalance.id} className="border-b border-gray-200">
                                    {/* Row */}
                                    <div
                                        onClick={() => setExpandedId(expandedId === rebalance.id ? null : rebalance.id)}
                                        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    >
                                        <div className="grid grid-cols-12 gap-4 items-center text-sm">
                                            {/* Date/Time */}
                                            <div className="col-span-2">
                                                <p className="font-bold text-gray-700">{formatDate(rebalance.executedAt)}</p>
                                            </div>

                                            {/* Asset & Ecosystem */}
                                            <div className="col-span-2">
                                                <p className="font-bold">{getAssetSymbol(rebalance.assetId)}</p>
                                                <p className="text-xs text-gray-500">{rebalance.ecosystem}</p>
                                            </div>

                                            {/* Trigger Type */}
                                            <div className="col-span-2">
                                                {getTriggerBadge(rebalance.triggerType)}
                                            </div>

                                            {/* Sentiment */}
                                            <div className="col-span-2">
                                                {rebalance.sentimentLabel && (
                                                    <span className={`px-2 py-0.5 text-xs font-bold uppercase ${getSentimentColor(rebalance.sentimentLabel)}`}>
                                                        {rebalance.sentimentLabel}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2">
                                                {getStatusIndicator(rebalance.status)}
                                            </div>

                                            {/* Metrics */}
                                            <div className="col-span-1 text-right">
                                                {rebalance.gasCostUsd !== null && (
                                                    <p className="text-xs text-gray-600">
                                                        ${rebalance.gasCostUsd.toFixed(2)}
                                                    </p>
                                                )}
                                                {rebalance.profitUsd !== null && (
                                                    <p className={`text-xs font-bold ${rebalance.profitUsd >= 0 ? 'text-defi-success' : 'text-defi-danger'}`}>
                                                        {rebalance.profitUsd >= 0 ? '+' : ''}${rebalance.profitUsd.toFixed(2)}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Expand Icon */}
                                            <div className="col-span-1 flex justify-end">
                                                {expandedId === rebalance.id ? (
                                                    <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedId === rebalance.id && (
                                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                                            <dl className="grid grid-cols-2 gap-3 text-xs">
                                                <div>
                                                    <dt className="font-bold text-gray-500 uppercase mb-1">Full Timestamp</dt>
                                                    <dd className="text-gray-700">{new Date(rebalance.executedAt).toLocaleString()}</dd>
                                                </div>
                                                <div>
                                                    <dt className="font-bold text-gray-500 uppercase mb-1">Allocation ID</dt>
                                                    <dd className="text-gray-700">#{rebalance.allocationId || 'N/A'}</dd>
                                                </div>
                                                {rebalance.sentimentScore !== null && (
                                                    <div>
                                                        <dt className="font-bold text-gray-500 uppercase mb-1">Sentiment Score</dt>
                                                        <dd className="text-gray-700">{rebalance.sentimentScore}/100</dd>
                                                    </div>
                                                )}
                                                {rebalance.txHash && (
                                                    <div>
                                                        <dt className="font-bold text-gray-500 uppercase mb-1">Transaction</dt>
                                                        <dd>
                                                            <a
                                                                href={getExplorerUrl(rebalance.txHash, rebalance.ecosystem)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-defi-purple hover:underline font-mono text-xs flex items-center gap-1"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {rebalance.txHash.slice(0, 16)}...
                                                                <ExternalLink className="w-3 h-3" />
                                                            </a>
                                                        </dd>
                                                    </div>
                                                )}
                                                {rebalance.errorMessage && (
                                                    <div className="col-span-2">
                                                        <dt className="font-bold text-defi-danger uppercase mb-1">Error Message</dt>
                                                        <dd className="text-gray-700 font-mono text-[10px] bg-defi-danger/5 p-2 border border-defi-danger/20">
                                                            {rebalance.errorMessage}
                                                        </dd>
                                                    </div>
                                                )}
                                            </dl>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer with Pagination */}
                {!isLoading && !error && history.length > 0 && history.length < total && (
                    <div className="p-4 border-t-2 border-black bg-gray-50 shrink-0">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600">
                                Showing {history.length} of {total} rebalances
                            </p>
                            <button
                                onClick={handleLoadMore}
                                disabled={isLoading}
                                className="px-4 py-2 bg-black text-white font-bold text-xs uppercase border-2 border-black hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RebalanceHistoryModal;
