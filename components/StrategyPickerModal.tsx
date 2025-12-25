import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Plus, Info } from 'lucide-react';
import { Strategy, MarketSentiment, StrategyCondition } from '../types';

interface StrategyPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: Strategy[];
  currentSentiment: MarketSentiment | null;
  onSelect: (strategy: Strategy, initialCondition: StrategyCondition, initialWeight: number) => void;
  remainingWeight: number;
}

const StrategyPickerModal: React.FC<StrategyPickerModalProps> = ({
  isOpen,
  onClose,
  strategies,
  currentSentiment,
  onSelect,
  remainingWeight,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');

  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'All' || s.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [strategies, searchTerm, selectedType]);

  const strategyTypes = ['All', ...Array.from(new Set(strategies.map(s => s.type)))];

  // Helper to determine best condition based on sentiment and strategy risk
  const getRecommendedCondition = (strategy: Strategy): StrategyCondition => {
    if (!currentSentiment) return 'Always';
    
    // AI Adaptive is usually the smartest default if sentiment is available
    return 'AI Adaptive';
  };

  const handleSelect = (strategy: Strategy) => {
    const condition = getRecommendedCondition(strategy);
    // Default to filling remaining space, or 50% if empty, or at least 10%
    const weight = remainingWeight > 0 ? remainingWeight : 50; 
    
    onSelect(strategy, condition, weight);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border-2 border-black w-full max-w-2xl max-h-[80vh] flex flex-col shadow-brutal"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
              <h2 className="text-xl font-display font-bold uppercase">Select Strategy</h2>
              <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search & Filter */}
            <div className="p-4 border-b-2 border-black space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search strategies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 focus:border-black outline-none font-bold uppercase text-sm transition-colors"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {strategyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-3 py-1 text-xs font-bold uppercase border-2 transition-all whitespace-nowrap ${
                      selectedType === type 
                        ? 'bg-black text-white border-black' 
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Strategy List */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50">
              {filteredStrategies.map(strategy => (
                <button
                  key={strategy.id}
                  onClick={() => handleSelect(strategy)}
                  className="bg-white border-2 border-gray-200 hover:border-black p-4 text-left group transition-all hover:shadow-brutal-sm flex flex-col h-full"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold uppercase text-sm group-hover:text-defi-purple transition-colors">
                      {strategy.name}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      strategy.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                      strategy.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {strategy.riskLevel}
                    </span>
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-1">
                    {strategy.description}
                  </p>

                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Est. APY</span>
                      <span className="text-lg font-mono font-bold text-defi-success">
                        {strategy.apy}%
                      </span>
                    </div>
                    <div className="bg-black text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 translate-x-2">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="p-3 bg-gray-100 border-t-2 border-black text-xs text-gray-500 font-medium flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Strategies will default to "AI Adaptive" condition and fill remaining weight.</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default StrategyPickerModal;
