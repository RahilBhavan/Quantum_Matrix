// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IStrategyAdapter.sol";

contract CoreVault is 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    ReentrancyGuard,
    PausableUpgradeable 
{
    using SafeERC20 for IERC20;

    // Enums
    enum Condition { Always, Bullish, Bearish, Neutral, Euphoric }
    
    // Structs
    struct StrategyLayer {
        address adapter;        // Strategy adapter contract
        Condition condition;    // Execution condition
        uint16 weight;         // Weight in basis points (10000 = 100%)
    }
    
    struct UserAllocation {
        address asset;
        StrategyLayer[] layers;
        uint256 totalDeposited;
        uint256 lastRebalance;
    }
    
    // State variables
    mapping(address => mapping(address => UserAllocation)) public userAllocations;
    mapping(address => bool) public approvedAdapters;
    mapping(address => bool) public keepers;
    
    uint8 public currentSentiment; // 0-100 sentiment score
    
    // Events
    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event StrategyAdded(address indexed user, address indexed asset, address adapter, uint16 weight);
    event StrategyRemoved(address indexed user, address indexed asset, address adapter);
    event Rebalance(address indexed user, address indexed asset, uint256 timestamp);
    event SentimentUpdated(uint8 newSentiment);
    event AdapterApproved(address indexed adapter, bool approved);
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    function initialize() public initializer {
        __Ownable_init(msg.sender);
        __Pausable_init();
        
        currentSentiment = 50; // Neutral
    }
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
    
    /// @notice Deposit ETH or ERC20 tokens
    function deposit(address asset, uint256 amount) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
    {
        require(amount > 0, "Amount must be > 0");
        
        if (asset == address(0)) {
            // ETH deposit
            require(msg.value == amount, "Incorrect ETH amount");
        } else {
            // ERC20 deposit
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        userAllocations[msg.sender][asset].asset = asset;
        userAllocations[msg.sender][asset].totalDeposited += amount;
        
        emit Deposit(msg.sender, asset, amount);
    }
    
    /// @notice Add a strategy layer to an asset allocation
    function addStrategyLayer(
        address asset,
        address adapter,
        Condition condition,
        uint16 weight
    ) external whenNotPaused {
        require(approvedAdapters[adapter], "Adapter not approved");
        require(weight <= 10000, "Weight exceeds 100%");
        
        UserAllocation storage allocation = userAllocations[msg.sender][asset];
        require(allocation.totalDeposited > 0, "No deposit for this asset");
        
        // Verify total weight doesn't exceed 100%
        uint256 totalWeight = weight;
        for (uint i = 0; i < allocation.layers.length; i++) {
            totalWeight += allocation.layers[i].weight;
        }
        require(totalWeight <= 10000, "Total weight exceeds 100%");
        
        allocation.layers.push(StrategyLayer({
            adapter: adapter,
            condition: condition,
            weight: weight
        }));
        
        emit StrategyAdded(msg.sender, asset, adapter, weight);
    }
    
    /// @notice Remove a strategy layer
    function removeStrategyLayer(address asset, uint256 index) external whenNotPaused {
        UserAllocation storage allocation = userAllocations[msg.sender][asset];
        require(index < allocation.layers.length, "Invalid index");
        
        address adapter = allocation.layers[index].adapter;
        
        // Remove by swapping with last element
        allocation.layers[index] = allocation.layers[allocation.layers.length - 1];
        allocation.layers.pop();
        
        emit StrategyRemoved(msg.sender, asset, adapter);
    }
    
    /// @notice Execute rebalance based on current sentiment
    function executeRebalance(address user, address asset) 
        external 
        onlyKeeper 
        whenNotPaused 
        nonReentrant 
    {
        UserAllocation storage allocation = userAllocations[user][asset];
        require(allocation.totalDeposited > 0, "No deposit");
        
        uint256 totalAmount = allocation.totalDeposited;
        
        for (uint i = 0; i < allocation.layers.length; i++) {
            StrategyLayer memory layer = allocation.layers[i];
            
            if (shouldExecute(layer.condition)) {
                uint256 layerAmount = (totalAmount * layer.weight) / 10000;
                
                // Approve and deposit into strategy
                if (allocation.asset != address(0)) {
                    IERC20(allocation.asset).forceApprove(layer.adapter, layerAmount);
                }
                
                IStrategyAdapter(layer.adapter).deposit(allocation.asset, layerAmount);
            }
        }
        
        allocation.lastRebalance = block.timestamp;
        emit Rebalance(user, asset, block.timestamp);
    }
    
    /// @notice Withdraw funds from vault
    function withdraw(address asset, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        UserAllocation storage allocation = userAllocations[msg.sender][asset];
        require(allocation.totalDeposited >= amount, "Insufficient balance");
        
        // Withdraw from strategies proportionally
        for (uint i = 0; i < allocation.layers.length; i++) {
            StrategyLayer memory layer = allocation.layers[i];
            uint256 layerBalance = IStrategyAdapter(layer.adapter).getBalance(msg.sender);
            
            if (layerBalance > 0) {
                uint256 withdrawAmount = (layerBalance * amount) / allocation.totalDeposited;
                IStrategyAdapter(layer.adapter).withdraw(withdrawAmount);
            }
        }
        
        allocation.totalDeposited -= amount;
        
        // Transfer to user
        if (asset == address(0)) {
            payable(msg.sender).transfer(amount);
        } else {
            IERC20(asset).safeTransfer(msg.sender, amount);
        }
        
        emit Withdraw(msg.sender, asset, amount);
    }
    
    /// @notice Check if strategy should execute based on condition
    function shouldExecute(Condition condition) internal view returns (bool) {
        if (condition == Condition.Always) return true;
        if (condition == Condition.Bullish) return currentSentiment >= 61;
        if (condition == Condition.Bearish) return currentSentiment <= 40;
        if (condition == Condition.Neutral) return currentSentiment > 40 && currentSentiment < 61;
        if (condition == Condition.Euphoric) return currentSentiment >= 81;
        return false;
    }
    
    /// @notice Update market sentiment (keeper only)
    function updateSentiment(uint8 newSentiment) external onlyKeeper {
        require(newSentiment <= 100, "Invalid sentiment");
        currentSentiment = newSentiment;
        emit SentimentUpdated(newSentiment);
    }
    
    /// @notice Approve/revoke strategy adapter
    function setAdapterApproval(address adapter, bool approved) external onlyOwner {
        approvedAdapters[adapter] = approved;
        emit AdapterApproved(adapter, approved);
    }
    
    /// @notice Set keeper status
    function setKeeper(address keeper, bool status) external onlyOwner {
        keepers[keeper] = status;
    }
    
    /// @notice Pause contract
    function pause() external onlyOwner {
        _pause();
    }
    
    /// @notice Unpause contract
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /// @notice Get user's strategy layers for an asset
    function getUserLayers(address user, address asset) 
        external 
        view 
        returns (StrategyLayer[] memory) 
    {
        return userAllocations[user][asset].layers;
    }
    
    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "Not keeper");
        _;
    }
    
    receive() external payable {}
}
