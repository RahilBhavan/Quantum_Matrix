export declare const CONTRACTS: {
    readonly sepolia: {
        readonly CoreVault: "0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0";
        readonly MockYieldAdapter: "0x05251018325f1c998D23Dc1f7f7eD609A948D9A9";
        readonly MockUSDC: "0x08009c047eA5a848997885d69E0352faab9B5Ee3";
        readonly AaveV3Adapter: "0x05251018325f1c998D23Dc1f7f7eD609A948D9A9";
        readonly UniswapV3Adapter: "0x05251018325f1c998D23Dc1f7f7eD609A948D9A9";
    };
    readonly mainnet: {
        readonly CoreVault: "";
    };
};
export declare const STRATEGY_MAP: Record<string, string>;
export declare const ABIS: {
    readonly CoreVault: ({
        type: string;
        inputs: never[];
        stateMutability: string;
        name?: undefined;
        outputs?: undefined;
        anonymous?: undefined;
    } | {
        type: string;
        stateMutability: string;
        inputs?: undefined;
        name?: undefined;
        outputs?: undefined;
        anonymous?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        outputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability: string;
        anonymous?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        outputs: {
            name: string;
            type: string;
            internalType: string;
            components: {
                name: string;
                type: string;
                internalType: string;
            }[];
        }[];
        stateMutability: string;
        anonymous?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            indexed: boolean;
            internalType: string;
        }[];
        anonymous: boolean;
        stateMutability?: undefined;
        outputs?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability?: undefined;
        outputs?: undefined;
        anonymous?: undefined;
    })[];
    readonly MockYieldAdapter: ({
        type: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability: string;
        name?: undefined;
        outputs?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        outputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability: string;
    })[];
    readonly MockUSDC: ({
        type: string;
        inputs: never[];
        stateMutability: string;
        name?: undefined;
        outputs?: undefined;
        anonymous?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        outputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability: string;
        anonymous?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            indexed: boolean;
            internalType: string;
        }[];
        anonymous: boolean;
        stateMutability?: undefined;
        outputs?: undefined;
    } | {
        type: string;
        name: string;
        inputs: {
            name: string;
            type: string;
            internalType: string;
        }[];
        stateMutability?: undefined;
        outputs?: undefined;
        anonymous?: undefined;
    })[];
};
export declare const CHAINS: {
    readonly SEPOLIA: 11155111;
    readonly MAINNET: 1;
    readonly ARBITRUM: 42161;
    readonly ARBITRUM_SEPOLIA: 421614;
};
export declare function getContractAddress(contract: keyof typeof CONTRACTS.sepolia, chainId: number): string;
//# sourceMappingURL=contracts.d.ts.map