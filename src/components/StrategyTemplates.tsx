import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';

interface StrategyTemplate {
    id: number;
    name: string;
    description: string;
    riskScore: number;
    expectedAPY: string;
    layers: {
        adapter: string;
        weight: number;
        condition: string;
    }[];
}

const templates: StrategyTemplate[] = [
    {
        id: 0,
        name: 'Conservative Yield',
        description: '70% Aave lending + 30% Uniswap V3 LP. Low risk, stable returns.',
        riskScore: 25,
        expectedAPY: '10-12%',
        layers: [
            { adapter: 'Aave V3', weight: 70, condition: 'Always' },
            { adapter: 'Uniswap V3', weight: 30, condition: 'Always' }
        ]
    },
    {
        id: 1,
        name: 'Sentiment Adaptive',
        description: 'Adapts allocation based on market sentiment. Bullish: more LP, Bearish: more lending.',
        riskScore: 40,
        expectedAPY: '12-18%',
        layers: [
            { adapter: 'Uniswap V3', weight: 60, condition: 'Bullish' },
            { adapter: 'Aave V3', weight: 40, condition: 'Bullish' },
            { adapter: 'Aave V3', weight: 80, condition: 'Bearish' },
            { adapter: 'Uniswap V3', weight: 20, condition: 'Bearish' }
        ]
    },
    {
        id: 2,
        name: 'Aggressive Growth',
        description: '70% Uniswap V3 + 30% GMX. High risk, only active in bullish markets.',
        riskScore: 70,
        expectedAPY: '20-30%',
        layers: [
            { adapter: 'Uniswap V3', weight: 70, condition: 'Bullish' },
            { adapter: 'GMX', weight: 30, condition: 'Bullish' }
        ]
    },
    {
        id: 3,
        name: 'Balanced Portfolio',
        description: '50% Aave + 50% Uniswap V3. Balanced risk and reward.',
        riskScore: 35,
        expectedAPY: '11-15%',
        layers: [
            { adapter: 'Aave V3', weight: 50, condition: 'Always' },
            { adapter: 'Uniswap V3', weight: 50, condition: 'Always' }
        ]
    }
];

interface StrategyTemplatesProps {
    onSelectTemplate: (templateId: number) => void;
}

export default function StrategyTemplates({ onSelectTemplate }: StrategyTemplatesProps) {
    const getRiskColor = (risk: number) => {
        if (risk < 30) return 'text-green-400';
        if (risk < 60) return 'text-yellow-400';
        return 'text-red-400';
    };

    const getRiskBadge = (risk: number) => {
        if (risk < 30) return { text: 'Low Risk', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
        if (risk < 60) return { text: 'Medium Risk', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
        return { text: 'High Risk', color: 'bg-red-500/20 text-red-400 border-red-500/30' };
    };

    const getTemplateIcon = (id: number) => {
        switch (id) {
            case 0: return <Shield className="w-6 h-6 text-green-400" />;
            case 1: return <BarChart3 className="w-6 h-6 text-blue-400" />;
            case 2: return <Zap className="w-6 h-6 text-purple-400" />;
            case 3: return <TrendingUp className="w-6 h-6 text-yellow-400" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white">Strategy Templates</h2>
                <p className="text-gray-400 mt-1">Choose a pre-built strategy or create your own</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template, index) => {
                    const riskBadge = getRiskBadge(template.riskScore);

                    return (
                        <motion.div
                            key={template.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-700 hover:border-blue-500/50 rounded-lg p-6 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/10"
                            onClick={() => onSelectTemplate(template.id)}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-700/50 rounded-lg">
                                        {getTemplateIcon(template.id)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {template.name}
                                        </h3>
                                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border mt-1 ${riskBadge.color}`}>
                                            {riskBadge.text}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Description */}
                            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                                {template.description}
                            </p>

                            {/* Metrics */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-700/30 rounded-lg p-3">
                                    <div className="text-xs text-gray-400 mb-1">Expected APY</div>
                                    <div className="text-lg font-bold text-blue-400">{template.expectedAPY}</div>
                                </div>
                                <div className="bg-gray-700/30 rounded-lg p-3">
                                    <div className="text-xs text-gray-400 mb-1">Risk Score</div>
                                    <div className={`text-lg font-bold ${getRiskColor(template.riskScore)}`}>
                                        {template.riskScore}/100
                                    </div>
                                </div>
                            </div>

                            {/* Layers Preview */}
                            <div className="space-y-2">
                                <div className="text-xs text-gray-400 font-medium">Strategy Layers:</div>
                                {template.layers.slice(0, 2).map((layer, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <span className="text-gray-300">{layer.adapter}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">{layer.weight}%</span>
                                            <span className="px-2 py-0.5 bg-gray-700 rounded text-gray-300">
                                                {layer.condition}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {template.layers.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                        +{template.layers.length - 2} more layer{template.layers.length - 2 !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>

                            {/* Hover Effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-lg transition-all pointer-events-none" />
                        </motion.div>
                    );
                })}
            </div>

            {/* Custom Strategy Button */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="relative bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-8 text-center cursor-pointer transition-all group"
                onClick={() => onSelectTemplate(-1)} // -1 for custom
            >
                <div className="text-gray-400 group-hover:text-white transition-colors">
                    <div className="text-lg font-semibold mb-2">Create Custom Strategy</div>
                    <div className="text-sm">Build your own multi-layer strategy from scratch</div>
                </div>
            </motion.div>
        </div>
    );
}
