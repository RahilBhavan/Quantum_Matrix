# The "Brain" (Hub) Architecture - Detailed Structure

## Overview
**Location:** Arbitrum (or Base)
**Role:** The decision-making center. It holds no user funds directly but controls the "Spokes" (Vaults) on other chains. It aggregates data, evaluates user-defined strategies, and dispatches execution commands.

## Directory Structure
We will use a standard Foundry (Solidity) project structure.

```text
brain/
├── src/
│   ├── core/
│   │   ├── MasterRegistry.sol       # Maps User IDs to their Spoke addresses on other chains
│   │   ├── Orchestrator.sol         # Main entry point: Coordinates Data -> Logic -> Action
│   │   └── AccessControl.sol        # RBAC for Keepers and Admins
│   ├── strategy/
│   │   ├── StrategyEngine.sol       # The "CPU": Evaluates conditions (Logic -> Boolean)
│   │   ├── StrategyStorage.sol      # Database: Stores User's "Lego" configurations
│   │   └── libraries/
│   │       └── LogicParser.sol      # Helper: Decodes the strategy bytestrings/JSON
│   ├── data/
│   │   ├── StateAggregator.sol      # "Memory": Last known balances of all User Spokes
│   │   └── SentimentOracle.sol      # "Senses": Trusted feed for Market Sentiment (0-100)
│   ├── messaging/
│   │   ├── MessageSender.sol        # "Nerves": Adapter for CCIP/LayerZero to send commands
│   │   └── interfaces/
│   │       └── IMessagingRouter.sol
│   └── interfaces/
│       ├── IOrchestrator.sol
│       └── IStrategyEngine.sol
├── test/                            # Foundry Tests
│   ├── unit/
│   └── integration/
├── script/                          # Deployment scripts
└── foundry.toml                     # Config
```

## Key Contract Specifications

### 1. `core/MasterRegistry.sol`
*   **Purpose:** Identity management. Links a single "User ID" (uint256) to their diverse wallet addresses across chains.
*   **Key Mapping:** `mapping(uint256 => mapping(uint256 => address)) public userSpokes;`
    *   Format: `userSpokes[userId][chainId] = spokeAddress`
*   **Functions:**
    *   `registerSpoke(uint256 chainId, address spokeAddress)`: Links a new chain vault to the user.

### 2. `strategy/StrategyStorage.sol`
*   **Purpose:** Stores the "Lego" blocks.
*   **Data Structure:**
    ```solidity
    struct Strategy {
        uint8 triggerType;      // 0 = Price, 1 = Sentiment, 2 = Time
        bytes triggerParams;    // Encoded params (e.g., "ETH Price < 2000")
        uint8 actionType;       // 0 = Swap, 1 = Bridge
        bytes actionParams;     // Encoded params (e.g., "Swap 50% ETH to USDC")
        bool isActive;
    }
    mapping(uint256 => Strategy[]) public userStrategies;
    ```

### 3. `strategy/StrategyEngine.sol`
*   **Purpose:** Pure logic execution.
*   **Function:** `evaluate(uint256 userId, uint256 strategyId) returns (bool shouldExecute, bytes memory payload)`
*   **Logic:**
    1.  Fetches `Strategy` from storage.
    2.  Fetches current data (Price/Sentiment) from `StateAggregator`.
    3.  Runs the comparison (e.g., `Current_Sentiment (30) < Trigger_Sentiment (40)`).
    4.  Returns `true` if condition is met.

### 4. `core/Orchestrator.sol`
*   **Purpose:** The event loop. It connects the components.
*   **Workflow (triggered by Keeper):**
    1.  `runStrategy(userId, strategyId)` called by Keeper.
    2.  Calls `StrategyEngine.evaluate(...)`.
    3.  If `true`:
        *   Constructs the cross-chain payload.
        *   Calls `MessageSender.sendMessage(targetChain, targetSpoke, payload)`.
        *   Emits `ActionDispatched`.

### 5. `data/StateAggregator.sol`
*   **Purpose:** Efficiently stores the last known state of user funds to avoid expensive cross-chain read calls during execution.
*   **Update Mechanism:** Updated periodically by Keepers or immediately after a successful action.

## Integration Points

*   **Inbound:** `SentimentOracle` receives updates from the off-chain Python AI service.
*   **Outbound:** `MessageSender` calls the Chainlink CCIP Router to push instructions to Ethereum/Solana.

## Development Stack
*   **Language:** Solidity ^0.8.20
*   **Framework:** Foundry (for fast testing and fuzzing)
*   **Libraries:** OpenZeppelin (Ownable, Upgradeable), Chainlink CCIP interfaces.
