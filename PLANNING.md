# DeFi Lego: AI-Driven Multi-Chain Portfolio Manager
## Project Planning Document

### 1. Product Core
**Concept:** A non-custodial, multi-chain portfolio manager allowing users to build automated investment strategies using a visual "drag-and-drop" interface. Strategies are dynamic, capable of rebalancing based on on-chain data and AI-driven market sentiment signals.

**Core Value Proposition:**
*   **Abstraction:** Simplifies complex cross-chain yield farming into visual blocks.
*   **Automation:** Replaces manual bridging and swapping with "Set-and-Forget" logic.
*   **Intelligence:** Integrates off-chain sentiment data to protect capital during downturns.

**Target User Personas:**
1.  **The Yield Maximizer:** Wants best APY across Solana and Ethereum but hates bridging.
2.  **The Narrative Trader:** Wants exposure to specific sectors (e.g., "AI Tokens," "L2 Scaling") and automated rotation.
3.  **The Passive Allocator:** Wants a 60/40 portfolio that auto-rebalances without monthly maintenance.

**MVP Features:**
*   **Multi-Chain Dashboard:** Unified view of assets on EVM (Arbitrum, Base, Eth Mainnet) and Solana.
*   **Strategy Builder (Lite):** Select from pre-built "Strategy Packs" (e.g., "Bear Protection," "Eth-Sol Weighted").
*   **Automated Rebalancing:** Trigger-based execution (e.g., "If ETH drops 10%, swap to USDC").
*   **Sentiment Oracle:** Basic integration of a "Fear & Greed" index trigger.

---

### 2. Architectural Overview
**Model:** Hub-and-Spoke (The "Brain" & "Limbs")

#### A. The Hub ("The Brain")
*   **Location:** Low-cost EVM Chain (Arbitrum or Base).
*   **Role:** Stores the "Global State" of a user's portfolio and the logic for their strategies.
*   **Components:**
    *   **Master Registry:** Maps User IDs to their cross-chain addresses (PDAs/SCWs).
    *   **Strategy Engine:** A smart contract that interprets JSON-based strategy logic (e.g., `IF sentiment < 20 THEN exit_to_stable`).
    *   **State Aggregator:** Receives standardized balance updates from all chains.

#### B. The Limbs ("The Spokes")
*   **Location:** Target Execution Chains (Ethereum L1, Solana, Avalanche).
*   **Role:** Custody funds and execute swaps/deposits.
*   **Components:**
    *   **EVM Spokes:** Smart Contract Wallets (ERC-4337 compatible) controlled *only* by the Hub via authenticated messages.
    *   **Solana Spoke:** A Native Program (Smart Contract) managing a PDA (Program Derived Address) for the user.
    *   **Execution Adapters:** Local interfaces for Uniswap (EVM) and Jupiter (Solana).

#### C. The Nerves ("Messaging Layer")
*   **Technology:** Chainlink CCIP or LayerZero V2.
*   **Role:** Secure, verifiable message passing between Hub and Spokes.
*   **Flow:** Hub decides action -> Sends Message -> Spoke Verifies Source -> Spoke Executes.

---

### 3. Statistical Model Specifications (AI/Sentiment)
**Goal:** Quantify "Market Sentiment" into a trusted on-chain integer (0-100) to trigger contract logic.

**Data Sources (Off-Chain):**
*   **Social Volume:** Twitter/X mentions, Reddit activity (via LunarCrush or Santiment API).
*   **Market Momentum:** RSI, Moving Average Convergence Divergence (MACD) from price feeds.
*   **On-Chain Flows:** Stablecoin inflows/outflows to exchanges (via Nansen/Dune).

**The "Sentiment Oracle" Pipeline:**
1.  **Ingestion:** Python based microservice fetches raw data every 1 hour.
2.  **Normalization:** Converting disparate metrics into a normalized `0.0 - 1.0` score.
    *   *Formula Draft:* `Score = (0.4 * Social_Sentiment) + (0.3 * Net_Flow) + (0.3 * Volatility_Inverse)`
3.  **Verification:** Data is signed by a trusted operator (or a decentralized oracle network later).
4.  **Publishing:** The score is pushed to the "Strategy Engine" on the Hub chain.

---

### 4. Key Smart Contract Junctions

| Contract Name | Chain | Functionality | Key Interfaces |
| :--- | :--- | :--- | :--- |
| `StrategyRegistry.sol` | Hub (Arb) | Stores user strategy configs (JSON/Structs). | `updateStrategy()`, `getStrategy()` |
| `Orchestrator.sol` | Hub (Arb) | Evaluates conditions. Triggers CCIP messages. | `checkCondition(userID)`, `sendRebalanceCmd()` |
| `SpokeVault.sol` | EVM Spokes | Holds funds. Executes swaps. | `receiveMessage()`, `executeSwap(tokenIn, tokenOut)` |
| `SolanaVault.rs` | Solana | Holds SPL tokens. Executes Jupiter swaps. | `process_instruction()`, `cross_program_invocation()` |
| `OracleAdapter.sol` | Hub (Arb) | Receives signed sentiment data. | `updateSentiment(score, signature)` |

---

### 5. Integration Path

**Phase 1: The "Manual" Loop (Proof of Concept)**
*   **Bridge:** Use a testnet bridge (e.g., Circle CCTP testnet or LayerZero testnet).
*   **DEX:** Mock DEX interfaces on testnets (Uniswap Goerli, etc.).
*   **Trigger:** Manual admin call to `Orchestrator.sol` to simulate a "Rebalance" event.

**Phase 2: Live Connections**
*   **Messaging:** Integrate Chainlink CCIP Router contracts.
*   **Swapping:** Integrate 1inch Aggregator API for EVM execution optimization.
*   **Solana:** Integrate Jupiter V6 Swap API for best execution on Solana.

---

### 6. Risk Assessment Path

**Technical Risks**
*   **Bridge Vulnerability:** Dependency on CCIP/LayerZero. *Mitigation: Rate limits on message volume; "Emergency Pause" button.*
*   **Oracle Manipulation:** Fake sentiment scores draining funds. *Mitigation: Time-Weighted Average Price (TWAP) logic for sentiment; Cap max portfolio turnover per day.*
*   **Execution Failures:** Slippage or stuck transactions. *Mitigation: High slippage tolerance settings with "Revert" safety; Keeper bots to retry stuck txs.*

**Financial Risks**
*   **Gas Costs:** Cross-chain messaging is expensive ($1-$5). *Mitigation: Only rebalance if `Projected Profit > Gas Cost * 2`.*
*   **Impermanent Loss:** Strategy moving funds at the wrong time. *Mitigation: Backtesting engine (simulated) before live deployment.*
