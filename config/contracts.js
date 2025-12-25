import CoreVaultABI from './abi/CoreVault.json';
import MockAdapterABI from './abi/MockYieldAdapter.json';
import MockUSDCABI from './abi/MockUSDC.json';
export const CONTRACTS = {
    sepolia: {
        CoreVault: '0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0',
        MockYieldAdapter: '0x05251018325f1c998D23Dc1f7f7eD609A948D9A9',
        MockUSDC: '0x08009c047eA5a848997885d69E0352faab9B5Ee3',
        AaveV3Adapter: '0x05251018325f1c998D23Dc1f7f7eD609A948D9A9', // Placeholder (Mock)
        UniswapV3Adapter: '0x05251018325f1c998D23Dc1f7f7eD609A948D9A9', // Placeholder (Mock)
    },
    mainnet: {
        CoreVault: '', // Not deployed yet
    }
};
export const STRATEGY_MAP = {
    'strat-mean-reversion': CONTRACTS.sepolia.MockYieldAdapter,
    'strat-delta-gamma': CONTRACTS.sepolia.MockYieldAdapter,
    'strat-momentum-alpha': CONTRACTS.sepolia.MockYieldAdapter,
    'strat-liquid-loop': CONTRACTS.sepolia.AaveV3Adapter,
    'strat-basis-arb': CONTRACTS.sepolia.MockYieldAdapter,
    'strat-degen-farm': CONTRACTS.sepolia.UniswapV3Adapter,
};
export const ABIS = {
    CoreVault: CoreVaultABI,
    MockYieldAdapter: MockAdapterABI,
    MockUSDC: MockUSDCABI,
};
// Chain IDs
export const CHAINS = {
    SEPOLIA: 11155111,
    MAINNET: 1,
    ARBITRUM: 42161,
    ARBITRUM_SEPOLIA: 421614,
};
// Helper to get contract address by chain
export function getContractAddress(contract, chainId) {
    if (chainId === CHAINS.SEPOLIA) {
        return CONTRACTS.sepolia[contract];
    }
    if (chainId === CHAINS.MAINNET && contract === 'CoreVault') {
        return CONTRACTS.mainnet.CoreVault;
    }
    throw new Error(`Contract ${contract} not deployed on chain ${chainId}`);
}
//# sourceMappingURL=contracts.js.map