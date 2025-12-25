// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/CoreVault.sol";
import "../src/adapters/MockYieldAdapter.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock Token", "MOCK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract CoreVaultTest is Test {
    CoreVault public vault;
    MockERC20 public token;
    MockYieldAdapter public adapter;
    
    address public owner = address(this);
    address public user = address(0x1);
    address public keeper = address(0x2);
    
    function setUp() public {
        // Deploy token
        token = new MockERC20();
        
        // Deploy vault implementation
        CoreVault implementation = new CoreVault();
        
        // Deploy proxy
        bytes memory initData = abi.encodeWithSelector(
            CoreVault.initialize.selector
        );
        
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        
        vault = CoreVault(payable(address(proxy)));
        
        // Deploy mock adapter
        adapter = new MockYieldAdapter(address(token));
        
        // Setup
        vault.setAdapterApproval(address(adapter), true);
        vault.setKeeper(keeper, true);
        
        // Give user tokens
        token.mint(user, 1000 * 10**18);
    }
    
    function testDeposit() public {
        vm.startPrank(user);
        
        uint256 amount = 100 * 10**18;
        token.approve(address(vault), amount);
        vault.deposit(address(token), amount);
        
        (address asset, uint256 totalDeposited, uint256 lastRebalance) = vault.userAllocations(user, address(token));
        assertEq(asset, address(token));
        assertEq(totalDeposited, amount);
        
        vm.stopPrank();
    }
    
    function testAddStrategyLayer() public {
        // First deposit
        vm.startPrank(user);
        uint256 amount = 100 * 10**18;
        token.approve(address(vault), amount);
        vault.deposit(address(token), amount);
        
        // Add strategy
        vault.addStrategyLayer(
            address(token),
            address(adapter),
            CoreVault.Condition.Always,
            5000 // 50%
        );
        
        CoreVault.StrategyLayer[] memory layers = vault.getUserLayers(user, address(token));
        assertEq(layers.length, 1);
        assertEq(layers[0].adapter, address(adapter));
        assertEq(layers[0].weight, 5000);
        
        vm.stopPrank();
    }
    
    function testRebalance() public {
        // Setup: deposit and add strategy
        vm.startPrank(user);
        uint256 amount = 100 * 10**18;
        token.approve(address(vault), amount);
        vault.deposit(address(token), amount);
        
        vault.addStrategyLayer(
            address(token),
            address(adapter),
            CoreVault.Condition.Always,
            10000 // 100%
        );
        vm.stopPrank();
        
        // Approve vault to spend tokens for adapter
        vm.prank(address(vault));
        token.approve(address(adapter), amount);
        
        // Execute rebalance as keeper
        vm.prank(keeper);
        vault.executeRebalance(user, address(token));
        
        // Verify funds moved to adapter
        uint256 adapterBalance = adapter.getBalance(address(vault));
        assertEq(adapterBalance, amount);
    }
    
    function testWithdraw() public {
        // Setup
        vm.startPrank(user);
        uint256 amount = 100 * 10**18;
        token.approve(address(vault), amount);
        vault.deposit(address(token), amount);
        
        // Withdraw
        uint256 withdrawAmount = 50 * 10**18;
        vault.withdraw(address(token), withdrawAmount);
        
        (, uint256 remaining, uint256 lastRebalance) = vault.userAllocations(user, address(token));
        assertEq(remaining, amount - withdrawAmount);
        
        vm.stopPrank();
    }
    
    function testPause() public {
        vault.pause();
        
        vm.startPrank(user);
        vm.expectRevert();
        vault.deposit(address(token), 100);
        vm.stopPrank();
    }
    
    function testOnlyKeeperCanRebalance() public {
        vm.startPrank(user);
        uint256 amount = 100 * 10**18;
        token.approve(address(vault), amount);
        vault.deposit(address(token), amount);
        vm.stopPrank();
        
        // Non-keeper tries to rebalance
        vm.prank(address(0x999));
        vm.expectRevert("Not keeper");
        vault.executeRebalance(user, address(token));
    }
    
    function testSentimentUpdate() public {
        vm.prank(keeper);
        vault.updateSentiment(75);
        
        assertEq(vault.currentSentiment(), 75);
    }
}
