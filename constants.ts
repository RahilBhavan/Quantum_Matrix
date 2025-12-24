import { Strategy, Ecosystem } from './types';

export const STRATEGIES: Strategy[] = [
  {
    id: 'strat-mean-reversion',
    name: 'Mean Reversion v4',
    description: 'Statistical arbitrage exploiting short-term price deviations from moving averages.',
    riskLevel: 'Medium',
    apy: 18.5,
    type: 'Quant',
    tags: ['StatArb', 'Neutral'],
  },
  {
    id: 'strat-delta-gamma',
    name: 'Delta-Gamma Hedged',
    description: 'Market-neutral options vault harvesting volatility premiums.',
    riskLevel: 'Low',
    apy: 12.2,
    type: 'DeltaNeutral',
    tags: ['Options', 'Low Vol'],
  },
  {
    id: 'strat-momentum-alpha',
    name: 'Alpha Momentum',
    description: 'Trend-following algo utilizing on-chain volume and sentiment analysis.',
    riskLevel: 'High',
    apy: 45.0,
    type: 'Momentum',
    tags: ['Trend', 'Aggr'],
  },
  {
    id: 'strat-liquid-loop',
    name: 'Recursive Staking',
    description: 'Leveraged liquid staking loop via lending protocols (3x leverage).',
    riskLevel: 'High',
    apy: 24.5,
    type: 'Leverage',
    tags: ['LST', 'Loop'],
  },
  {
    id: 'strat-basis-arb',
    name: 'Basis Arbitrage',
    description: 'Captures spread between spot and futures prices (Cash & Carry).',
    riskLevel: 'Low',
    apy: 8.5,
    type: 'Yield',
    tags: ['Arb', 'Stable'],
  },
  {
    id: 'strat-degen-farm',
    name: 'Hyper-Liquidity',
    description: 'Auto-compounding into incentivized pools with impermanent loss protection disabled.',
    riskLevel: 'Degen',
    apy: 150.5,
    type: 'Yield',
    tags: ['High Risk', 'New'],
  },
];

export const ECOSYSTEMS: Ecosystem[] = [
  {
    id: 'eco-eth',
    name: 'Ethereum Mainnet',
    symbol: 'ETH',
    color: '#627EEA',
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    assets: [
      { id: 'asset-eth', name: 'Ether', symbol: 'ETH', balance: 25000, price: 2800, icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
      { id: 'asset-usdc', name: 'USD Coin', symbol: 'USDC', balance: 15000, price: 1, icon: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png' },
      { id: 'asset-uni', name: 'Uniswap', symbol: 'UNI', balance: 5000, price: 8.5, icon: 'https://cryptologos.cc/logos/uniswap-uni-logo.png' },
      { id: 'asset-ldo', name: 'Lido DAO', symbol: 'LDO', balance: 3500, price: 2.1, icon: 'https://cryptologos.cc/logos/lido-dao-ldo-logo.png' },
    ]
  },
  {
    id: 'eco-sol',
    name: 'Solana',
    symbol: 'SOL',
    color: '#14F195',
    icon: 'https://cryptologos.cc/logos/solana-sol-logo.png',
    assets: [
      { id: 'asset-sol', name: 'Solana', symbol: 'SOL', balance: 12000, price: 145, icon: 'https://cryptologos.cc/logos/solana-sol-logo.png' },
      { id: 'asset-jup', name: 'Jupiter', symbol: 'JUP', balance: 4000, price: 1.2, icon: 'https://cryptologos.cc/logos/jupiter-ag-jup-logo.png' },
      { id: 'asset-bonk', name: 'Bonk', symbol: 'BONK', balance: 1000, price: 0.00002, icon: 'https://cryptologos.cc/logos/bonk1-bonk-logo.png' },
      { id: 'asset-pyth', name: 'Pyth Network', symbol: 'PYTH', balance: 2500, price: 0.4, icon: 'https://cryptologos.cc/logos/pyth-network-pyth-logo.png' },
    ]
  },
  {
    id: 'eco-arb',
    name: 'Arbitrum',
    symbol: 'ARB',
    color: '#2D374B',
    icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
    assets: [
      { id: 'asset-arb', name: 'Arbitrum', symbol: 'ARB', balance: 8000, price: 1.1, icon: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
      { id: 'asset-gmx', name: 'GMX', symbol: 'GMX', balance: 4500, price: 35, icon: 'https://cryptologos.cc/logos/gmx-gmx-logo.png' },
      { id: 'asset-rdnt', name: 'Radiant', symbol: 'RDNT', balance: 1200, price: 0.15, icon: 'https://cryptologos.cc/logos/radiant-capital-rdnt-logo.png' },
    ]
  },
];

export const MOCK_NEWS_FEED = [
  "Fed signals potential rate cuts in Q4, markets react positively.",
  "Ethereum gas fees hit 2-year low, increasing L1 activity.",
  "Solana ecosystem sees 200% TVL growth in new DeFi protocols.",
  "Regulatory clarity emerging in Asian markets for stablecoins.",
  "Bitcoin halving supply shock beginning to materialize."
];
