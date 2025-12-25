// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IStrategyAdapter {
    /// @notice Deposit assets into the strategy
    /// @param asset Address of the asset to deposit
    /// @param amount Amount of asset to deposit
    /// @return shares Amount of strategy shares received
    function deposit(address asset, uint256 amount) external returns (uint256 shares);
    
    /// @notice Withdraw assets from the strategy
    /// @param shares Amount of strategy shares to burn
    /// @return amount Amount of asset received
    function withdraw(uint256 shares) external returns (uint256 amount);
    
    /// @notice Get user's balance in the strategy
    /// @param user Address of the user
    /// @return balance User's balance in strategy shares
    function getBalance(address user) external view returns (uint256 balance);
    
    /// @notice Get current APY of the strategy
    /// @return apy Annual percentage yield (in basis points, e.g., 1250 = 12.5%)
    function getAPY() external view returns (uint256 apy);
    
    /// @notice Get risk score of the strategy
    /// @return risk Risk score (0-100, where 0 is lowest risk)
    function getRiskScore() external view returns (uint8 risk);
    
    /// @notice Get the underlying asset address
    /// @return asset Address of the underlying asset
    function asset() external view returns (address asset);
}
