// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/adapters/AaveV3Adapter.sol";

contract DeployAaveAdapter is Script {
    // Sepolia Aave V3 addresses
    address constant AAVE_POOL = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant AAVE_DATA_PROVIDER = 0x3e9708d80f7B3e43118013075F7e95CE3AB31F31;
    
    // Test assets on Sepolia
    address constant USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // Aave Sepolia USDC
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        console.log("=== Deploying Aave V3 Adapter ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Network:", block.chainid);
        console.log("Aave Pool:", AAVE_POOL);
        console.log("Asset (USDC):", USDC);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Aave V3 Adapter
        AaveV3Adapter adapter = new AaveV3Adapter(
            AAVE_POOL,
            AAVE_DATA_PROVIDER,
            USDC
        );
        
        console.log("\n=== Deployment Summary ===");
        console.log("AaveV3Adapter:", address(adapter));
        console.log("aToken:", adapter.getAToken());
        console.log("Current APY:", adapter.getAPY(), "basis points");
        console.log("Risk Score:", adapter.getRiskScore());
        
        vm.stopBroadcast();
        
        console.log("\n=== Next Steps ===");
        console.log("1. Verify contract on Etherscan");
        console.log("2. Approve adapter in CoreVault");
        console.log("3. Test deposit/withdraw flows");
    }
}
