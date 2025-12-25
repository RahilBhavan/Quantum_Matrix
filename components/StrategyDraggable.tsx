import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Strategy } from '../types';
import { Layers, TrendingUp, Shield, Zap, Binary, Activity, Hash, AlertCircle } from 'lucide-react';

interface Props {
  strategy: Strategy;
  onDragStart?: (e: React.DragEvent, strategyId: string) => void;
  onDragEnd?: () => void;
  compact?: boolean;
  useDndKit?: boolean;
  isKeyboardSelected?: boolean;
  onKeyboardSelect?: (strategyId: string) => void;
}

const getRiskGradient = (risk: string) => {
  switch (risk) {
    case 'Low': return 'from-defi-success to-defi-cyan';
    case 'Medium': return 'from-defi-warning to-defi-accent';
    case 'High': return 'from-defi-danger to-defi-warning';
    case 'Degen': return 'from-defi-purple to-defi-danger';
    default: return 'from-gray-400 to-gray-500';
  }
};

const getRiskBadgeStyle = (risk: string) => {
  switch (risk) {
    case 'Low': return 'bg-defi-success/20 text-defi-success-light border-defi-success/30';
    case 'Medium': return 'bg-defi-warning/20 text-defi-warning border-defi-warning/30';
    case 'High': return 'bg-defi-danger/20 text-defi-danger-light border-defi-danger/30';
    case 'Degen': return 'bg-defi-purple/20 text-defi-purple-light border-defi-purple/30';
    default: return 'bg-defi-card text-defi-text-muted border-defi-border';
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

const StrategyDraggable: React.FC<Props> = ({
  strategy,
  onDragStart,
  onDragEnd,
  compact,
  useDndKit = true,
  isKeyboardSelected = false,
  onKeyboardSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const elementRef = useRef<HTMLDivElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: strategy.id,
    data: {
      type: 'strategy',
      strategy,
    },
  });

  const dndKitStyle = transform ? {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 1000 : undefined,
  } : undefined;

  const handleMouseEnter = () => {
    if (elementRef.current && !compact) {
      const rect = elementRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.right + 12
      });
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isHovered) setIsHovered(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isHovered]);

  const combinedRef = (node: HTMLDivElement | null) => {
    setNodeRef(node);
    (elementRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
  };

  return (
    <>
      <div
        ref={useDndKit ? combinedRef : elementRef}
        style={useDndKit ? dndKitStyle : undefined}
        {...(useDndKit ? { ...attributes, ...listeners } : {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            setIsHovered(false);
            onDragStart?.(e, strategy.id);
          },
          onDragEnd,
        })}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        tabIndex={0}
        role="button"
        aria-label={`${strategy.name} strategy, ${strategy.riskLevel} risk, ${strategy.apy}% APY. Press Enter or Space to select for keyboard drop.`}
        aria-pressed={isKeyboardSelected}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onKeyboardSelect) {
            e.preventDefault();
            onKeyboardSelect(strategy.id);
          }
        }}
        className={`
          cursor-grab active:cursor-grabbing
          group relative transition-all duration-300 select-none
          glass-card rounded-xl
          focus:outline-none focus-visible:ring-2 focus-visible:ring-defi-accent focus-visible:ring-offset-2 focus-visible:ring-offset-defi-bg
          ${compact
            ? 'p-2 flex items-center gap-2'
            : 'mb-3 hover:border-defi-border-hover hover:-translate-y-1 hover:shadow-glass-lg'}
          ${isDragging ? 'opacity-50 scale-105' : ''}
          ${isKeyboardSelected ? 'ring-2 ring-defi-accent ring-offset-2 ring-offset-defi-bg border-defi-accent' : ''}
        `}
      >
        {/* Left Gradient Strip */}
        {!compact && (
          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${getRiskGradient(strategy.riskLevel)}`}></div>
        )}

        <div className={`${compact ? '' : 'pl-4 p-4'}`}>
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3">
              {/* Icon Box */}
              {!compact && (
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-defi-accent/20 to-defi-purple/20 border border-defi-border flex items-center justify-center text-defi-accent-light">
                  {getIcon(strategy.type)}
                </div>
              )}
              <h4 className={`font-display font-semibold text-defi-text leading-none ${compact ? 'text-xs' : 'text-sm'}`}>
                {strategy.name}
              </h4>
            </div>

            {!compact && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRiskBadgeStyle(strategy.riskLevel)}`}>
                {strategy.riskLevel}
              </span>
            )}
          </div>

          {/* Description */}
          {!compact && (
            <p className="text-xs text-defi-text-secondary mb-3 leading-relaxed line-clamp-2 pl-12">
              {strategy.description}
            </p>
          )}

          {/* Footer Tags & APY */}
          {!compact && (
            <div className="flex items-center justify-between pt-3 border-t border-defi-border pl-12">
              <div className="flex gap-1.5">
                {strategy.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-defi-card border border-defi-border text-defi-text-secondary">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="bg-defi-success/20 text-defi-success-light border border-defi-success/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                {strategy.apy}% APY
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Portal Tooltip */}
      {isHovered && !compact && createPortal(
        <div
          className="fixed z-[9999] w-72 glass-dark rounded-2xl p-5 shadow-glass-lg pointer-events-none animate-scale-in"
          style={{
            top: Math.min(coords.top, window.innerHeight - 280),
            left: coords.left
          }}
        >
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-defi-border">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRiskBadgeStyle(strategy.riskLevel)}`}>
              {strategy.riskLevel} Risk
            </span>
            <span className="font-mono text-xs text-defi-success font-bold">
              Target: {strategy.apy}% APY
            </span>
          </div>

          <h4 className="font-display font-bold text-xl text-defi-text mb-2">
            {strategy.name}
          </h4>

          <p className="text-sm text-defi-text-secondary mb-4 leading-relaxed">
            {strategy.description}
          </p>

          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] text-defi-text-muted uppercase font-semibold tracking-wider">
              <Binary className="w-3 h-3" />
              Strategy Type
            </div>
            <div className="text-sm font-medium text-defi-text">{strategy.type}</div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {strategy.tags.map(t => (
              <span key={t} className="text-[10px] font-mono border border-defi-border px-2 py-1 rounded-lg text-defi-text-secondary bg-defi-card">
                #{t}
              </span>
            ))}
          </div>

          {/* Glow accent */}
          <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${getRiskGradient(strategy.riskLevel)} opacity-5 pointer-events-none`}></div>
        </div>,
        document.body
      )}
    </>
  );
};

export default StrategyDraggable;