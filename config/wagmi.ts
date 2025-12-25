import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, arbitrum } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || '';

export const config = createConfig({
    chains: [mainnet, sepolia, arbitrum],
    connectors: [
        injected(),
        ...(projectId ? [walletConnect({ projectId })] : []),
    ],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
        [arbitrum.id]: http(),
    },
});
