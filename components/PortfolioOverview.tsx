import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Ecosystem, PortfolioAllocation, Strategy, MarketSentiment } from '../types';
import { Layers, TrendingUp, DollarSign, Activity, Globe } from 'lucide-react';

interface PortfolioOverviewProps {
  ecosystems: Ecosystem[];
  allocations: PortfolioAllocation[];
  strategies: Strategy[];
}

const COLORS = ['#7C3AED', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#6366F1'];

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ ecosystems, allocations, strategies }) => {
  
  const metrics = useMemo(() => {
    let totalTVL = 0;
    let weightedYieldSum = 0;
    
    // Data for charts
    const ecosystemData: { name: string; value: number; color: string }[] = [];
    const strategyTypeData: { [key: string]: number } = {};

    ecosystems.forEach(eco => {
      let ecoTVL = 0;
      
      eco.assets.forEach(asset => {
        const balance = asset.balance;
        ecoTVL += balance;
        totalTVL += balance;

        // Calculate yield contribution
        const allocation = allocations.find(a => a.assetId === asset.id);
        if (allocation && allocation.layers.length > 0) {
          allocation.layers.forEach(layer => {
            const strategy = strategies.find(s => s.id === layer.strategyId);
            if (strategy) {
              // Weighted APY contribution: (Strategy APY * Strategy Weight * Asset Balance)
              // We divide by 100 for weight percentage
              weightedYieldSum += (strategy.apy * (layer.weight / 100)) * balance;
              
              // Strategy Type distribution
              strategyTypeData[strategy.type] = (strategyTypeData[strategy.type] || 0) + (balance * (layer.weight / 100));
            }
          });
        }
      });

      ecosystemData.push({ name: eco.name, value: ecoTVL, color: eco.color });
    });

    const avgAPY = totalTVL > 0 ? weightedYieldSum / totalTVL : 0;

    const strategyData = Object.entries(strategyTypeData).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);

    return { totalTVL, avgAPY, ecosystemData, strategyData };
  }, [ecosystems, allocations, strategies]);

  return (
    <div className="space-y-8 pb-20">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <DollarSign className="w-24 h-24 text-black" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Total Value Locked</h3>
          <div className="text-4xl font-mono font-bold tracking-tight">
            ${metrics.totalTVL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs font-bold text-green-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Across {ecosystems.length} Networks</span>
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Activity className="w-24 h-24 text-defi-purple" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Aggregated APY</h3>
          <div className="text-4xl font-mono font-bold tracking-tight text-defi-purple">
            {metrics.avgAPY.toFixed(2)}%
          </div>
          <div className="mt-2 text-xs font-bold text-gray-500">
            Weighted Average
          </div>
        </div>

        <div className="bg-white border-2 border-black p-6 shadow-brutal relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Globe className="w-24 h-24 text-blue-500" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Active Assets</h3>
          <div className="text-4xl font-mono font-bold tracking-tight">
            {allocations.filter(a => a.layers.length > 0).length}
          </div>
          <div className="mt-2 text-xs font-bold text-gray-500">
            Strategies Deployed
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ecosystem Allocation */}
        <div className="bg-white border-2 border-black p-6 shadow-brutal">
          <h3 className="text-lg font-bold uppercase mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5" /> Chain Allocation
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.ecosystemData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {metrics.ecosystemData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="black" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  contentStyle={{ border: '2px solid black', borderRadius: '0px', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {metrics.ecosystemData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-black" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold uppercase">{entry.name}</span>
                <span className="text-xs text-gray-500 font-mono">
                  {((entry.value / metrics.totalTVL) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Exposure */}
        <div className="bg-white border-2 border-black p-6 shadow-brutal">
          <h3 className="text-lg font-bold uppercase mb-6 flex items-center gap-2">
            <Layers className="w-5 h-5" /> Strategy Exposure
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.strategyData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  formatter={(value: number) => `$${value.toLocaleString()}`}
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ border: '2px solid black', borderRadius: '0px', boxShadow: '4px 4px 0px 0px rgba(0,0,0,1)' }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {metrics.strategyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="black" strokeWidth={1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white border-2 border-black shadow-brutal">
        <div className="p-4 border-b-2 border-black bg-gray-50">
          <h3 className="font-bold uppercase text-sm">Portfolio Drill-down</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b-2 border-black">
              <tr>
                <th className="px-6 py-3 font-bold">Asset</th>
                <th className="px-6 py-3 font-bold">Chain</th>
                <th className="px-6 py-3 font-bold text-right">Balance</th>
                <th className="px-6 py-3 font-bold text-right">Active Strategies</th>
                <th className="px-6 py-3 font-bold text-right">Est. Yield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ecosystems.flatMap(eco => 
                eco.assets.map(asset => {
                  const allocation = allocations.find(a => a.assetId === asset.id);
                  const strategiesCount = allocation ? allocation.layers.length : 0;
                  
                  // Calculate yield for this asset
                  let assetYield = 0;
                  if (allocation) {
                    allocation.layers.forEach(layer => {
                      const s = strategies.find(strat => strat.id === layer.strategyId);
                      if (s) assetYield += s.apy * (layer.weight / 100);
                    });
                  }

                  return { asset, eco, strategiesCount, assetYield };
                })
              )
              .sort((a, b) => b.asset.balance - a.asset.balance)
              .filter(item => item.asset.balance > 0)
              .map(({ asset, eco, strategiesCount, assetYield }) => (
                <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <img src={asset.icon} className="w-6 h-6" alt="" />
                    {asset.symbol}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 text-xs font-bold rounded border border-gray-300">
                      {eco.symbol}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    ${asset.balance.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {strategiesCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-defi-purple">
                        <Layers className="w-3 h-3" /> {strategiesCount}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-bold text-green-600">
                    {assetYield > 0 ? `${assetYield.toFixed(2)}%` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PortfolioOverview;
