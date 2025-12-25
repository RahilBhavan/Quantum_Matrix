import CoreVaultABI from './abi/CoreVault.json';
import MockAdapterABI from './abi/MockYieldAdapter.json';
import MockUSDCABI from './abi/MockUSDC.json';

export const CONTRACTS = {
    sepolia: {
        CoreVault: '', // Will be updated after deployment
        MockYieldAdapter: '',
        MockUSDC: '',
    },
    mainnet: {
        CoreVault: '', // Not deployed yet
    }
} as const;

export const ABIS = {
    CoreVault: CoreVaultABI,
    MockYieldAdapter: MockAdapterABI,
    MockUSDC: MockUSDCABI,
} as const;

// Chain IDs
export const CHAINS = {
    SEPOLIA: 11155111,
    MAINNET: 1,
    ARBITRUM: 42161,
    ARBITRUM_SEPOLIA: 421614,
} as const;

// Helper to get contract address by chain
export function getContractAddress(
    contract: keyof typeof CONTRACTS.sepolia,
    chainId: number
): string {
    if (chainId === CHAINS.SEPOLIA) {
        return CONTRACTS.sepolia[contract];
    }
    if (chainId === CHAINS.MAINNET && contract === 'CoreVault') {
        return CONTRACTS.mainnet.CoreVault;
    }
    throw new Error(`Contract ${contract} not deployed on chain ${chainId}`);
}
