// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "../interfaces/IStrategyAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockYieldAdapter is IStrategyAdapter {
    address public immutable override asset;
    mapping(address => uint256) public balances;
    
    uint256 public constant APY = 1200; // 12% APY
    uint8 public constant RISK_SCORE = 30; // Low-medium risk
    
    constructor(address _asset) {
        asset = _asset;
    }
    
    function deposit(address, uint256 amount) external override returns (uint256) {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
        return amount; // 1:1 shares
    }
    
    function withdraw(uint256 shares) external override returns (uint256) {
        require(balances[msg.sender] >= shares, "Insufficient balance");
        balances[msg.sender] -= shares;
        IERC20(asset).transfer(msg.sender, shares);
        return shares;
    }
    
    function getBalance(address user) external view override returns (uint256) {
        return balances[user];
    }
    
    function getAPY() external pure override returns (uint256) {
        return APY;
    }
    
    function getRiskScore() external pure override returns (uint8) {
        return RISK_SCORE;
    }
}
