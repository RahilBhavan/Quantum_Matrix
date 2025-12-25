// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "../interfaces/IStrategyAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Simplified Uniswap V3 interfaces
interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }
    
    struct IncreaseLiquidityParams {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct DecreaseLiquidityParams {
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
    }
    
    struct CollectParams {
        uint256 tokenId;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }
    
    function mint(MintParams calldata params) external payable returns (
        uint256 tokenId,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    function increaseLiquidity(IncreaseLiquidityParams calldata params) external payable returns (
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );
    
    function decreaseLiquidity(DecreaseLiquidityParams calldata params) external payable returns (
        uint256 amount0,
        uint256 amount1
    );
    
    function collect(CollectParams calldata params) external payable returns (
        uint256 amount0,
        uint256 amount1
    );
    
    function burn(uint256 tokenId) external payable;
    
    function positions(uint256 tokenId) external view returns (
        uint96 nonce,
        address operator,
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint128 liquidity,
        uint256 feeGrowthInside0LastX128,
        uint256 feeGrowthInside1LastX128,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    );
}

interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

/**
 * @title UniswapV3Adapter
 * @notice Strategy adapter for Uniswap V3 concentrated liquidity provision
 * @dev Provides liquidity to Uniswap V3 pools to earn trading fees
 */
contract UniswapV3Adapter is IStrategyAdapter, IERC721Receiver {
    // Uniswap V3 contracts
    INonfungiblePositionManager public immutable positionManager;
    IUniswapV3Pool public immutable pool;
    
    // Strategy configuration
    address public immutable override asset; // Base asset (e.g., USDC)
    address public immutable pairedAsset;    // Paired asset (e.g., WETH)
    uint24 public immutable fee;             // Pool fee tier (500, 3000, or 10000)
    
    // Tick range for liquidity provision
    int24 public tickLower;
    int24 public tickUpper;
    
    // Position tracking
    mapping(address => uint256) public userPositionIds;
    mapping(address => uint256) public userLiquidity;
    uint256 public totalLiquidity;
    
    // Fee tracking
    uint256 public totalFeesCollected0;
    uint256 public totalFeesCollected1;
    
    // Events
    event LiquidityAdded(address indexed user, uint256 tokenId, uint128 liquidity);
    event LiquidityRemoved(address indexed user, uint256 tokenId, uint128 liquidity);
    event FeesCollected(address indexed user, uint256 amount0, uint256 amount1);
    
    /**
     * @notice Initialize the Uniswap V3 adapter
     * @param _positionManager Uniswap V3 NonfungiblePositionManager address
     * @param _pool Uniswap V3 Pool address
     * @param _asset Base asset address (e.g., USDC)
     * @param _pairedAsset Paired asset address (e.g., WETH)
     * @param _fee Pool fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
     * @param _tickLower Lower tick of the range
     * @param _tickUpper Upper tick of the range
     */
    constructor(
        address _positionManager,
        address _pool,
        address _asset,
        address _pairedAsset,
        uint24 _fee,
        int24 _tickLower,
        int24 _tickUpper
    ) {
        require(_positionManager != address(0), "Invalid position manager");
        require(_pool != address(0), "Invalid pool");
        require(_asset != address(0), "Invalid asset");
        require(_pairedAsset != address(0), "Invalid paired asset");
        require(_tickLower < _tickUpper, "Invalid tick range");
        
        positionManager = INonfungiblePositionManager(_positionManager);
        pool = IUniswapV3Pool(_pool);
        asset = _asset;
        pairedAsset = _pairedAsset;
        fee = _fee;
        tickLower = _tickLower;
        tickUpper = _tickUpper;
    }
    
    /**
     * @notice Provide liquidity to Uniswap V3
     * @param _asset Asset to deposit (must match adapter's asset)
     * @param amount Amount to deposit
     * @return shares Amount of liquidity shares
     */
    function deposit(address _asset, uint256 amount) external override returns (uint256 shares) {
        require(_asset == asset, "Invalid asset");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer asset from user
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        
        // For simplicity, use 50/50 split
        // In production, would calculate based on current pool price
        uint256 amount0 = amount / 2;
        uint256 amount1 = amount / 2;
        
        // Transfer paired asset from user (they need to provide both tokens)
        IERC20(pairedAsset).transferFrom(msg.sender, address(this), amount1);
        
        // Approve position manager for both tokens
        IERC20(asset).approve(address(positionManager), amount0);
        IERC20(pairedAsset).approve(address(positionManager), amount1);
        
        // Check if user already has a position
        uint256 existingTokenId = userPositionIds[msg.sender];
        
        if (existingTokenId == 0) {
            // Mint new position
            INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
                token0: asset < pairedAsset ? asset : pairedAsset,
                token1: asset < pairedAsset ? pairedAsset : asset,
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: asset < pairedAsset ? amount0 : amount1,
                amount1Desired: asset < pairedAsset ? amount1 : amount0,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            });
            
            (uint256 tokenId, uint128 liquidity,,) = positionManager.mint(params);
            
            userPositionIds[msg.sender] = tokenId;
            userLiquidity[msg.sender] = liquidity;
            totalLiquidity += liquidity;
            shares = liquidity;
            
            emit LiquidityAdded(msg.sender, tokenId, liquidity);
        } else {
            // Increase existing position
            INonfungiblePositionManager.IncreaseLiquidityParams memory params = 
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId: existingTokenId,
                    amount0Desired: asset < pairedAsset ? amount0 : amount1,
                    amount1Desired: asset < pairedAsset ? amount1 : amount0,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                });
            
            (uint128 liquidity,,) = positionManager.increaseLiquidity(params);
            
            userLiquidity[msg.sender] += liquidity;
            totalLiquidity += liquidity;
            shares = liquidity;
            
            emit LiquidityAdded(msg.sender, existingTokenId, liquidity);
        }
        
        return shares;
    }
    
    /**
     * @notice Remove liquidity from Uniswap V3
     * @param shares Amount of liquidity to remove
     * @return amount Amount of assets returned
     */
    function withdraw(uint256 shares) external override returns (uint256 amount) {
        require(shares > 0, "Shares must be greater than 0");
        require(userLiquidity[msg.sender] >= shares, "Insufficient liquidity");
        
        uint256 tokenId = userPositionIds[msg.sender];
        require(tokenId != 0, "No position found");
        
        // Collect fees first
        _collectFees(tokenId, msg.sender);
        
        // Decrease liquidity
        INonfungiblePositionManager.DecreaseLiquidityParams memory params = 
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: uint128(shares),
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            });
        
        (uint256 amount0, uint256 amount1) = positionManager.decreaseLiquidity(params);
        
        // Collect the withdrawn liquidity
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        
        // Update state
        userLiquidity[msg.sender] -= shares;
        totalLiquidity -= shares;
        
        // If position is fully withdrawn, burn the NFT
        if (userLiquidity[msg.sender] == 0) {
            positionManager.burn(tokenId);
            delete userPositionIds[msg.sender];
        }
        
        amount = amount0 + amount1; // Simplified
        
        emit LiquidityRemoved(msg.sender, tokenId, uint128(shares));
        
        return amount;
    }
    
    /**
     * @notice Collect trading fees from position
     * @param tokenId Position NFT ID
     * @param recipient Address to receive fees
     */
    function _collectFees(uint256 tokenId, address recipient) internal {
        (uint256 amount0, uint256 amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: recipient,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        
        totalFeesCollected0 += amount0;
        totalFeesCollected1 += amount1;
        
        emit FeesCollected(recipient, amount0, amount1);
    }
    
    /**
     * @notice Get user's liquidity balance
     * @param user User address
     * @return balance User's liquidity shares
     */
    function getBalance(address user) external view override returns (uint256 balance) {
        return userLiquidity[user];
    }
    
    /**
     * @notice Get estimated APY from trading fees
     * @return apy Annual percentage yield in basis points
     */
    function getAPY() external view override returns (uint256 apy) {
        // Simplified APY calculation
        // In production, would calculate from historical fee data
        // For now, return estimated 8% APY for 0.3% fee tier
        if (fee == 500) return 500;    // 5% for 0.05% fee tier
        if (fee == 3000) return 800;   // 8% for 0.3% fee tier
        if (fee == 10000) return 1200; // 12% for 1% fee tier
        return 800; // Default 8%
    }
    
    /**
     * @notice Get risk score of the strategy
     * @return risk Risk score (0-100)
     */
    function getRiskScore() external pure override returns (uint8 risk) {
        // Medium risk due to:
        // - Impermanent loss exposure
        // - Price volatility
        // - Concentrated liquidity risk
        return 50;
    }
    
    /**
     * @notice Get position details for a user
     * @param user User address
     * @return tokenId Position NFT ID
     * @return liquidity Current liquidity
     * @return tokensOwed0 Uncollected fees in token0
     * @return tokensOwed1 Uncollected fees in token1
     */
    function getPositionDetails(address user) external view returns (
        uint256 tokenId,
        uint128 liquidity,
        uint128 tokensOwed0,
        uint128 tokensOwed1
    ) {
        tokenId = userPositionIds[user];
        if (tokenId == 0) return (0, 0, 0, 0);
        
        (,,,,,,,liquidity,,,tokensOwed0, tokensOwed1) = positionManager.positions(tokenId);
        
        return (tokenId, liquidity, tokensOwed0, tokensOwed1);
    }
    
    /**
     * @notice Required for receiving ERC721 NFTs
     */
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
