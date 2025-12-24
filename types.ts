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
