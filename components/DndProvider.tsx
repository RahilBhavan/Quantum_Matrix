import React, { useState, useCallback } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    KeyboardSensor,
    closestCenter,
    DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Strategy } from '../types';
import StrategyDraggable from './StrategyDraggable';

interface DndProviderProps {
    children: React.ReactNode;
    strategies: Strategy[];
    onStrategyDrop: (strategyId: string, targetAssetId: string) => void;
}

export const DndProvider: React.FC<DndProviderProps> = ({
    children,
    strategies,
    onStrategyDrop,
}) => {
    const [activeId, setActiveId] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Separate sensors for mouse and touch with appropriate constraints
    const mouseSensor = useSensor(MouseSensor, {
        activationConstraint: {
            distance: 10, // 10px movement before drag starts
        },
    });

    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: {
            delay: 200, // 200ms hold before drag starts (prevents scroll conflict)
            tolerance: 10, // Allow 10px movement during delay
        },
    });

    const keyboardSensor = useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    });

    const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

    const handleDragStart = useCallback((event: DragStartEvent) => {
        const { active } = event;
        setActiveId(active.id as string);
        setIsDragging(true);
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        // Can be used for real-time feedback while dragging
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);
        setIsDragging(false);

        if (!over) return;

        const activeType = active.data.current?.type;
        const overId = over.id as string;
        const overType = over.data.current?.type;

        // Strategy dropped on asset tile
        if (activeType === 'strategy' && (overType === 'asset' || overId.startsWith('asset-'))) {
            const strategyId = active.id as string;
            const assetId = over.data.current?.assetId || overId;
            onStrategyDrop(strategyId, assetId);
        }
    }, [onStrategyDrop]);

    const activeStrategy = activeId
        ? strategies.find(s => s.id === activeId)
        : null;

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            {/* Pass dragging state down via context or cloning */}
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                        isGlobalDragging: isDragging,
                    });
                }
                return child;
            })}

            {/* Drag Overlay - follows cursor */}
            <DragOverlay dropAnimation={null}>
                {activeStrategy ? (
                    <div className="opacity-80 transform scale-105 shadow-brutal-hover">
                        <StrategyDraggable
                            strategy={activeStrategy}
                            onDragStart={() => { }}
                            compact={false}
                        />
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};

export default DndProvider;
