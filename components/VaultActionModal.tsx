import React, { useState, useEffect } from 'react';
import { X, ArrowDownToLine, ArrowUpFromLine, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useVaultDeposit } from '../hooks/useVaultDeposit';
import { useVaultWithdraw } from '../hooks/useVaultWithdraw';

interface VaultActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    action: 'deposit' | 'withdraw';
    asset: {
        id: string;
        symbol: string;
        name: string;
        balance: number;
        price: number;
        address?: string;
        decimals?: number;
    };
    onSuccess?: () => void;
}

export const VaultActionModal: React.FC<VaultActionModalProps> = ({
    isOpen,
    onClose,
    action,
    asset,
    onSuccess,
}) => {
    const [amount, setAmount] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const assetAddress = asset.address || '0x0000000000000000000000000000000000000000'; // ETH

    const {
        deposit,
        isApproving,
        isDepositing,
        needsApproval,
    } = useVaultDeposit({
        assetAddress,
        assetSymbol: asset.symbol,
        decimals: asset.decimals,
        onSuccess: (txHash) => {
            setShowSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
                setShowSuccess(false);
                setAmount('');
            }, 2000);
        },
    });

    const { withdraw, isWithdrawing } = useVaultWithdraw({
        assetAddress,
        assetSymbol: asset.symbol,
        decimals: asset.decimals,
        onSuccess: (txHash) => {
            setShowSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
                setShowSuccess(false);
                setAmount('');
            }, 2000);
        },
    });

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setAmount('');
            setShowSuccess(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const isLoading = isApproving || isDepositing || isWithdrawing;
    const maxAmount = asset.balance / asset.price;
    const isValidAmount = amount && parseFloat(amount) > 0 && parseFloat(amount) <= maxAmount;

    const handleSubmit = () => {
        if (!isValidAmount) return;
        if (action === 'deposit') {
            deposit(amount);
        } else {
            withdraw(amount);
        }
    };

    const handleMaxClick = () => {
        setAmount(maxAmount.toString());
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white border-2 border-black shadow-brutal max-w-md w-full">
                {/* Header */}
                <div className="p-4 border-b-2 border-black flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-2">
                        {action === 'deposit' ? (
                            <ArrowDownToLine className="w-5 h-5" />
                        ) : (
                            <ArrowUpFromLine className="w-5 h-5" />
                        )}
                        <h2 className="font-display text-xl font-bold uppercase">
                            {action === 'deposit' ? 'Deposit' : 'Withdraw'} {asset.symbol}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="text-gray-400 hover:text-black disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {showSuccess ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <CheckCircle className="w-16 h-16 text-defi-success mb-4" />
                            <p className="font-bold text-lg mb-2">Transaction Submitted!</p>
                            <p className="text-sm text-gray-600 text-center">
                                Check your wallet for confirmation
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Amount Input */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold uppercase mb-2 text-gray-700">
                                    Amount
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        className="w-full border-2 border-black px-4 py-3 pr-16 font-mono text-lg focus:outline-none focus:ring-2 focus:ring-defi-accent disabled:bg-gray-100 disabled:cursor-not-allowed"
                                        disabled={isLoading}
                                        step="any"
                                    />
                                    <button
                                        onClick={handleMaxClick}
                                        disabled={isLoading}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold uppercase px-2 py-1 border border-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="flex items-center justify-between mt-2 text-xs">
                                    <span className="text-gray-600">
                                        Available: {maxAmount.toFixed(4)} {asset.symbol}
                                    </span>
                                    <span className="font-bold">
                                        ≈ ${(parseFloat(amount || '0') * asset.price).toFixed(2)}
                                    </span>
                                </div>
                                {amount && parseFloat(amount) > maxAmount && (
                                    <p className="mt-2 text-xs text-defi-danger">
                                        Amount exceeds available balance
                                    </p>
                                )}
                            </div>

                            {/* Warning for ERC20 approval */}
                            {action === 'deposit' && needsApproval && asset.address && (
                                <div className="mb-4 p-3 bg-yellow-50 border-2 border-yellow-400">
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                                        <div className="text-xs">
                                            <p className="font-bold text-yellow-800 mb-1">Approval Required</p>
                                            <p className="text-yellow-700">
                                                This will require 2 transactions: approve token, then deposit.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !isValidAmount}
                                className={`
                                    w-full py-3 border-2 border-black font-bold uppercase flex items-center justify-center gap-2 text-sm
                                    ${isLoading || !isValidAmount
                                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                        : 'bg-defi-accent text-white hover:bg-defi-accent-dark shadow-brutal-sm hover:shadow-brutal transition-all hover:-translate-y-0.5'
                                    }
                                `}
                            >
                                {isApproving && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Approving Token...
                                    </>
                                )}
                                {isDepositing && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Depositing...
                                    </>
                                )}
                                {isWithdrawing && (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Withdrawing...
                                    </>
                                )}
                                {!isLoading && (
                                    <>
                                        {action === 'deposit' ? (
                                            <>
                                                <ArrowDownToLine className="w-4 h-4" />
                                                Deposit to Vault
                                            </>
                                        ) : (
                                            <>
                                                <ArrowUpFromLine className="w-4 h-4" />
                                                Withdraw from Vault
                                            </>
                                        )}
                                    </>
                                )}
                            </button>

                            {/* Helper Text */}
                            {action === 'deposit' && (
                                <p className="mt-3 text-xs text-gray-500 text-center">
                                    Deposits are managed by the CoreVault smart contract on Sepolia
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VaultActionModal;
