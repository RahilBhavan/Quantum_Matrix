import React from 'react';
import { Ecosystem, Strategy } from '../types';
import StrategyDraggable from './StrategyDraggable';
import { AlertCircle, X } from 'lucide-react';

interface Props {
  ecosystem: Ecosystem;
  assignedStrategy: Strategy | null;
  onDrop: (e: React.DragEvent, ecosystemId: string) => void;
  onRemoveStrategy: (ecosystemId: string) => void;
  onDragStart: (e: React.DragEvent, strategyId: string) => void; // For re-dragging if needed
}

const EcosystemDropZone: React.FC<Props> = ({ ecosystem, assignedStrategy, onDrop, onRemoveStrategy, onDragStart }) => {
  const [isOver, setIsOver] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    onDrop(e, ecosystem.id);
  };

  return (
    <div 
      className={`
        relative rounded-xl border-2 transition-all duration-300 min-h-[160px] flex flex-col p-4
        ${isOver ? 'border-defi-accent bg-defi-accent/5 scale-[1.02]' : 'border-white/10 bg-defi-card'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Ecosystem Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/5 p-1.5 flex items-center justify-center">
            <img src={ecosystem.icon} alt={ecosystem.symbol} className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
        </div>
        <div>
          <h3 className="font-bold text-lg">{ecosystem.name}</h3>
          <p className="text-xs text-gray-400 font-mono">
            ${ecosystem.balance.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Drop Area / Assigned Strategy */}
      <div className="flex-1 flex flex-col justify-center">
        {assignedStrategy ? (
          <div className="relative group/strat">
             <StrategyDraggable 
                strategy={assignedStrategy} 
                onDragStart={onDragStart} 
                compact={true} 
             />
             <button 
                onClick={() => onRemoveStrategy(ecosystem.id)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/strat:opacity-100 transition-opacity shadow-lg hover:scale-110"
             >
               <X className="w-3 h-3" />
             </button>
          </div>
        ) : (
          <div className={`
            h-full w-full border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-4 transition-colors
            ${isOver ? 'border-defi-accent text-defi-accent' : 'border-white/10 text-gray-500'}
          `}>
             <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
             <span className="text-xs font-medium">Drop Strategy Here</span>
          </div>
        )}
      </div>
      
      {assignedStrategy && (
         <div className="mt-3 text-[10px] text-gray-500 flex justify-between">
            <span>Projected Yield</span>
            <span className="text-defi-success">
                +${((ecosystem.balance * (assignedStrategy.apy / 100))).toLocaleString('en-US', {maximumFractionDigits: 0})}/yr
            </span>
         </div>
      )}
    </div>
  );
};

export default EcosystemDropZone;
