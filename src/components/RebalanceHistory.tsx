import React, { useEffect, useState } from 'react';
import { ApiClient } from '../../services/apiClient';
import { RebalanceEvent } from '../../types';
import { Activity, CheckCircle, XCircle, Clock, ExternalLink, Zap } from 'lucide-react';

interface RebalanceHistoryProps {
    walletAddress?: string;
}

const RebalanceHistory: React.FC<RebalanceHistoryProps> = ({ walletAddress }) => {
    const [history, setHistory] = useState<RebalanceEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isOpen && walletAddress) {
            loadHistory();
        }
    }, [isOpen, walletAddress]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const data: any = await ApiClient.getRebalanceHistory(walletAddress!);
            // Backend currently returns { success: true, data: [...] } or just array? 
            // ApiClient returns json.data. So if backend returns { history: [...] }, we get { history: [...] }
            // Let's assume the backend shape based on typical ApiClient usage.
            // Actually ApiClient.getRebalanceHistory returns `this.request(...)`.
            // Let's assume it returns `RebalanceEvent[]` directly or wrapped.
            // Looking at `sentiment.routes.ts` earlier, it returned `{ success: true, data: ... }`.
            // So ApiClient unwraps `data`. 
            // If the route returns `{ history: [...] }`, then `data` is that object.
            
            // Safe check
            const list = Array.isArray(data) ? data : (data.history || []);
            setHistory(list);
        } catch (error) {
            console.error("Failed to load rebalance history", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!walletAddress) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="pointer-events-auto bg-black text-white border-2 border-white shadow-brutal px-4 py-2 flex items-center gap-2 font-bold uppercase tracking-widest hover:bg-gray-900 transition-all"
            >
                <Activity className="w-4 h-4" />
                {isOpen ? 'Hide Activity' : 'System Activity'}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="pointer-events-auto mt-2 w-80 md:w-96 bg-white border-2 border-black shadow-brutal max-h-[500px] flex flex-col">
                    <div className="p-3 border-b-2 border-black bg-gray-100 flex justify-between items-center">
                        <span className="text-xs font-black uppercase tracking-widest">Recent Executions</span>
                        <button onClick={loadHistory} className="text-gray-500 hover:text-black">
                            <Clock className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-2 space-y-2 flex-1 custom-scrollbar">
                        {isLoading ? (
                            <div className="text-center py-8 text-xs font-bold text-gray-400 animate-pulse">
                                LOADING ON-CHAIN DATA...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8 text-xs text-gray-400">
                                NO REBALANCE EVENTS FOUND
                            </div>
                        ) : (
                            history.map((event) => (
                                <div key={event.id} className="border border-black p-3 bg-gray-50 hover:bg-white transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            {event.status === 'success' ? (
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            ) : event.status === 'failed' ? (
                                                <XCircle className="w-4 h-4 text-red-600" />
                                            ) : (
                                                <Clock className="w-4 h-4 text-yellow-600" />
                                            )}
                                            <span className="font-bold text-sm uppercase">{event.assetId}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 font-mono">
                                            {new Date(event.executedAt).toLocaleTimeString()}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                                        <Zap className="w-3 h-3" />
                                        <span className="uppercase">{event.triggerType} Trigger</span>
                                        {event.sentimentLabel && (
                                            <span className={`px-1 text-[9px] font-bold text-white uppercase ${
                                                event.sentimentLabel === 'Bullish' ? 'bg-green-500' : 
                                                event.sentimentLabel === 'Bearish' ? 'bg-red-500' : 'bg-gray-500'
                                            }`}>
                                                {event.sentimentLabel}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] font-mono border-t border-gray-200 pt-2 mt-2">
                                        <div>
                                            {event.gasCostUsd && <span>Gas: ${event.gasCostUsd}</span>}
                                        </div>
                                        {event.txHash && (
                                            <a 
                                                href={`https://sepolia.etherscan.io/tx/${event.txHash}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:underline"
                                            >
                                                TXN <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                    {event.errorMessage && (
                                        <div className="mt-2 text-[10px] text-red-600 font-mono bg-red-50 p-1 border border-red-200">
                                            Error: {event.errorMessage}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RebalanceHistory;
