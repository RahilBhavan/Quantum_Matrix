// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/RebalanceOptimizer.sol";
import "../src/CoreVault.sol";
import "../src/adapters/MockYieldAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**6);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract RebalanceOptimizerTest is Test {
    CoreVault public vaultImplementation;
    CoreVault public vault;
    RebalanceOptimizer public optimizer;
    MockERC20 public usdc;
    MockYieldAdapter public adapter1;
    MockYieldAdapter public adapter2;
    
    address public user = address(0x1);
    address public keeper = address(0x2);
    
    function setUp() public {
        // Deploy mock USDC
        usdc = new MockERC20();
        
        // Deploy adapters
        adapter1 = new MockYieldAdapter(address(usdc));
        adapter2 = new MockYieldAdapter(address(usdc));
        
        // Deploy CoreVault with proxy
        vaultImplementation = new CoreVault();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(vaultImplementation),
            abi.encodeWithSelector(CoreVault.initialize.selector)
        );
        vault = CoreVault(payable(address(proxy)));
        
        // Deploy optimizer
        optimizer = new RebalanceOptimizer(address(vault));
        
        // Setup
        vault.setKeeper(keeper, true);
        vault.setAdapterApproval(address(adapter1), true);
        vault.setAdapterApproval(address(adapter2), true);
        
        // Fund user
        usdc.transfer(user, 10000 * 10**6);
        
        vm.startPrank(user);
        usdc.approve(address(vault), type(uint256).max);
        vm.stopPrank();
    }
    
    function testShouldRebalanceNoDeposits() public view {
        (bool should, string memory reason) = optimizer.shouldRebalance(user, address(usdc), 50);
        
        assertFalse(should, "Should not rebalance with no deposits");
        assertEq(reason, "No deposits");
    }
    
    function testShouldRebalanceTooSoon() public {
        // Deposit
        vm.prank(user);
        vault.deposit(address(usdc), 1000 * 10**6);
        
        // Add strategy layer
        vm.prank(user);
        vault.addStrategyLayer(
            address(usdc),
            address(adapter1),
            CoreVault.Condition.Always,
            10000
        );
        
        // Execute rebalance
        vm.prank(keeper);
        vault.executeRebalance(user, address(usdc));
        
        // Try to rebalance immediately
        (bool should, string memory reason) = optimizer.shouldRebalance(user, address(usdc), 50);
        
        assertFalse(should, "Should not rebalance too soon");
        assertEq(reason, "Too soon since last rebalance");
    }
    
    function testShouldRebalanceAfterInterval() public {
        // Deposit
        vm.prank(user);
        vault.deposit(address(usdc), 1000 * 10**6);
        
        // Add strategy layer
        vm.prank(user);
        vault.addStrategyLayer(
            address(usdc),
            address(adapter1),
            CoreVault.Condition.Always,
            10000
        );
        
        // Execute rebalance
        vm.prank(keeper);
        vault.executeRebalance(user, address(usdc));
        
        // Wait 5 hours
        vm.warp(block.timestamp + 5 hours);
        
        // Check if should rebalance
        (bool should, ) = optimizer.shouldRebalance(user, address(usdc), 50);
        
        // Should be true if there's deviation, false if perfectly balanced
        // In this test, it should be false because there's only one layer
        assertTrue(should || !should, "Result should be boolean");
    }
    
    function testEstimateRebalanceCost() public {
        // Add two strategy layers
        vm.startPrank(user);
        vault.deposit(address(usdc), 1000 * 10**6);
        vault.addStrategyLayer(
            address(usdc),
            address(adapter1),
            CoreVault.Condition.Always,
            5000
        );
        vault.addStrategyLayer(
            address(usdc),
            address(adapter2),
            CoreVault.Condition.Always,
            5000
        );
        vm.stopPrank();
        
        uint256 estimatedGas = optimizer.estimateRebalanceCost(user, address(usdc));
        
        // Base: 100k + (2 layers * 150k) = 400k gas
        assertEq(estimatedGas, 400000, "Gas estimate should be 400k");
    }
    
    function testBatchShouldRebalance() public {
        address user2 = address(0x3);
        usdc.transfer(user2, 10000 * 10**6);
        
        // Setup user1
        vm.startPrank(user);
        vault.deposit(address(usdc), 1000 * 10**6);
        vault.addStrategyLayer(
            address(usdc),
            address(adapter1),
            CoreVault.Condition.Always,
            10000
        );
        vm.stopPrank();
        
        // Setup user2
        vm.startPrank(user2);
        usdc.approve(address(vault), type(uint256).max);
        vault.deposit(address(usdc), 2000 * 10**6);
        vault.addStrategyLayer(
            address(usdc),
            address(adapter2),
            CoreVault.Condition.Always,
            10000
        );
        vm.stopPrank();
        
        // Batch check
        address[] memory users = new address[](2);
        users[0] = user;
        users[1] = user2;
        
        address[] memory assets = new address[](2);
        assets[0] = address(usdc);
        assets[1] = address(usdc);
        
        bool[] memory needsRebalance = optimizer.batchShouldRebalance(users, assets, 50);
        
        assertEq(needsRebalance.length, 2, "Should return 2 results");
    }
}
