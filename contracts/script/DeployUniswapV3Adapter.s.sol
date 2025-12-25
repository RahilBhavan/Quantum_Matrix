// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/adapters/UniswapV3Adapter.sol";

contract DeployUniswapV3Adapter is Script {
    // Sepolia Uniswap V3 addresses
    address constant POSITION_MANAGER = 0x1238536071E1c677A632429e3655c799b22cDA52;
    address constant USDC_WETH_POOL = 0x6Ce0896eAE6D4BD668fDe41BB784548fb8F59b50; // 0.3% fee tier
    
    // Tokens on Sepolia
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // Sepolia USDC
    address constant WETH = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14; // Sepolia WETH
    
    // Liquidity range (full range for simplicity)
    int24 constant TICK_LOWER = -887220;
    int24 constant TICK_UPPER = 887220;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        console.log("=== Deploying Uniswap V3 Adapter ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network:", block.chainid);
        console.log("Position Manager:", POSITION_MANAGER);
        console.log("Pool:", USDC_WETH_POOL);
        console.log("USDC:", USDC);
        console.log("WETH:", WETH);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Uniswap V3 Adapter
        UniswapV3Adapter adapter = new UniswapV3Adapter(
            POSITION_MANAGER,
            USDC_WETH_POOL,
            USDC,
            WETH,
            3000, // 0.3% fee tier
            TICK_LOWER,
            TICK_UPPER
        );
        
        console.log("\n=== Deployment Summary ===");
        console.log("UniswapV3Adapter:", address(adapter));
        console.log("Fee Tier: 0.3%");
        console.log("Current APY:", adapter.getAPY(), "basis points");
        console.log("Risk Score:", adapter.getRiskScore());
        console.log("Tick Range: Lower", TICK_LOWER);
        console.log("Tick Range: Upper", TICK_UPPER);
        
        vm.stopBroadcast();
        
        console.log("\n=== Next Steps ===");
        console.log("1. Verify contract on Etherscan");
        console.log("2. Approve adapter in CoreVault");
        console.log("3. Test liquidity provision");
    }
}
