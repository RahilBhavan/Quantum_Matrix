import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useChainId } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { sepolia } from 'viem/chains';
import { CONTRACTS, ABIS, CHAINS } from '../config/contracts';
import { ApiClient } from '../services/apiClient';
import { toast } from '../components/ToastProvider';

interface UseVaultDepositOptions {
    assetAddress: string;
    assetSymbol: string;
    decimals?: number;
    onSuccess?: (txHash: string) => void;
    onError?: (error: Error) => void;
}

interface DepositState {
    isApproving: boolean;
    isDepositing: boolean;
    isPending: boolean;
    approvalTxHash?: string;
    depositTxHash?: string;
    error?: Error;
}

export const useVaultDeposit = (options: UseVaultDepositOptions) => {
    const { assetAddress, assetSymbol, decimals = 18, onSuccess, onError } = options;
    const { address } = useAccount();
    const chainId = useChainId();
    const [state, setState] = useState<DepositState>({
        isApproving: false,
        isDepositing: false,
        isPending: false,
    });

    const isETH = assetAddress === '0x0000000000000000000000000000000000000000';
    const vaultAddress = chainId === CHAINS.SEPOLIA ? CONTRACTS.sepolia.CoreVault : '';

    // ERC20 Approval
    const { writeContractAsync: approveToken } = useWriteContract();

    // Deposit
    const { writeContractAsync: depositToVault } = useWriteContract();

    // Check current allowance for ERC20 tokens
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: assetAddress as `0x${string}`,
        abi: ABIS.MockUSDC, // Standard ERC20 ABI
        functionName: 'allowance',
        args: address && vaultAddress ? [address, vaultAddress as `0x${string}`] : undefined,
        query: {
            enabled: !isETH && !!address && !!vaultAddress,
        },
    });

    const deposit = async (amount: string) => {
        if (!address || !vaultAddress) {
            const error = new Error('Wallet not connected or vault not deployed on this network');
            setState(prev => ({ ...prev, error }));
            toast.error(error.message);
            onError?.(error);
            return;
        }

        try {
            const amountWei = isETH ? parseEther(amount) : parseUnits(amount, decimals);

            // Step 1: Approve ERC20 if needed
            if (!isETH) {
                const needsApproval = !currentAllowance || (currentAllowance as bigint) < amountWei;

                if (needsApproval) {
                    setState(prev => ({ ...prev, isApproving: true, isPending: true }));
                    toast('Requesting token approval...', { icon: '🔐' });

                    const approvalTx = await approveToken({
                        account: address,
                        chain: sepolia,
                        address: assetAddress as `0x${string}`,
                        abi: ABIS.MockUSDC,
                        functionName: 'approve',
                        args: [vaultAddress as `0x${string}`, amountWei],
                    });

                    setState(prev => ({ ...prev, approvalTxHash: approvalTx }));
                    toast.success(`Approval transaction submitted: ${approvalTx.slice(0, 10)}...`);

                    // Wait a bit for approval to be mined
                    await new Promise(resolve => setTimeout(resolve, 3000));

                    // Record approval in backend
                    await ApiClient.recordApproval({
                        walletAddress: address,
                        tokenAddress: assetAddress,
                        spenderAddress: vaultAddress,
                        approvedAmount: amountWei.toString(),
                        txHash: approvalTx,
                    });

                    await refetchAllowance();
                    setState(prev => ({ ...prev, isApproving: false }));
                    toast.success('Token approved successfully');
                }
            }

            // Step 2: Deposit
            setState(prev => ({ ...prev, isDepositing: true, isPending: true }));
            toast('Submitting deposit transaction...', { icon: '📤' });

            const depositTx = await depositToVault({
                account: address,
                chain: sepolia,
                address: vaultAddress as `0x${string}`,
                abi: ABIS.CoreVault,
                functionName: 'deposit',
                args: [assetAddress as `0x${string}`, amountWei],
                value: isETH ? amountWei : 0n,
            });

            setState(prev => ({ ...prev, depositTxHash: depositTx }));

            // Record deposit in backend
            await ApiClient.createDeposit({
                walletAddress: address,
                assetAddress,
                assetSymbol,
                amount: amountWei.toString(),
                txHash: depositTx,
            });

            toast.success(`Deposit submitted: ${depositTx.slice(0, 10)}...`);
            onSuccess?.(depositTx);

        } catch (error: any) {
            console.error('Deposit failed:', error);

            let errorMessage = 'Deposit transaction failed';
            if (error.message?.includes('User rejected')) {
                errorMessage = 'Transaction cancelled by user';
            } else if (error.message?.includes('insufficient funds')) {
                errorMessage = 'Insufficient ETH for gas fees';
            } else if (error.message?.includes('execution reverted')) {
                errorMessage = 'Transaction would fail. Check amount and allowance';
            } else if (error.message) {
                errorMessage = error.message;
            }

            const err = new Error(errorMessage);
            setState(prev => ({ ...prev, error: err }));
            toast.error(errorMessage);
            onError?.(err);
        } finally {
            setState(prev => ({ ...prev, isDepositing: false, isApproving: false, isPending: false }));
        }
    };

    return {
        deposit,
        ...state,
        needsApproval: !isETH && (!currentAllowance || currentAllowance === 0n),
    };
};
