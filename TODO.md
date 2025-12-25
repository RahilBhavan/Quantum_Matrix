# Quantum Matrix - Project Roadmap

## Phase 1: Core Foundation & Stability
- [ ] **Refactor `App.tsx`**: Extract state management (allocations, sentiment) into a custom hook `usePortfolio`.
- [ ] **Refactor `AssetTile.tsx`**: Extract "Active Stack" and "Empty State" into sub-components for better readability.
- [ ] **Unit Tests**: Add tests for critical logic:
    - [ ] `isAiAdaptiveActive` in `AssetTile.tsx` (move to utility file first).
    - [ ] `addLayer`, `updateWeight` logic (currently inside `App.tsx`).
- [ ] **Type Safety**: Ensure all API responses (even mocks) are strictly typed with Zod (optional but recommended).

## Phase 2: Features & Realism
- [ ] **Persistence**: Implement `localStorage` or `IndexedDB` to save:
    - [ ] User's portfolio allocations.
    - [ ] Selected ecosystem.
    - [ ] Last sentiment analysis result.
- [ ] **Enhanced AI**:
    - [ ] Feed "Historical Sentiment" to the `getPortfolioRecommendation` prompt for better context.
    - [ ] Allow users to input their own "Alpha/News" text for analysis.
- [ ] **Wallet Integration**:
    - [ ] Add a basic "Connect Wallet" mock that stores a fake address in context (preparation for Wagmi/RainbowKit).

## Phase 3: UI/UX Polish
- [ ] **Responsive Design**: Fix fixed heights (e.g., `h-[480px]`) in `AssetTile` to be more responsive.
- [ ] **Animations**:
    - [ ] Add Framer Motion for smoother drag-and-drop and list reordering.
    - [ ] Animate the "AI Auto-Pilot" processing state more vividly.
- [ ] **Theming**: Refine the "Brutalist" aesthetic with consistent spacing and typography tokens.
