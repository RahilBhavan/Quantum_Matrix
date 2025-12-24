import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Strategy } from '../types';
import { Layers, TrendingUp, Shield, Zap, Binary, Activity, Hash, AlertCircle } from 'lucide-react';

interface Props {
  strategy: Strategy;
  onDragStart: (e: React.DragEvent, strategyId: string) => void;
  onDragEnd?: () => void;
  compact?: boolean; 
}

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'Low': return 'bg-defi-success'; // Green
    case 'Medium': return 'bg-yellow-400'; // Yellow
    case 'High': return 'bg-defi-danger'; // Red
    case 'Degen': return 'bg-purple-600'; // Purple
    default: return 'bg-gray-400';
  }
};

const getRiskBorderColor = (risk: string) => {
    switch (risk) {
      case 'Low': return 'border-defi-success text-defi-success';
      case 'Medium': return 'border-yellow-600 text-yellow-700'; // Darker for text/border
      case 'High': return 'border-defi-danger text-defi-danger';
      case 'Degen': return 'border-purple-600 text-purple-600';
      default: return 'border-gray-400 text-gray-600';
    }
  };

const getIcon = (type: string) => {
  switch (type) {
    case 'Yield': return <Layers className="w-4 h-4" />;
    case 'Momentum': return <TrendingUp className="w-4 h-4" />;
    case 'DeltaNeutral': return <Shield className="w-4 h-4" />;
    case 'Leverage': return <Zap className="w-4 h-4" />;
    case 'Quant': return <Binary className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

const StrategyDraggable: React.FC<Props> = ({ strategy, onDragStart, onDragEnd, compact }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (elementRef.current && !compact) {
        const rect = elementRef.current.getBoundingClientRect();
        setCoords({
            top: rect.top,
            left: rect.right + 12 // 12px gap to the right
        });
        setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Close tooltip on scroll to prevent it from detaching visually
  useEffect(() => {
    const handleScroll = () => {
        if (isHovered) setIsHovered(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isHovered]);

  return (
    <>
      <div
        ref={elementRef}
        draggable
        onDragStart={(e) => {
            setIsHovered(false);
            onDragStart(e, strategy.id);
        }}
        onDragEnd={onDragEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          cursor-grab active:cursor-grabbing
          group relative transition-all duration-200 select-none
          bg-white border-2 border-black
          ${compact 
            ? 'p-2 flex items-center gap-2' 
            : 'mb-4 shadow-brutal-sm hover:shadow-brutal hover:-translate-y-0.5'}
        `}
      >
        {/* Left Colored Strip */}
        {!compact && (
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${getRiskColor(strategy.riskLevel)} border-r-2 border-black`}></div>
        )}

        <div className={`${compact ? '' : 'pl-5 p-3'}`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                  {/* Icon Box */}
                  {!compact && (
                      <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {getIcon(strategy.type)}
                      </div>
                  )}
                  <h4 className={`font-display font-bold uppercase leading-none ${compact ? 'text-xs' : 'text-sm'}`}>
                      {strategy.name}
                  </h4>
              </div>
              
              {!compact && (
                  <span className={`text-[10px] font-bold uppercase px-1 border ${getRiskBorderColor(strategy.riskLevel)}`}>
                      {strategy.riskLevel}
                  </span>
              )}
            </div>

            {/* Description */}
            {!compact && (
                <p className="text-xs text-gray-600 mb-3 leading-tight font-medium line-clamp-2">
                    {strategy.description}
                </p>
            )}

            {/* Footer Tags & APY */}
            {!compact && (
                <div className="flex items-center justify-between pt-2 border-t border-black/10">
                    <div className="flex gap-1">
                        {strategy.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-bold uppercase border border-black px-1 bg-white text-black">
                                {tag}
                            </span>
                        ))}
                    </div>
                    <div className="bg-green-100 text-green-800 border border-black px-1 text-[10px] font-bold font-mono">
                        {strategy.apy}% APY
                    </div>
                </div>
            )}
        </div>
      </div>

      {/* Portal Tooltip */}
      {isHovered && !compact && createPortal(
        <div 
            className="fixed z-[9999] w-72 bg-black text-white p-5 border-2 border-white shadow-[8px_8px_0px_0px_rgba(0,0,0,0.2)] pointer-events-none animate-fade-in"
            style={{ 
                top: Math.min(coords.top, window.innerHeight - 200), // Prevent going off bottom
                left: coords.left 
            }}
        >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/20">
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded text-black ${getRiskColor(strategy.riskLevel)}`}>
                    {strategy.riskLevel} Risk
                </span>
                <span className="font-mono text-xs text-defi-success font-bold">
                    Target: {strategy.apy}% APY
                </span>
            </div>

            <h4 className="font-display font-bold text-xl uppercase mb-2 text-white tracking-wide">
                {strategy.name}
            </h4>
            
            <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                {strategy.description}
            </p>

            <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400 uppercase font-bold tracking-wider">
                    <Binary className="w-3 h-3" />
                    Strategy Type
                </div>
                <div className="text-sm font-medium">{strategy.type}</div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
                {strategy.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono border border-white/40 px-1.5 py-0.5 rounded-sm text-gray-300">
                        #{t}
                    </span>
                ))}
            </div>
            
            {/* Decorative Corner */}
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white/50"></div>
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white/50"></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default StrategyDraggable;