// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/adapters/UniswapV3Adapter.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 tokens
contract MockToken is ERC20 {
    uint8 private _decimals;
    
    constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
        _decimals = decimals_;
        _mint(msg.sender, 1000000 * 10**decimals_);
    }
    
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

// Mock Uniswap V3 Position Manager
contract MockPositionManager {
    uint256 private nextTokenId = 1;
    mapping(uint256 => Position) public positions;
    
    struct Position {
        address owner;
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }
    
    function mint(INonfungiblePositionManager.MintParams calldata params) external returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    ) {
        tokenId = nextTokenId++;
        liquidity = uint128(params.amount0Desired + params.amount1Desired); // Simplified
        
        // Transfer tokens
        IERC20(params.token0).transferFrom(msg.sender, address(this), params.amount0Desired);
        IERC20(params.token1).transferFrom(msg.sender, address(this), params.amount1Desired);
        
        positions[tokenId] = Position({
            owner: params.recipient,
            token0: params.token0,
            token1: params.token1,
            fee: params.fee,
            tickLower: params.tickLower,
            tickUpper: params.tickUpper,
            liquidity: liquidity,
            tokensOwed0: 0,
            tokensOwed1: 0
        });
        
        return (tokenId, liquidity, params.amount0Desired, params.amount1Desired);
    }
    
    function increaseLiquidity(INonfungiblePositionManager.IncreaseLiquidityParams calldata params) 
        external returns (uint128 liquidity, uint256 amount0, uint256 amount1) 
    {
        Position storage pos = positions[params.tokenId];
        liquidity = uint128(params.amount0Desired + params.amount1Desired);
        
        IERC20(pos.token0).transferFrom(msg.sender, address(this), params.amount0Desired);
        IERC20(pos.token1).transferFrom(msg.sender, address(this), params.amount1Desired);
        
        pos.liquidity += liquidity;
        
        return (liquidity, params.amount0Desired, params.amount1Desired);
    }
    
    function decreaseLiquidity(INonfungiblePositionManager.DecreaseLiquidityParams calldata params)
        external returns (uint256 amount0, uint256 amount1)
    {
        Position storage pos = positions[params.tokenId];
        require(pos.liquidity >= params.liquidity, "Insufficient liquidity");
        
        pos.liquidity -= params.liquidity;
        amount0 = params.liquidity / 2;
        amount1 = params.liquidity / 2;
        
        pos.tokensOwed0 += uint128(amount0);
        pos.tokensOwed1 += uint128(amount1);
        
        return (amount0, amount1);
    }
    
    function collect(INonfungiblePositionManager.CollectParams calldata params)
        external returns (uint256 amount0, uint256 amount1)
    {
        Position storage pos = positions[params.tokenId];
        
        amount0 = pos.tokensOwed0;
        amount1 = pos.tokensOwed1;
        
        if (amount0 > 0) {
            IERC20(pos.token0).transfer(params.recipient, amount0);
            pos.tokensOwed0 = 0;
        }
        
        if (amount1 > 0) {
            IERC20(pos.token1).transfer(params.recipient, amount1);
            pos.tokensOwed1 = 0;
        }
        
        return (amount0, amount1);
    }
    
    function burn(uint256 tokenId) external {
        delete positions[tokenId];
    }
}

// Mock Uniswap V3 Pool
contract MockUniswapV3Pool {
    function slot0() external pure returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    ) {
        return (0, 0, 0, 0, 0, 0, true);
    }
}

contract UniswapV3AdapterTest is Test {
    UniswapV3Adapter public adapter;
    MockToken public usdc;
    MockToken public weth;
    MockPositionManager public positionManager;
    MockUniswapV3Pool public pool;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    
    function setUp() public {
        // Deploy mock tokens
        usdc = new MockToken("USD Coin", "USDC", 6);
        weth = new MockToken("Wrapped Ether", "WETH", 18);
        
        // Deploy mock contracts
        positionManager = new MockPositionManager();
        pool = new MockUniswapV3Pool();
        
        // Deploy adapter
        adapter = new UniswapV3Adapter(
            address(positionManager),
            address(pool),
            address(usdc),
            address(weth),
            3000, // 0.3% fee tier
            -887220, // Full range tick lower
            887220   // Full range tick upper
        );
        
        // Setup test users
        usdc.mint(user1, 10000 * 10**6);
        weth.mint(user1, 10 * 10**18);
        usdc.mint(user2, 5000 * 10**6);
        weth.mint(user2, 5 * 10**18);
        
        vm.startPrank(user1);
        usdc.approve(address(adapter), type(uint256).max);
        weth.approve(address(adapter), type(uint256).max);
        vm.stopPrank();
        
        vm.startPrank(user2);
        usdc.approve(address(adapter), type(uint256).max);
        weth.approve(address(adapter), type(uint256).max);
        vm.stopPrank();
    }
    
    function testDeposit() public {
        uint256 depositAmount = 1000 * 10**6;
        
        vm.prank(user1);
        uint256 shares = adapter.deposit(address(usdc), depositAmount);
        
        assertGt(shares, 0, "Should receive shares");
        assertEq(adapter.getBalance(user1), shares, "Balance should match shares");
        
        (uint256 tokenId,,,) = adapter.getPositionDetails(user1);
        assertGt(tokenId, 0, "Should have position NFT");
    }
    
    function testWithdraw() public {
        uint256 depositAmount = 1000 * 10**6;
        
        // Deposit first
        vm.prank(user1);
        uint256 shares = adapter.deposit(address(usdc), depositAmount);
        
        uint256 balanceBefore = usdc.balanceOf(user1);
        
        // Withdraw
        vm.prank(user1);
        uint256 withdrawn = adapter.withdraw(shares);
        
        assertGt(withdrawn, 0, "Should withdraw amount");
        assertEq(adapter.getBalance(user1), 0, "Balance should be zero");
        
        (uint256 tokenId,,,) = adapter.getPositionDetails(user1);
        assertEq(tokenId, 0, "Position should be burned");
    }
    
    function testMultipleDeposits() public {
        uint256 deposit1 = 1000 * 10**6;
        uint256 deposit2 = 500 * 10**6;
        
        // First deposit
        vm.prank(user1);
        uint256 shares1 = adapter.deposit(address(usdc), deposit1);
        
        (uint256 tokenId1,,,) = adapter.getPositionDetails(user1);
        
        // Second deposit (should increase liquidity)
        vm.prank(user1);
        uint256 shares2 = adapter.deposit(address(usdc), deposit2);
        
        (uint256 tokenId2, uint128 liquidity,,) = adapter.getPositionDetails(user1);
        
        assertEq(tokenId1, tokenId2, "Should use same position");
        assertEq(adapter.getBalance(user1), shares1 + shares2, "Total shares should accumulate");
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
        
        (uint256 tokenId1,,,) = adapter.getPositionDetails(user1);
        (uint256 tokenId2,,,) = adapter.getPositionDetails(user2);
        
        assertGt(tokenId1, 0, "User1 should have position");
        assertGt(tokenId2, 0, "User2 should have position");
        assertNotEq(tokenId1, tokenId2, "Users should have different positions");
    }
    
    function testGetAPY() public view {
        uint256 apy = adapter.getAPY();
        assertEq(apy, 800, "APY should be 8% for 0.3% fee tier");
    }
    
    function testGetRiskScore() public view {
        uint8 risk = adapter.getRiskScore();
        assertEq(risk, 50, "Risk score should be 50 (medium risk)");
    }
    
    function testAsset() public view {
        assertEq(adapter.asset(), address(usdc), "Asset should be USDC");
    }
    
    function testRevertDepositWrongAsset() public {
        MockToken wrongToken = new MockToken("Wrong", "WRONG", 18);
        
        vm.prank(user1);
        vm.expectRevert("Invalid asset");
        adapter.deposit(address(wrongToken), 1000);
    }
    
    function testRevertWithdrawInsufficientLiquidity() public {
        vm.prank(user1);
        vm.expectRevert("Insufficient liquidity");
        adapter.withdraw(1000);
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
