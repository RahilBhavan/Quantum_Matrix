// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/adapters/AaveV3Adapter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**6);
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Aave Pool
contract MockAavePool {
    mapping(address => uint256) public supplied;
    MockERC20 public aToken;
    
    constructor() {
        aToken = new MockERC20();
    }
    
    function supply(address asset, uint256 amount, address onBehalfOf, uint16) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        supplied[asset] += amount;
        // Mint aTokens to the supplier
        aToken.mint(onBehalfOf, amount);
    }
    
    function withdraw(address asset, uint256 amount, address to) external returns (uint256) {
        require(supplied[asset] >= amount, "Insufficient liquidity");
        supplied[asset] -= amount;
        // Burn aTokens (simplified)
        IERC20(asset).transfer(to, amount);
        return amount;
    }
    
    function getReserveData(address) external pure returns (
        uint256, uint128, uint128, uint128, uint128, uint128, uint40, uint16,
        address, address, address, address, uint128, uint128, uint128
    ) {
        return (0, 0, 0, 0, 0, 0, 0, 0, address(0), address(0), address(0), address(0), 0, 0, 0);
    }
}

// Mock Aave Data Provider
contract MockAaveDataProvider {
    address public aTokenAddress;
    
    constructor(address _aToken) {
        aTokenAddress = _aToken;
    }
    
    function getReserveData(address) external pure returns (
        uint256, uint256, uint256, uint256, uint256,
        uint256 liquidityRate,
        uint256, uint256, uint256, uint256, uint256, uint40
    ) {
        // Return 12% APY in Ray format (27 decimals)
        // 12% = 0.12 * 1e27 = 1.2e26
        liquidityRate = 120000000000000000000000000; // 12% APY
        return (0, 0, 0, 0, 0, liquidityRate, 0, 0, 0, 0, 0, 0);
    }
    
    function getATokenAddress(address) external view returns (address) {
        return aTokenAddress;
    }
}

contract AaveV3AdapterTest is Test {
    AaveV3Adapter public adapter;
    MockERC20 public usdc;
    MockAavePool public pool;
    MockAaveDataProvider public dataProvider;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // Deploy mock contracts
        usdc = new MockERC20();
        pool = new MockAavePool();
        dataProvider = new MockAaveDataProvider(address(pool.aToken()));
        
        // Deploy adapter
        adapter = new AaveV3Adapter(
            address(pool),
            address(dataProvider),
            address(usdc)
        );
        
        // Setup test users
        usdc.mint(user1, 10000 * 10**6); // 10k USDC
        usdc.mint(user2, 5000 * 10**6);  // 5k USDC
        
        vm.prank(user1);
        usdc.approve(address(adapter), type(uint256).max);
        
        vm.prank(user2);
        usdc.approve(address(adapter), type(uint256).max);
    }
    
    function testDeposit() public {
        uint256 depositAmount = 1000 * 10**6; // 1000 USDC
        
        vm.prank(user1);
        uint256 shares = adapter.deposit(address(usdc), depositAmount);
        
        assertEq(shares, depositAmount, "Shares should equal deposit amount");
        assertEq(adapter.getBalance(user1), depositAmount, "User balance should match");
        assertEq(adapter.getTotalValueLocked(), depositAmount, "TVL should match");
    }
    
    function testWithdraw() public {
        uint256 depositAmount = 1000 * 10**6;
        
        // Deposit first
        vm.prank(user1);
        adapter.deposit(address(usdc), depositAmount);
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        // Withdraw
        vm.prank(user1);
        uint256 withdrawn = adapter.withdraw(depositAmount);
        
        assertEq(withdrawn, depositAmount, "Withdrawn amount should match");
        assertEq(adapter.getBalance(user1), 0, "User balance should be zero");
        assertEq(usdc.balanceOf(user1) - balanceBefore, depositAmount, "USDC balance should increase");
    }
    
    function testMultipleUsers() public {
        uint256 deposit1 = 1000 * 10**6;
        uint256 deposit2 = 500 * 10**6;
        
        // User 1 deposits
        vm.prank(user1);
        adapter.deposit(address(usdc), deposit1);
        
        // User 2 deposits
        vm.prank(user2);
        adapter.deposit(address(usdc), deposit2);
        
        assertEq(adapter.getBalance(user1), deposit1, "User1 balance incorrect");
        assertEq(adapter.getBalance(user2), deposit2, "User2 balance incorrect");
        assertEq(adapter.getTotalValueLocked(), deposit1 + deposit2, "TVL incorrect");
    }
    
    function testGetAPY() public {
        uint256 apy = adapter.getAPY();
        
        // Should return 1200 basis points (12%)
        assertEq(apy, 1200, "APY should be 12%");
    }
    
    function testGetRiskScore() public {
        uint8 risk = adapter.getRiskScore();
        assertEq(risk, 20, "Risk score should be 20 (low risk)");
    }
    
    function testAsset() public {
        assertEq(adapter.asset(), address(usdc), "Asset should be USDC");
    }
    
    function testRevertDepositWrongAsset() public {
        MockERC20 wrongToken = new MockERC20();
        
        vm.prank(user1);
        vm.expectRevert("Invalid asset");
        adapter.deposit(address(wrongToken), 1000);
    }
    
    function testRevertWithdrawInsufficientBalance() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient balance");
        adapter.withdraw(1000 * 10**6);
    }
    
    function testRevertDepositZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert("Amount must be greater than 0");
        adapter.deposit(address(usdc), 0);
    }
    
    function testRevertWithdrawZeroShares() public {
        vm.prank(user1);
        vm.expectRevert("Shares must be greater than 0");
        adapter.withdraw(0);
    }
}
