export interface Strategy {
  id: string;
  name: string;
  description: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Degen';
  apy: number;
  type: 'Yield' | 'Momentum' | 'DeltaNeutral' | 'Leverage' | 'Quant';
  tags: string[];
}

export interface Asset {
  id: string;
  name: string;
  symbol: string;
  balance: number; // In USD
  price: number;
  icon: string;
}

export interface Ecosystem {
  id: string;
  name: string;
  symbol: string;
  color: string;
  icon: string;
  assets: Asset[];
}

export type StrategyCondition = 'Always' | 'Bullish' | 'Bearish' | 'Neutral' | 'Euphoric' | 'High Volatility' | 'AI Adaptive';

export interface StrategyLayer {
  id: string; // unique instance id
  strategyId: string;
  condition: StrategyCondition;
  weight: number; // Percentage 0-100
}

export interface PortfolioAllocation {
  assetId: string;
  layers: StrategyLayer[];
}

export interface MarketSentiment {
  score: number; // 0 to 100
  label: 'Bearish' | 'Neutral' | 'Bullish' | 'Euphoric';
  summary: string;
  trendingTopics: string[];
}

export interface AiRecommendation {
  allocations: {
    assetId: string;
    layers: { strategyId: string; condition: StrategyCondition; weight: number }[]
  }[];
  reasoning: string;
}

// Wallet-driven token types
export type TokenSource = 'wallet' | 'pinned' | 'mock';

export interface WalletToken extends Asset {
  chainId: number;
  contractAddress?: string; // undefined for native tokens
  source: TokenSource;
  rawBalance?: bigint; // Raw balance in wei/smallest unit
  decimals: number;
}

export interface EcosystemConfig {
  id: string;
  name: string;
  chainId: number;
  symbol: string;
  color: string;
  icon: string;
  nativeToken: {
    symbol: string;
    name: string;
    decimals: number;
  };
  rpcUrl?: string;
  explorerUrl?: string;
}

export interface TokenListItem {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// DnD types for ecosystem blocks
export interface DragItem {
  type: 'strategy' | 'token';
  id: string;
  sourceEcosystemId?: string;
}

export interface DropResult {
  targetAssetId?: string;
  targetEcosystemId?: string;
}

export interface RebalanceEvent {
  id: number;
  ecosystem: string;
  assetId: string;
  triggerType: string;
  sentimentScore?: number;
  sentimentLabel?: string;
  gasCostUsd?: number;
  profitUsd?: number;
  txHash?: string;
  status: 'pending' | 'success' | 'failed';
  errorMessage?: string;
  executedAt: string;
}

