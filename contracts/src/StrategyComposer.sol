// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./CoreVault.sol";
import "./interfaces/IStrategyAdapter.sol";

/**
 * @title StrategyComposer
 * @notice Pre-built strategy templates for easy portfolio construction
 * @dev Provides conservative, adaptive, and aggressive strategy templates
 */
contract StrategyComposer {
    CoreVault public immutable vault;
    
    // Adapter addresses (set in constructor)
    address public immutable aaveAdapter;
    address public immutable uniswapAdapter;
    address public immutable gmxAdapter;
    
    struct StrategyTemplate {
        string name;
        string description;
        uint8 riskScore;
        TemplateLayer[] layers;
    }
    
    struct TemplateLayer {
        address adapter;
        CoreVault.Condition condition;
        uint16 weight;
    }
    
    event TemplateApplied(address indexed user, address indexed asset, string templateName);
    
    constructor(
        address _vault,
        address _aaveAdapter,
        address _uniswapAdapter,
        address _gmxAdapter
    ) {
        require(_vault != address(0), "Invalid vault");
        require(_aaveAdapter != address(0), "Invalid Aave adapter");
        require(_uniswapAdapter != address(0), "Invalid Uniswap adapter");
        
        vault = CoreVault(payable(_vault));
        aaveAdapter = _aaveAdapter;
        uniswapAdapter = _uniswapAdapter;
        gmxAdapter = _gmxAdapter; // Can be address(0) if not deployed yet
    }
    
    /**
     * @notice Get conservative strategy template
     * @return template Strategy template with 70% Aave, 30% Uniswap
     */
    function getConservativeTemplate() external view returns (StrategyTemplate memory template) {
        TemplateLayer[] memory layers = new TemplateLayer[](2);
        
        layers[0] = TemplateLayer({
            adapter: aaveAdapter,
            condition: CoreVault.Condition.Always,
            weight: 7000 // 70%
        });
        
        layers[1] = TemplateLayer({
            adapter: uniswapAdapter,
            condition: CoreVault.Condition.Always,
            weight: 3000 // 30%
        });
        
        return StrategyTemplate({
            name: "Conservative Yield",
            description: "70% Aave lending + 30% Uniswap V3 LP. Low risk, stable returns.",
            riskScore: 25,
            layers: layers
        });
    }
    
    /**
     * @notice Get adaptive strategy template
     * @return template Strategy that adapts to market sentiment
     */
    function getAdaptiveTemplate() external view returns (StrategyTemplate memory template) {
        TemplateLayer[] memory layers = new TemplateLayer[](4);
        
        // Bullish allocation: 60% Uniswap, 40% Aave
        layers[0] = TemplateLayer({
            adapter: uniswapAdapter,
            condition: CoreVault.Condition.Bullish,
            weight: 6000
        });
        
        layers[1] = TemplateLayer({
            adapter: aaveAdapter,
            condition: CoreVault.Condition.Bullish,
            weight: 4000
        });
        
        // Bearish allocation: 80% Aave, 20% Uniswap
        layers[2] = TemplateLayer({
            adapter: aaveAdapter,
            condition: CoreVault.Condition.Bearish,
            weight: 8000
        });
        
        layers[3] = TemplateLayer({
            adapter: uniswapAdapter,
            condition: CoreVault.Condition.Bearish,
            weight: 2000
        });
        
        return StrategyTemplate({
            name: "Sentiment Adaptive",
            description: "Adapts allocation based on market sentiment. Bullish: more LP, Bearish: more lending.",
            riskScore: 40,
            layers: layers
        });
    }
    
    /**
     * @notice Get aggressive strategy template
     * @return template High-risk, high-reward strategy
     */
    function getAggressiveTemplate() external view returns (StrategyTemplate memory template) {
        require(gmxAdapter != address(0), "GMX adapter not available");
        
        TemplateLayer[] memory layers = new TemplateLayer[](2);
        
        // Only active in bullish markets
        layers[0] = TemplateLayer({
            adapter: uniswapAdapter,
            condition: CoreVault.Condition.Bullish,
            weight: 7000
        });
        
        layers[1] = TemplateLayer({
            adapter: gmxAdapter,
            condition: CoreVault.Condition.Bullish,
            weight: 3000
        });
        
        return StrategyTemplate({
            name: "Aggressive Growth",
            description: "70% Uniswap V3 + 30% GMX. High risk, only active in bullish markets.",
            riskScore: 70,
            layers: layers
        });
    }
    
    /**
     * @notice Get balanced strategy template
     * @return template Balanced allocation across all adapters
     */
    function getBalancedTemplate() external view returns (StrategyTemplate memory template) {
        TemplateLayer[] memory layers = new TemplateLayer[](2);
        
        layers[0] = TemplateLayer({
            adapter: aaveAdapter,
            condition: CoreVault.Condition.Always,
            weight: 5000 // 50%
        });
        
        layers[1] = TemplateLayer({
            adapter: uniswapAdapter,
            condition: CoreVault.Condition.Always,
            weight: 5000 // 50%
        });
        
        return StrategyTemplate({
            name: "Balanced Portfolio",
            description: "50% Aave + 50% Uniswap V3. Balanced risk and reward.",
            riskScore: 35,
            layers: layers
        });
    }
    
    /**
     * @notice Apply a template to user's allocation
     * @param asset Asset to apply template to
     * @param templateType Template type (0=Conservative, 1=Adaptive, 2=Aggressive, 3=Balanced)
     */
    function applyTemplate(address asset, uint8 templateType) external {
        StrategyTemplate memory template;
        
        if (templateType == 0) {
            template = this.getConservativeTemplate();
        } else if (templateType == 1) {
            template = this.getAdaptiveTemplate();
        } else if (templateType == 2) {
            template = this.getAggressiveTemplate();
        } else if (templateType == 3) {
            template = this.getBalancedTemplate();
        } else {
            revert("Invalid template type");
        }
        
        // Add each layer to the vault
        for (uint i = 0; i < template.layers.length; i++) {
            vault.addStrategyLayer(
                asset,
                template.layers[i].adapter,
                template.layers[i].condition,
                template.layers[i].weight
            );
        }
        
        emit TemplateApplied(msg.sender, asset, template.name);
    }
    
    /**
     * @notice Calculate weighted APY for a template
     * @param templateType Template type
     * @return weightedAPY Weighted average APY in basis points
     */
    function calculateTemplateAPY(uint8 templateType) external view returns (uint256 weightedAPY) {
        StrategyTemplate memory template;
        
        if (templateType == 0) {
            template = this.getConservativeTemplate();
        } else if (templateType == 1) {
            template = this.getAdaptiveTemplate();
        } else if (templateType == 2) {
            template = this.getAggressiveTemplate();
        } else if (templateType == 3) {
            template = this.getBalancedTemplate();
        } else {
            revert("Invalid template type");
        }
        
        uint256 totalWeight = 0;
        uint256 weightedSum = 0;
        
        for (uint i = 0; i < template.layers.length; i++) {
            uint256 apy = IStrategyAdapter(template.layers[i].adapter).getAPY();
            weightedSum += (apy * template.layers[i].weight);
            totalWeight += template.layers[i].weight;
        }
        
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
}
