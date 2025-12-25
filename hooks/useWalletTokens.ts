import { useState, useEffect, useMemo } from 'react';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { WalletToken, EcosystemConfig, TokenSource } from '../types';
import { ECOSYSTEM_CONFIGS, KNOWN_TOKENS } from '../config/ecosystems';

interface UseWalletTokensOptions {
    includeZeroBalances?: boolean;
    ecosystemId?: string;
}

interface UseWalletTokensReturn {
    tokens: WalletToken[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
    totalBalance: number;
    tokensByEcosystem: Record<string, WalletToken[]>;
}

// Token logo fallback
const getTokenLogo = (symbol: string, chainId: number): string => {
    const symbolLower = symbol.toLowerCase();
    // Try CryptoLogos first
    return `https://cryptologos.cc/logos/${symbolLower}-${symbolLower}-logo.png`;
};

// Mock price fetcher - in production, use CoinGecko/DeFiLlama
const getMockPrice = (symbol: string): number => {
    const prices: Record<string, number> = {
        ETH: 2800,
        USDC: 1,
        USDT: 1,
        DAI: 1,
        UNI: 8.5,
        LDO: 2.1,
        SOL: 145,
        ARB: 1.1,
        GMX: 35,
        WETH: 2800,
        WBTC: 95000,
    };
    return prices[symbol.toUpperCase()] || 1;
};

export const useWalletTokens = (options: UseWalletTokensOptions = {}): UseWalletTokensReturn => {
    const { includeZeroBalances = false, ecosystemId } = options;
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const [tokens, setTokens] = useState<WalletToken[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Get native token balance for current chain
    const { data: nativeBalance, refetch: refetchNative } = useBalance({
        address,
        chainId,
    });

    // Fetch tokens when wallet connects or chain changes
    useEffect(() => {
        if (!isConnected || !address) {
            setTokens([]);
            return;
        }

        const fetchTokens = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const walletTokens: WalletToken[] = [];

                // Find the ecosystem config for the current chain
                const currentEcosystem = ECOSYSTEM_CONFIGS.find(e => e.chainId === chainId);

                if (currentEcosystem && nativeBalance) {
                    // Add native token
                    const nativeToken: WalletToken = {
                        id: `${currentEcosystem.id}-native`,
                        name: currentEcosystem.nativeToken.name,
                        symbol: currentEcosystem.nativeToken.symbol,
                        balance: parseFloat(nativeBalance.formatted) * getMockPrice(currentEcosystem.nativeToken.symbol),
                        price: getMockPrice(currentEcosystem.nativeToken.symbol),
                        icon: currentEcosystem.icon,
                        chainId: currentEcosystem.chainId,
                        source: 'wallet' as TokenSource,
                        decimals: currentEcosystem.nativeToken.decimals,
                        rawBalance: nativeBalance.value,
                    };

                    if (includeZeroBalances || nativeToken.balance > 0) {
                        walletTokens.push(nativeToken);
                    }
                }

                // For now, add mock ERC20 tokens based on known tokens
                // In production, use multicall to fetch all token balances
                const knownTokensForChain = KNOWN_TOKENS[chainId] || [];
                for (const tokenInfo of knownTokensForChain) {
                    // Mock balance for demo - in production, use useReadContracts
                    const mockBalance = Math.random() * 10000;
                    const price = getMockPrice(tokenInfo.symbol);

                    const token: WalletToken = {
                        id: `${chainId}-${tokenInfo.address}`,
                        name: tokenInfo.name,
                        symbol: tokenInfo.symbol,
                        balance: mockBalance * price,
                        price,
                        icon: tokenInfo.logoURI || getTokenLogo(tokenInfo.symbol, chainId),
                        chainId,
                        contractAddress: tokenInfo.address,
                        source: 'wallet' as TokenSource,
                        decimals: tokenInfo.decimals,
                    };

                    if (includeZeroBalances || token.balance > 0) {
                        walletTokens.push(token);
                    }
                }

                setTokens(walletTokens);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch tokens'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokens();
    }, [isConnected, address, chainId, nativeBalance, includeZeroBalances, refreshKey]);

    const refetch = () => {
        refetchNative();
        setRefreshKey(k => k + 1);
    };

    const totalBalance = useMemo(() =>
        tokens.reduce((sum, t) => sum + t.balance, 0),
        [tokens]
    );

    const tokensByEcosystem = useMemo(() => {
        const grouped: Record<string, WalletToken[]> = {};
        for (const token of tokens) {
            const eco = ECOSYSTEM_CONFIGS.find(e => e.chainId === token.chainId);
            const ecoId = eco?.id || 'unknown';
            if (!grouped[ecoId]) grouped[ecoId] = [];
            grouped[ecoId].push(token);
        }
        return grouped;
    }, [tokens]);

    // Filter by ecosystem if specified
    const filteredTokens = useMemo(() => {
        if (!ecosystemId) return tokens;
        return tokens.filter(t => {
            const eco = ECOSYSTEM_CONFIGS.find(e => e.chainId === t.chainId);
            return eco?.id === ecosystemId;
        });
    }, [tokens, ecosystemId]);

    return {
        tokens: filteredTokens,
        isLoading,
        error,
        refetch,
        totalBalance,
        tokensByEcosystem,
    };
};

export default useWalletTokens;
