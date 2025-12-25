import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';

export interface StrategyLayer {
    id: string;
    adapter: string;
    adapterName: string;
    weight: number; // 0-100
    condition: 'always' | 'bullish' | 'bearish' | 'neutral' | 'euphoric';
    apy: number;
    riskScore: number;
}

interface StrategyBuilderProps {
    availableAdapters: {
        address: string;
        name: string;
        apy: number;
        riskScore: number;
    }[];
    onSave: (layers: StrategyLayer[]) => Promise<void>;
    initialLayers?: StrategyLayer[];
}

export default function StrategyBuilder({
    availableAdapters,
    onSave,
    initialLayers = []
}: StrategyBuilderProps) {
    const [layers, setLayers] = useState<StrategyLayer[]>(initialLayers);
    const [isAddingLayer, setIsAddingLayer] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Calculate total weight
    const totalWeight = layers.reduce((sum, layer) => sum + layer.weight, 0);
    const isValidWeight = totalWeight === 100;

    // Calculate weighted APY
    const weightedAPY = layers.reduce((sum, layer) => {
        return sum + (layer.apy * layer.weight / 100);
    }, 0);

    // Calculate weighted risk score
    const weightedRisk = layers.reduce((sum, layer) => {
        return sum + (layer.riskScore * layer.weight / 100);
    }, 0);

    // Auto-normalize weights when adding/removing layers
    const normalizeWeights = (updatedLayers: StrategyLayer[]) => {
        if (updatedLayers.length === 0) return updatedLayers;

        const total = updatedLayers.reduce((sum, l) => sum + l.weight, 0);
        if (total === 0) {
            // Distribute equally
            const equalWeight = 100 / updatedLayers.length;
            return updatedLayers.map(l => ({ ...l, weight: equalWeight }));
        }

        // Normalize to 100%
        return updatedLayers.map(l => ({
            ...l,
            weight: (l.weight / total) * 100
        }));
    };

    const addLayer = (adapter: typeof availableAdapters[0]) => {
        const newLayer: StrategyLayer = {
            id: `layer-${Date.now()}`,
            adapter: adapter.address,
            adapterName: adapter.name,
            weight: 0,
            condition: 'always',
            apy: adapter.apy,
            riskScore: adapter.riskScore
        };

        const updatedLayers = normalizeWeights([...layers, newLayer]);
        setLayers(updatedLayers);
        setIsAddingLayer(false);
    };

    const removeLayer = (id: string) => {
        const updatedLayers = normalizeWeights(layers.filter(l => l.id !== id));
        setLayers(updatedLayers);
    };

    const updateLayerWeight = (id: string, weight: number) => {
        setLayers(layers.map(l =>
            l.id === id ? { ...l, weight: Math.max(0, Math.min(100, weight)) } : l
        ));
    };

    const updateLayerCondition = (id: string, condition: StrategyLayer['condition']) => {
        setLayers(layers.map(l =>
            l.id === id ? { ...l, condition } : l
        ));
    };

    const handleSave = async () => {
        if (!isValidWeight) {
            alert('Total weight must equal 100%');
            return;
        }

        setIsSaving(true);
        try {
            await onSave(layers);
        } catch (error) {
            console.error('Failed to save strategy:', error);
            alert('Failed to save strategy. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const getRiskColor = (risk: number) => {
        if (risk < 30) return 'text-green-400';
        if (risk < 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getConditionIcon = (condition: string) => {
        switch (condition) {
            case 'bullish': return <TrendingUp className="w-4 h-4" />;
            case 'bearish': return <TrendingDown className="w-4 h-4" />;
            case 'neutral': return <Minus className="w-4 h-4" />;
            case 'euphoric': return <TrendingUp className="w-4 h-4 text-purple-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white">Strategy Builder</h2>
                    <p className="text-gray-400 mt-1">Create your custom multi-layer strategy</p>
                </div>
                <button
                    onClick={() => setIsAddingLayer(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Layer
                </button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Total Weight</div>
                    <div className={`text-2xl font-bold ${isValidWeight ? 'text-green-400' : 'text-red-400'}`}>
                        {totalWeight.toFixed(1)}%
                    </div>
                    {!isValidWeight && (
                        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Must equal 100%
                        </div>
                    )}
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Expected APY</div>
                    <div className="text-2xl font-bold text-blue-400">
                        {weightedAPY.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Weighted average</div>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-1">Risk Score</div>
                    <div className={`text-2xl font-bold ${getRiskColor(weightedRisk)}`}>
                        {weightedRisk.toFixed(0)}/100
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                        {weightedRisk < 30 ? 'Low' : weightedRisk < 60 ? 'Medium' : 'High'} risk
                    </div>
                </div>
            </div>

            {/* Strategy Layers */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Strategy Layers</h3>

                {layers.length === 0 ? (
                    <div className="bg-gray-800/30 border border-dashed border-gray-600 rounded-lg p-8 text-center">
                        <p className="text-gray-400">No layers yet. Add your first layer to get started.</p>
                    </div>
                ) : (
                    <Reorder.Group axis="y" values={layers} onReorder={setLayers} className="space-y-3">
                        {layers.map((layer) => (
                            <Reorder.Item key={layer.id} value={layer}>
                                <motion.div
                                    layout
                                    className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-move"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-white font-semibold">{layer.adapterName}</h4>
                                                {getConditionIcon(layer.condition)}
                                            </div>
                                            <div className="text-sm text-gray-400">
                                                APY: {layer.apy.toFixed(2)}% • Risk: {layer.riskScore}/100
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeLayer(layer.id)}
                                            className="text-gray-400 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {/* Weight Slider */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-sm text-gray-400">Weight</label>
                                            <input
                                                type="number"
                                                value={layer.weight.toFixed(1)}
                                                onChange={(e) => updateLayerWeight(layer.id, parseFloat(e.target.value))}
                                                className="w-20 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm text-right"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                            />
                                        </div>
                                        <input
                                            type="range"
                                            value={layer.weight}
                                            onChange={(e) => updateLayerWeight(layer.id, parseFloat(e.target.value))}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                            min="0"
                                            max="100"
                                            step="0.1"
                                        />
                                        <div className="mt-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                                                style={{ width: `${layer.weight}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Condition Selector */}
                                    <div>
                                        <label className="text-sm text-gray-400 block mb-2">Execution Condition</label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {(['always', 'bullish', 'bearish', 'neutral', 'euphoric'] as const).map((cond) => (
                                                <button
                                                    key={cond}
                                                    onClick={() => updateLayerCondition(layer.id, cond)}
                                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${layer.condition === cond
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {cond.charAt(0).toUpperCase() + cond.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                )}
            </div>

            {/* Add Layer Modal */}
            {isAddingLayer && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4"
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Select Adapter</h3>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {availableAdapters.map((adapter) => (
                                <button
                                    key={adapter.address}
                                    onClick={() => addLayer(adapter)}
                                    className="w-full text-left p-4 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <div className="font-semibold text-white mb-1">{adapter.name}</div>
                                    <div className="text-sm text-gray-400">
                                        APY: {adapter.apy.toFixed(2)}% • Risk: {adapter.riskScore}/100
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsAddingLayer(false)}
                            className="mt-4 w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                    {layers.length} layer{layers.length !== 1 ? 's' : ''} configured
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isValidWeight || isSaving || layers.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                >
                    {isSaving ? 'Saving...' : 'Save Strategy'}
                </button>
            </div>
        </div>
    );
}
