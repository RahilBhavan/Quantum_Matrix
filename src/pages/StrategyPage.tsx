import React, { useState, useEffect } from 'react';
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseUnits } from 'viem';
import StrategyTemplates from '../components/StrategyTemplates';
import StrategyBuilder, { StrategyLayer } from '../components/StrategyBuilder';
import { AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Contract ABIs (simplified)
const CORE_VAULT_ABI = [
    {
        name: 'addStrategyLayer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'adapter', type: 'address' },
            { name: 'condition', type: 'uint8' },
            { name: 'weight', type: 'uint16' }
        ],
        outputs: []
    },
    {
        name: 'getUserLayers',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'user', type: 'address' },
            { name: 'asset', type: 'address' }
        ],
        outputs: [
            {
                name: '',
                type: 'tuple[]',
                components: [
                    { name: 'adapter', type: 'address' },
                    { name: 'condition', type: 'uint8' },
                    { name: 'weight', type: 'uint16' }
                ]
            }
        ]
    }
] as const;

const STRATEGY_COMPOSER_ABI = [
    {
        name: 'applyTemplate',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'asset', type: 'address' },
            { name: 'templateType', type: 'uint8' }
        ],
        outputs: []
    }
] as const;

// Contract addresses (from environment)
const CORE_VAULT_ADDRESS = import.meta.env.VITE_CORE_VAULT_SEPOLIA as `0x${string}`;
const STRATEGY_COMPOSER_ADDRESS = import.meta.env.VITE_STRATEGY_COMPOSER_SEPOLIA as `0x${string}`;
const USDC_ADDRESS = import.meta.env.VITE_MOCK_USDC_SEPOLIA as `0x${string}`;

// Available adapters
const AVAILABLE_ADAPTERS = [
    {
        address: import.meta.env.VITE_AAVE_ADAPTER_SEPOLIA as string,
        name: 'Aave V3 Lending',
        apy: 12.5,
        riskScore: 20
    },
    {
        address: import.meta.env.VITE_UNISWAP_ADAPTER_SEPOLIA as string,
        name: 'Uniswap V3 Liquidity',
        apy: 8.3,
        riskScore: 50
    }
];

const CONDITION_MAP = {
    'always': 0,
    'bullish': 1,
    'bearish': 2,
    'neutral': 3,
    'euphoric': 4
} as const;

export default function StrategyPage() {
    const { address } = useAccount();
    const [view, setView] = useState<'templates' | 'builder'>('templates');
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
    const [customLayers, setCustomLayers] = useState<StrategyLayer[]>([]);

    // Read existing user layers
    const { data: existingLayers } = useContractRead({
        address: CORE_VAULT_ADDRESS,
        abi: CORE_VAULT_ABI,
        functionName: 'getUserLayers',
        args: address ? [address, USDC_ADDRESS] : undefined,
        enabled: !!address
    });

    // Apply template
    const { write: applyTemplate, data: applyData } = useContractWrite({
        address: STRATEGY_COMPOSER_ADDRESS,
        abi: STRATEGY_COMPOSER_ABI,
        functionName: 'applyTemplate'
    });

    const { isLoading: isApplying, isSuccess: isApplied } = useWaitForTransaction({
        hash: applyData?.hash
    });

    // Add custom layer
    const { write: addLayer, data: addLayerData } = useContractWrite({
        address: CORE_VAULT_ADDRESS,
        abi: CORE_VAULT_ABI,
        functionName: 'addStrategyLayer'
    });

    const { isLoading: isAddingLayer, isSuccess: isLayerAdded } = useWaitForTransaction({
        hash: addLayerData?.hash
    });

    const handleSelectTemplate = (templateId: number) => {
        if (templateId === -1) {
            // Custom strategy
            setView('builder');
            setSelectedTemplate(null);
        } else {
            setSelectedTemplate(templateId);
            // Apply template
            if (applyTemplate) {
                applyTemplate({
                    args: [USDC_ADDRESS, templateId]
                });
            }
        }
    };

    const handleSaveCustomStrategy = async (layers: StrategyLayer[]) => {
        if (!addLayer) return;

        // Add each layer sequentially
        for (const layer of layers) {
            const condition = CONDITION_MAP[layer.condition];
            const weight = Math.round(layer.weight * 100); // Convert to basis points

            await addLayer({
                args: [
                    USDC_ADDRESS,
                    layer.adapter as `0x${string}`,
                    condition,
                    weight
                ]
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Strategy Management
                    </h1>
                    <p className="text-gray-400">
                        Create and manage your multi-layer yield strategies
                    </p>
                </div>

                {/* Status Messages */}
                {isApplying && (
                    <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
                        <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-blue-400">Applying template...</span>
                    </div>
                )}

                {isApplied && (
                    <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400">Template applied successfully!</span>
                    </div>
                )}

                {isAddingLayer && (
                    <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
                        <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                        <span className="text-blue-400">Adding strategy layers...</span>
                    </div>
                )}

                {/* View Toggle */}
                <div className="mb-6 flex gap-2 bg-gray-800/50 p-1 rounded-lg w-fit">
                    <button
                        onClick={() => setView('templates')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'templates'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setView('builder')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${view === 'builder'
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        Custom Builder
                    </button>
                </div>

                {/* Content */}
                {!address ? (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 flex items-start gap-3">
                        <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <div className="text-yellow-400 font-semibold mb-1">Wallet Not Connected</div>
                            <div className="text-gray-400 text-sm">
                                Please connect your wallet to create and manage strategies.
                            </div>
                        </div>
                    </div>
                ) : view === 'templates' ? (
                    <StrategyTemplates onSelectTemplate={handleSelectTemplate} />
                ) : (
                    <StrategyBuilder
                        availableAdapters={AVAILABLE_ADAPTERS}
                        onSave={handleSaveCustomStrategy}
                        initialLayers={customLayers}
                    />
                )}
            </div>
        </div>
    );
}
