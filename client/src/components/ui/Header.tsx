import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import logo from '../../logo.svg';
import Badge from './Badge';
import { useWallet } from '../../contexts/WalletContext';
import { useToast } from '../../hooks/useToast';

// Utility function for consistent address truncation
const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

interface HeaderProps {
  network: string;
  walletConnected: boolean;
  onSelectNetwork: (network: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  network,
  walletConnected,
  onSelectNetwork
}) => {
  const [showSignerMenu, setShowSignerMenu] = useState(false);
  const [showNetworkMenu, setShowNetworkMenu] = useState(false);
  const toast = useToast();
  const { state, showWalletModal, disconnectSigner } = useWallet();

  // Handle disconnecting signer wallet
  const handleDisconnectSigner = async () => {
    setShowSignerMenu(false);

    try {
      await disconnectSigner();
      toast.success('Wallet Disconnected', {
        message: 'Successfully disconnected signer wallet'
      });
    } catch (error: any) {
      console.error('Failed to disconnect signer wallet:', error);
      toast.error('Disconnection Failed', {
        message: `Failed to disconnect signer wallet: ${error.message}`
      });
    }
  };

  // Handle switching to another signer
  const handleSwitchSigner = () => {
    setShowSignerMenu(false);
    showWalletModal();
  };

  const networks = [
    { id: 'ethereum', name: 'Ethereum', color: 'bg-blue-500' },
    { id: 'sepolia', name: 'Sepolia', color: 'bg-purple-500' },
    { id: 'polygon', name: 'Polygon', color: 'bg-purple-600' },
    { id: 'arbitrum', name: 'Arbitrum', color: 'bg-blue-600' },
    { id: 'optimism', name: 'Optimism', color: 'bg-red-500' },
  ];

  const currentNetwork = networks.find(n => n.id === network) || networks[0];

  return (
    <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src={logo} alt="Vito" className="w-8 h-8" />
          <span className="text-xl font-bold text-white">Vito</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Network Selector */}
          <div className="relative">
            <button
              onClick={() => setShowNetworkMenu(!showNetworkMenu)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg',
                'bg-gray-800 hover:bg-gray-700 text-white',
                'border border-gray-700 transition-colors'
              )}
            >
              <div className={cn('w-2 h-2 rounded-full', currentNetwork.color)} />
              <span className="text-sm font-medium">{currentNetwork.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {showNetworkMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                {networks.map((net) => (
                  <button
                    key={net.id}
                    onClick={() => {
                      onSelectNetwork(net.id);
                      setShowNetworkMenu(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left',
                      'hover:bg-gray-700 transition-colors',
                      net.id === network ? 'bg-gray-700' : ''
                    )}
                  >
                    <div className={cn('w-2 h-2 rounded-full', net.color)} />
                    <span className="text-white text-sm">{net.name}</span>
                    {net.id === network && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="ml-auto text-green-400">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Signer Wallet Status */}
          {walletConnected && (
            <div className="relative">
              {state.signerConnected ? (
                <>
                  <button
                    onClick={() => setShowSignerMenu(!showSignerMenu)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg',
                      'bg-green-500/20 border border-green-500/30 text-green-400',
                      'hover:bg-green-500/30 transition-colors'
                    )}
                  >
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-sm font-medium">
                      {state.signerAddress ? truncateAddress(state.signerAddress, 6, 4) : 'Connected'}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {showSignerMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSignerMenu(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
                        <div className="p-4 border-b border-gray-700">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5"/>
                                <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5"/>
                              </svg>
                            </div>
                            <div>
                              <div className="text-white font-semibold text-sm">
                                {state.walletType === 'walletconnect' ? 'WalletConnect' : 'MetaMask'}
                              </div>
                              <div className="text-gray-400 text-xs">Connected</div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">Address</span>
                              <span className="text-white font-mono text-sm">
                                {state.signerAddress ? truncateAddress(state.signerAddress, 6, 4) : 'Connected'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400 text-xs">Balance</span>
                              <span className="text-white font-medium text-sm">
                                {state.signerBalance ? `${parseFloat(state.signerBalance).toFixed(4)} ETH` : '0.0000 ETH'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          <button
                            onClick={handleSwitchSigner}
                            className="w-full px-3 py-2 text-left text-blue-400 hover:bg-gray-700 rounded text-sm"
                          >
                            Switch Wallet
                          </button>
                          <button
                            onClick={handleDisconnectSigner}
                            className="w-full px-3 py-2 text-left text-red-400 hover:bg-gray-700 rounded text-sm"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <button
                  onClick={showWalletModal}
                  className={cn(
                    'px-4 py-2 rounded-lg font-medium text-sm',
                    'bg-blue-500 hover:bg-blue-600 text-white',
                    'transition-colors'
                  )}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
