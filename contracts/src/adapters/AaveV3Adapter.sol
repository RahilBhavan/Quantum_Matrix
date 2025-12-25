// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "../interfaces/IStrategyAdapter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Aave V3 interfaces (simplified for now, will use proper imports after installing dependencies)
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
    function getReserveData(address asset) external view returns (ReserveData memory);
}

interface IPoolDataProvider {
    function getReserveData(address asset) external view returns (
        uint256 unbacked,
        uint256 accruedToTreasuryScaled,
        uint256 totalAToken,
        uint256 totalStableDebt,
        uint256 totalVariableDebt,
        uint256 liquidityRate,
        uint256 variableBorrowRate,
        uint256 stableBorrowRate,
        uint256 averageStableBorrowRate,
        uint256 liquidityIndex,
        uint256 variableBorrowIndex,
        uint40 lastUpdateTimestamp
    );
    
    function getATokenAddress(address asset) external view returns (address);
}

struct ReserveData {
    uint256 configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    uint40 lastUpdateTimestamp;
    uint16 id;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
}

/**
 * @title AaveV3Adapter
 * @notice Strategy adapter for Aave V3 lending protocol
 * @dev Enables depositing assets to Aave V3 to earn lending yield
 * @dev SECURITY: Includes Emergency Exit and Pausable functionality
 */
contract AaveV3Adapter is IStrategyAdapter, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // Aave V3 contracts
    IPool public immutable pool;
    IPoolDataProvider public immutable dataProvider;
    
    // Strategy configuration
    address public immutable override asset;
    address public immutable aToken;
    
    // User share tracking 
    // NOTE: Currently using 1:1 mapping (1 share = 1 asset unit). 
    // In production V2, this should utilize getReserveNormalizedIncome() to track real yield accrual.
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    // Events
    event Deposited(address indexed user, uint256 amount, uint256 shares);
    event Withdrawn(address indexed user, uint256 shares, uint256 amount);
    event EmergencyExit(uint256 amount);
    event FundsRescued(address indexed token, address indexed recipient, uint256 amount);
    
    /**
     * @notice Initialize the Aave V3 adapter
     * @param _pool Aave V3 Pool contract address
     * @param _dataProvider Aave V3 PoolDataProvider contract address
     * @param _asset Underlying asset address (e.g., USDC)
     */
    constructor(
        address _pool,
        address _dataProvider,
        address _asset
    ) Ownable(msg.sender) {
        require(_pool != address(0), "Invalid pool address");
        require(_dataProvider != address(0), "Invalid data provider address");
        require(_asset != address(0), "Invalid asset address");
        
        pool = IPool(_pool);
        dataProvider = IPoolDataProvider(_dataProvider);
        asset = _asset;
        
        // Get aToken address from data provider
        aToken = dataProvider.getATokenAddress(_asset);
        require(aToken != address(0), "aToken not found");
    }
    
    /**
     * @notice Deposit assets into Aave V3
     * @param _asset Asset to deposit (must match adapter's asset)
     * @param amount Amount to deposit
     * @return shares Amount of shares minted
     */
    function deposit(address _asset, uint256 amount) external override whenNotPaused returns (uint256 shares) {
        require(_asset == asset, "Invalid asset");
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer asset from user to this contract
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        // Approve Aave pool to spend the asset
        IERC20(asset).approve(address(pool), amount);
        
        // Supply to Aave (receives aTokens automatically)
        pool.supply(asset, amount, address(this), 0);
        
        // Calculate shares (1:1 for now)
        shares = amount;
        userShares[msg.sender] += shares;
        totalShares += shares;
        
        emit Deposited(msg.sender, amount, shares);
        
        return shares;
    }
    
    /**
     * @notice Withdraw assets from Aave V3
     * @param shares Amount of shares to burn
     * @return amount Amount of assets withdrawn
     */
    function withdraw(uint256 shares) external override nonReentrant returns (uint256 amount) {
        require(shares > 0, "Shares must be greater than 0");
        require(userShares[msg.sender] >= shares, "Insufficient balance");
        
        // Withdraw from Aave (burns aTokens, returns underlying asset)
        // If contract is paused, users can still withdraw if funds are sitting in the contract (Emergency Exit scenario)
        if (paused()) {
            amount = shares; // 1:1 redemption from local balance
            require(IERC20(asset).balanceOf(address(this)) >= amount, "Insufficient local liquidity for emergency withdraw");
            IERC20(asset).safeTransfer(msg.sender, amount);
        } else {
            // Normal operation: withdraw from Aave
            amount = pool.withdraw(asset, shares, msg.sender);
        }
        
        // Update user shares
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        
        emit Withdrawn(msg.sender, shares, amount);
        
        return amount;
    }

    /**
     * @notice Emergency Exit: Withdraws all funds from Aave to this contract
     * @dev Only owner can call. Used when Aave is at risk but not yet paused/hacked.
     */
    function emergencyExitFromAave() external onlyOwner {
        uint256 aBalance = IERC20(aToken).balanceOf(address(this));
        require(aBalance > 0, "No funds in Aave");
        
        pool.withdraw(asset, type(uint256).max, address(this));
        _pause(); // Pause deposits, allow withdrawals from local balance
        
        emit EmergencyExit(aBalance);
    }
    
    /**
     * @notice Rescue tokens stuck in the contract
     * @dev Only owner can call.
     */
    function rescueFunds(address token, address recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "Invalid recipient");
        IERC20(token).safeTransfer(recipient, amount);
        emit FundsRescued(token, recipient, amount);
    }

    /**
     * @notice Pause deposits in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause deposits
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get user's balance in the strategy
     * @param user User address
     * @return balance User's share balance
     */
    function getBalance(address user) external view override returns (uint256 balance) {
        return userShares[user];
    }
    
    /**
     * @notice Get current APY from Aave V3
     * @return apy Annual percentage yield in basis points (e.g., 1250 = 12.5%)
     */
    function getAPY() external view override returns (uint256 apy) {
        // Get reserve data from Aave
        (,,,,,uint256 liquidityRate,,,,,,) = dataProvider.getReserveData(asset);
        
        // Convert from Ray (27 decimals) to basis points (2 decimals)
        // Ray: 1e27 = 100%
        // Basis points: 10000 = 100%
        // Conversion: liquidityRate / 1e27 * 10000 = liquidityRate / 1e23
        apy = liquidityRate / 1e23;
        
        return apy;
    }
    
    /**
     * @notice Get risk score of the strategy
     * @return risk Risk score (0-100, where 0 is lowest risk)
     */
    function getRiskScore() external pure override returns (uint8 risk) {
        // Aave V3 is considered low risk due to:
        // - Battle-tested protocol
        // - Strong security track record
        // - Decentralized governance
        // - Over-collateralized lending
        return 20; // Low risk
    }
    
    /**
     * @notice Get total value locked in this adapter
     * @return tvl Total value in underlying asset
     */
    function getTotalValueLocked() external view returns (uint256 tvl) {
        // aTokens are 1:1 with underlying, so balance equals TVL
        return IERC20(aToken).balanceOf(address(this));
    }
    
    /**
     * @notice Get aToken address for this adapter
     * @return Address of the aToken
     */
    function getAToken() external view returns (address) {
        return aToken;
    }
}
