import { useState } from 'react';
import { useAccount, useWriteContract, useChainId } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACTS, ABIS, CHAINS } from '../config/contracts';
import { ApiClient } from '../services/apiClient';
import { toast } from '../components/ToastProvider';

interface UseVaultWithdrawOptions {
    assetAddress: string;
    assetSymbol: string;
    decimals?: number;
    onSuccess?: (txHash: string) => void;
    onError?: (error: Error) => void;
}

export const useVaultWithdraw = (options: UseVaultWithdrawOptions) => {
    const { assetAddress, assetSymbol, decimals = 18, onSuccess, onError } = options;
    const { address } = useAccount();
    const chainId = useChainId();
    const [isWithdrawing, setIsWithdrawing] = useState(false);
    const [txHash, setTxHash] = useState<string>();
    const [error, setError] = useState<Error>();

    const isETH = assetAddress === '0x0000000000000000000000000000000000000000';
    const vaultAddress = chainId === CHAINS.SEPOLIA ? CONTRACTS.sepolia.CoreVault : '';

    const { writeContractAsync: withdrawFromVault } = useWriteContract();

    const withdraw = async (amount: string) => {
        if (!address || !vaultAddress) {
            const error = new Error('Wallet not connected or vault not deployed on this network');
            setError(error);
            toast.error(error.message);
            onError?.(error);
            return;
        }

        try {
            setIsWithdrawing(true);
            const amountWei = isETH ? parseEther(amount) : parseUnits(amount, decimals);

            toast('Submitting withdrawal transaction...', { icon: '📤' });

            const withdrawTx = await withdrawFromVault({
                account: address,
                chain: sepolia,
                address: vaultAddress as `0x${string}`,
                abi: ABIS.CoreVault,
                functionName: 'withdraw',
                args: [assetAddress as `0x${string}`, amountWei],
            });

            setTxHash(withdrawTx);

            // Record withdrawal in backend
            await ApiClient.createWithdrawal({
                walletAddress: address,
                assetAddress,
                assetSymbol,
                amount: amountWei.toString(),
                txHash: withdrawTx,
            });

            toast.success(`Withdrawal submitted: ${withdrawTx.slice(0, 10)}...`);
            onSuccess?.(withdrawTx);

        } catch (error: any) {
            console.error('Withdrawal failed:', error);

            let errorMessage = 'Withdrawal transaction failed';
            if (error.message?.includes('User rejected')) {
                errorMessage = 'Transaction cancelled by user';
            } else if (error.message?.includes('insufficient funds')) {
                errorMessage = 'Insufficient ETH for gas fees';
            } else if (error.message?.includes('execution reverted')) {
                errorMessage = 'Transaction would fail. Check vault balance';
            } else if (error.message) {
                errorMessage = error.message;
            }

            const err = new Error(errorMessage);
            setError(err);
            toast.error(errorMessage);
            onError?.(err);
        } finally {
            setIsWithdrawing(false);
        }
    };

    return {
        withdraw,
        isWithdrawing,
        txHash,
        error,
    };
};
