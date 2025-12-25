import React, { useState, useCallback } from 'react';

interface UseKeyboardDndReturn {
    selectedStrategyId: string | null;
    selectStrategy: (strategyId: string) => void;
    clearSelection: () => void;
    handleKeyDown: (e: React.KeyboardEvent, strategyId: string) => void;
    handleAssetKeyDown: (e: React.KeyboardEvent, assetId: string, onDrop: (strategyId: string, assetId: string) => void) => void;
    isSelected: (strategyId: string) => boolean;
}

/**
 * Hook for keyboard-accessible drag-and-drop
 * 
 * Usage:
 * 1. Use handleKeyDown on strategy blocks
 * 2. Use handleAssetKeyDown on asset tiles
 * 3. Press Enter/Space to select a strategy
 * 4. Tab to asset tiles
 * 5. Press Enter to drop the strategy on the focused asset
 * 6. Press Escape to cancel selection
 */
export function useKeyboardDnd(): UseKeyboardDndReturn {
    const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);

    const selectStrategy = useCallback((strategyId: string) => {
        setSelectedStrategyId(prev => prev === strategyId ? null : strategyId);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedStrategyId(null);
    }, []);

    const isSelected = useCallback((strategyId: string) => {
        return selectedStrategyId === strategyId;
    }, [selectedStrategyId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent, strategyId: string) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectStrategy(strategyId);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            clearSelection();
        }
    }, [selectStrategy, clearSelection]);

    const handleAssetKeyDown = useCallback((
        e: React.KeyboardEvent,
        assetId: string,
        onDrop: (strategyId: string, assetId: string) => void
    ) => {
        if ((e.key === 'Enter' || e.key === ' ') && selectedStrategyId) {
            e.preventDefault();
            onDrop(selectedStrategyId, assetId);
            clearSelection();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            clearSelection();
        }
    }, [selectedStrategyId, clearSelection]);

    return {
        selectedStrategyId,
        selectStrategy,
        clearSelection,
        handleKeyDown,
        handleAssetKeyDown,
        isSelected,
    };
}

export default useKeyboardDnd;
