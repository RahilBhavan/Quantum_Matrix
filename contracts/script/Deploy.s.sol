// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/CoreVault.sol";
import "../src/adapters/MockYieldAdapter.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 for testing
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "mUSDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract DeployScript is Script {
    function run() external {
        // Load environment variables
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address keeperAddress = vm.envAddress("KEEPER_ADDRESS");
        
        console.log("=== Deployment Configuration ===");
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("Keeper:", keeperAddress);
        console.log("Network:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock USDC (for testing)
        console.log("\n1. Deploying Mock USDC...");
        MockUSDC mockUSDC = new MockUSDC();
        console.log("Mock USDC deployed at:", address(mockUSDC));
        
        // 2. Deploy CoreVault Implementation
        console.log("\n2. Deploying CoreVault Implementation...");
        CoreVault implementation = new CoreVault();
        console.log("Implementation deployed at:", address(implementation));
        
        // 3. Prepare initialization data
        bytes memory initData = abi.encodeWithSelector(
            CoreVault.initialize.selector
        );
        
        // 4. Deploy ERC1967 Proxy
        console.log("\n3. Deploying ERC1967 Proxy...");
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            initData
        );
        console.log("Proxy deployed at:", address(proxy));
        
        // 5. Get CoreVault instance through proxy
        CoreVault vault = CoreVault(payable(address(proxy)));
        
        // 6. Deploy Mock Yield Adapter
        console.log("\n4. Deploying Mock Yield Adapter...");
        MockYieldAdapter adapter = new MockYieldAdapter(address(mockUSDC));
        console.log("Mock Adapter deployed at:", address(adapter));
        
        // 7. Configure Vault
        console.log("\n5. Configuring Vault...");
        
        // Set keeper
        vault.setKeeper(keeperAddress, true);
        console.log("Keeper set:", keeperAddress);
        
        // Approve adapter
        vault.setAdapterApproval(address(adapter), true);
        console.log("Adapter approved:", address(adapter));
        
        // 8. Mint test tokens to deployer
        mockUSDC.mint(vm.addr(deployerPrivateKey), 10000 * 10**6); // 10k USDC
        console.log("Minted 10,000 mUSDC to deployer");

        vm.stopBroadcast();
        
        // 9. Print deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("CoreVault Proxy:", address(vault));
        console.log("CoreVault Implementation:", address(implementation));
        console.log("Mock USDC:", address(mockUSDC));
        console.log("Mock Adapter:", address(adapter));
        console.log("Keeper:", keeperAddress);
        console.log("\n=== Next Steps ===");
        console.log("1. Verify contracts on Etherscan");
        console.log("2. Update frontend .env with contract addresses");
        console.log("3. Test deposit/withdraw flows");
        
        // Note: Deployment addresses are printed above and saved in broadcast/ directory
    }
}
