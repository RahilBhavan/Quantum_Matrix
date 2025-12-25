import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Menu, Layers } from 'lucide-react';

interface MobileHeaderProps {
    onMenuClick: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick }) => {
    return (
        <header className="h-14 border-b-2 border-black bg-white flex items-center justify-between px-4 lg:hidden sticky top-0 z-30 shadow-sm">
            {/* Left: Hamburger + Logo */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 border-2 border-black hover:bg-gray-100 transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    <span className="font-display font-bold uppercase text-sm">DEFI LEGO</span>
                </div>
            </div>

            {/* Right: Wallet Connect (compact) */}
            <div className="scale-90 origin-right">
                <ConnectButton
                    showBalance={false}
                    chainStatus="icon"
                    accountStatus="avatar"
                />
            </div>
        </header>
    );
};

export default MobileHeader;
