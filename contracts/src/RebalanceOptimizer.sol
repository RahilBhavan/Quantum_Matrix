// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./CoreVault.sol";

/**
 * @title RebalanceOptimizer
 * @notice Gas-optimized rebalancing logic for multi-adapter strategies
 * @dev Implements threshold-based rebalancing to minimize gas costs
 */
contract RebalanceOptimizer {
    CoreVault public immutable vault;
    
    // Constants
    uint256 public constant MIN_REBALANCE_THRESHOLD = 500; // 5% deviation in basis points
    uint256 public constant MIN_REBALANCE_INTERVAL = 4 hours;
    uint256 public constant MAX_GAS_PRICE = 100 gwei;
    
    // Events
    event RebalanceSkipped(address indexed user, address indexed asset, string reason);
    event DeviationCalculated(address indexed user, address indexed asset, uint256 deviation);
    
    constructor(address _vault) {
        require(_vault != address(0), "Invalid vault address");
        vault = CoreVault(payable(_vault));
    }
    
    /**
     * @notice Check if rebalancing should occur
     * @param user User address
     * @param asset Asset address
     * @param currentSentiment Current market sentiment (0-100)
     * @return shouldRebalance Whether rebalancing should occur
     * @return reason Reason for decision
     */
    function shouldRebalance(
        address user,
        address asset,
        uint8 currentSentiment
    ) external view returns (bool shouldRebalance, string memory reason) {
        // Get user allocation
        (
            address allocAsset,
            ,
            uint256 totalDeposited,
            uint256 lastRebalance
        ) = vault.userAllocations(user, asset);
        
        // Check if user has deposits
        if (totalDeposited == 0) {
            return (false, "No deposits");
        }
        
        // Check time threshold
        if (block.timestamp - lastRebalance < MIN_REBALANCE_INTERVAL) {
            return (false, "Too soon since last rebalance");
        }
        
        // Check gas price
        if (tx.gasprice > MAX_GAS_PRICE) {
            return (false, "Gas price too high");
        }
        
        // Calculate deviation from target allocation
        uint256 deviation = _calculateDeviation(user, asset, currentSentiment);
        
        // Check if deviation exceeds threshold
        if (deviation < MIN_REBALANCE_THRESHOLD) {
            return (false, "Deviation below threshold");
        }
        
        return (true, "Rebalance recommended");
    }
    
    /**
     * @notice Calculate deviation from target allocation
     * @param user User address
     * @param asset Asset address
     * @param sentiment Current market sentiment
     * @return deviation Deviation in basis points
     */
    function _calculateDeviation(
        address user,
        address asset,
        uint8 sentiment
    ) internal view returns (uint256 deviation) {
        CoreVault.StrategyLayer[] memory layers = vault.getUserLayers(user, asset);
        
        if (layers.length == 0) {
            return 0;
        }
        
        (, , uint256 totalDeposited, ) = vault.userAllocations(user, asset);
        
        uint256 totalDeviation = 0;
        uint256 activeWeight = 0;
        
        // Calculate active weight based on current sentiment
        for (uint i = 0; i < layers.length; i++) {
            if (_shouldExecute(layers[i].condition, sentiment)) {
                activeWeight += layers[i].weight;
            }
        }
        
        // If no active strategies, return max deviation
        if (activeWeight == 0) {
            return 10000; // 100% deviation
        }
        
        // Calculate deviation for each layer
        for (uint i = 0; i < layers.length; i++) {
            if (_shouldExecute(layers[i].condition, sentiment)) {
                // Target allocation for this layer
                uint256 targetAmount = (totalDeposited * layers[i].weight) / activeWeight;
                
                // Current allocation in this layer
                uint256 currentAmount = IStrategyAdapter(layers[i].adapter).getBalance(user);
                
                // Calculate absolute deviation
                uint256 layerDeviation = currentAmount > targetAmount
                    ? currentAmount - targetAmount
                    : targetAmount - currentAmount;
                
                totalDeviation += layerDeviation;
            }
        }
        
        // Return deviation as basis points
        return (totalDeviation * 10000) / totalDeposited;
    }
    
    /**
     * @notice Check if strategy should execute based on condition
     * @param condition Strategy condition
     * @param sentiment Current market sentiment
     * @return Whether strategy should execute
     */
    function _shouldExecute(
        CoreVault.Condition condition,
        uint8 sentiment
    ) internal pure returns (bool) {
        if (condition == CoreVault.Condition.Always) return true;
        if (condition == CoreVault.Condition.Bullish) return sentiment >= 61;
        if (condition == CoreVault.Condition.Bearish) return sentiment <= 40;
        if (condition == CoreVault.Condition.Neutral) return sentiment > 40 && sentiment < 61;
        if (condition == CoreVault.Condition.Euphoric) return sentiment >= 81;
        return false;
    }
    
    /**
     * @notice Get rebalancing cost estimate
     * @param user User address
     * @param asset Asset address
     * @return estimatedGas Estimated gas cost
     */
    function estimateRebalanceCost(
        address user,
        address asset
    ) external view returns (uint256 estimatedGas) {
        CoreVault.StrategyLayer[] memory layers = vault.getUserLayers(user, asset);
        
        // Base cost: 100k gas
        uint256 baseCost = 100000;
        
        // Per-layer cost: 150k gas (withdraw + deposit)
        uint256 perLayerCost = 150000;
        
        return baseCost + (layers.length * perLayerCost);
    }
    
    /**
     * @notice Batch check multiple users for rebalancing
     * @param users Array of user addresses
     * @param assets Array of asset addresses
     * @param sentiment Current market sentiment
     * @return needsRebalance Array of booleans indicating rebalance need
     */
    function batchShouldRebalance(
        address[] calldata users,
        address[] calldata assets,
        uint8 sentiment
    ) external view returns (bool[] memory needsRebalance) {
        require(users.length == assets.length, "Length mismatch");
        
        needsRebalance = new bool[](users.length);
        
        for (uint i = 0; i < users.length; i++) {
            (bool should, ) = this.shouldRebalance(users[i], assets[i], sentiment);
            needsRebalance[i] = should;
        }
        
        return needsRebalance;
    }
}
