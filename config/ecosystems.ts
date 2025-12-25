import { EcosystemConfig, TokenListItem } from '../types';

// Ecosystem configurations with chain IDs
export const ECOSYSTEM_CONFIGS: EcosystemConfig[] = [
    {
        id: 'eco-eth',
        name: 'Ethereum Mainnet',
        chainId: 1,
        symbol: 'ETH',
        color: '#627EEA',
        icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        nativeToken: {
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
        },
        explorerUrl: 'https://etherscan.io',
    },
    {
        id: 'eco-sol',
        name: 'Solana',
        chainId: 900, // Placeholder - Solana isn't EVM
        symbol: 'SOL',
        color: '#14F195',
        icon: 'https://cryptologos.cc/logos/solana-sol-logo.png',
        nativeToken: {
            symbol: 'SOL',
            name: 'Solana',
            decimals: 9,
        },
        explorerUrl: 'https://solscan.io',
    },
    {
        id: 'eco-arb',
        name: 'Arbitrum',
        chainId: 42161,
        symbol: 'ARB',
        color: '#2D374B',
        icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
        nativeToken: {
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
        },
        explorerUrl: 'https://arbiscan.io',
    },
    {
        id: 'eco-sepolia',
        name: 'Sepolia Testnet',
        chainId: 11155111,
        symbol: 'ETH',
        color: '#627EEA',
        icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        nativeToken: {
            symbol: 'ETH',
            name: 'Ether',
            decimals: 18,
        },
        explorerUrl: 'https://sepolia.etherscan.io',
    },
];

// Known tokens per chain for balance fetching
export const KNOWN_TOKENS: Record<number, TokenListItem[]> = {
    // Ethereum Mainnet
    1: [
        {
            chainId: 1,
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        },
        {
            chainId: 1,
            address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
            symbol: 'UNI',
            name: 'Uniswap',
            decimals: 18,
            logoURI: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
        },
        {
            chainId: 1,
            address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
            symbol: 'LDO',
            name: 'Lido DAO',
            decimals: 18,
            logoURI: 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png',
        },
    ],
    // Arbitrum
    42161: [
        {
            chainId: 42161,
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            symbol: 'USDC',
            name: 'USD Coin',
            decimals: 6,
            logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        },
        {
            chainId: 42161,
            address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
            symbol: 'GMX',
            name: 'GMX',
            decimals: 18,
            logoURI: 'https://cryptologos.cc/logos/gmx-gmx-logo.png',
        },
        {
            chainId: 42161,
            address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            symbol: 'ARB',
            name: 'Arbitrum',
            decimals: 18,
            logoURI: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
        },
    ],
    // Sepolia Testnet
    11155111: [
        {
            chainId: 11155111,
            address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
            symbol: 'USDC',
            name: 'USD Coin (Test)',
            decimals: 6,
            logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        },
    ],
};

// Get ecosystem by chain ID
export const getEcosystemByChainId = (chainId: number): EcosystemConfig | undefined => {
    return ECOSYSTEM_CONFIGS.find(e => e.chainId === chainId);
};

// Get ecosystem by ID
export const getEcosystemById = (id: string): EcosystemConfig | undefined => {
    return ECOSYSTEM_CONFIGS.find(e => e.id === id);
};
