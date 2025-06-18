import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import logo from '../../logo.svg';
import Badge from './Badge';
import { walletConnectionService, WalletConnectionState } from '../../services/WalletConnectionService';
import { useToast } from '../../hooks/useToast';

// Utility function for consistent address truncation
const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

interface HeaderProps {
  network: string;
  networkSelectorOpen: boolean;
  isNetworkSwitching: boolean;
  walletConnected: boolean;
  onToggleNetworkSelector: () => void;
  onSelectNetwork: (network: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  network,
  networkSelectorOpen,
  isNetworkSwitching,
  walletConnected,
  onToggleNetworkSelector,
  onSelectNetwork
}) => {
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [showSignerMenu, setShowSignerMenu] = useState(false);
  const toast = useToast();

  // Monitor wallet connection state
  useEffect(() => {
    // Get initial state
    setConnectionState(walletConnectionService.getState());

    // Subscribe to state changes
    const unsubscribe = walletConnectionService.subscribe((state) => {
      setConnectionState(state);
    });

    return unsubscribe;
  }, []);

  // Handle connecting signer wallet
  const handleConnectSigner = async () => {
    setIsConnectingWallet(true);
    try {
      await walletConnectionService.connectSignerWallet();
      toast.success('Wallet Connected', {
        message: 'Successfully connected signer wallet'
      });
    } catch (error: any) {
      console.error('Failed to connect signer wallet:', error);
      toast.error('Connection Failed', {
        message: `Failed to connect signer wallet: ${error.message}`
      });
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Handle disconnecting signer wallet
  const handleDisconnectSigner = async () => {
    try {
      await walletConnectionService.disconnectSignerWallet();
      setShowSignerMenu(false);
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
  const handleSwitchSigner = async () => {
    setShowSignerMenu(false);
    setIsConnectingWallet(true);
    try {
      // First disconnect current signer
      await walletConnectionService.disconnectSignerWallet();
      // Then connect new signer
      await walletConnectionService.connectSignerWallet();
      toast.success('Signer Switched', {
        message: 'Successfully switched to new signer wallet'
      });
    } catch (error: any) {
      console.error('Failed to switch signer wallet:', error);
      toast.error('Switch Failed', {
        message: `Failed to switch signer wallet: ${error.message}`
      });
    } finally {
      setIsConnectingWallet(false);
    }
  };

  // Click outside handler for signer menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSignerMenu && !(event.target as Element).closest('.signer-menu')) {
        setShowSignerMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSignerMenu]);

  // Tailwind classes for header
  const headerClasses = cn(
    'flex justify-between items-center',
    'bg-white/5 backdrop-blur-md',
    'px-6 py-4 border-b border-gray-800',
    'h-16 box-border relative overflow-visible',
    'z-50'
  );

  const logoContainerClasses = cn(
    'flex items-center gap-3'
  );

  const logoClasses = cn(
    'h-8 w-8 transition-transform duration-300 hover:scale-110'
  );

  const appNameClasses = cn(
    'text-white text-xl font-bold tracking-wide'
  );

  return (
    <header className={headerClasses}>
      <div className={logoContainerClasses}>
        <img src={logo} alt="Vito Logo" className={logoClasses} />
        <h1 className={appNameClasses}>Vito</h1>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Signer Wallet Status */}
        {walletConnected && connectionState.isConnected && (
          <div className="relative signer-menu" style={{ zIndex: 1000 }}>
            {connectionState.signerConnected ? (
              /* Connected Signer Display */
              <button
                onClick={() => setShowSignerMenu(!showSignerMenu)}
                className={cn(
                  'bg-green-500/20 border border-green-500/30 text-green-400',
                  'px-4 py-2 rounded-lg font-medium text-sm',
                  'transition-all duration-200 flex items-center gap-2',
                  'hover:bg-green-500/30 hover:border-green-500/50',
                  'hover:shadow-lg active:scale-95'
                )}
                title="Manage connected signer wallet"
                data-1p-ignore="true"
                data-lpignore="true"
                type="button"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 15H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {connectionState.signerAddress ?
                  truncateAddress(connectionState.signerAddress, 6, 4) :
                  'Connected'
                }
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className={cn('transition-transform duration-200', showSignerMenu ? 'rotate-180' : '')}>
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            ) : (
              /* Connect Button */
              <button
                onClick={handleConnectSigner}
                disabled={isConnectingWallet}
                className={cn(
                  'bg-blue-500 hover:bg-blue-600 text-white',
                  'px-4 py-2 rounded-lg font-medium text-sm',
                  'transition-all duration-200 flex items-center gap-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'hover:shadow-lg active:scale-95'
                )}
                title="Connect wallet to sign transactions"
                data-1p-ignore="true"
                data-lpignore="true"
                type="button"
              >
                {isConnectingWallet ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 15H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Connect
                  </>
                )}
              </button>
            )}

            {/* Signer Management Dropdown */}
            {showSignerMenu && connectionState.signerConnected && (
              <div 
                className="absolute top-full right-0 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg shadow-xl overflow-hidden"
                style={{ 
                  zIndex: 10000,
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px'
                }}
              >
                {/* Signer Info Header */}
                <div className="px-4 py-3 bg-gray-700 border-b border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">Signer Wallet</div>
                      <div className="text-gray-300 text-xs">Manage your connected wallet</div>
                    </div>
                  </div>
                </div>

                {/* Menu Options */}
                <div className="py-2">
                  <button
                    onClick={() => {
                      if (connectionState.signerAddress) {
                        navigator.clipboard.writeText(connectionState.signerAddress);
                        toast.success('Address Copied', {
                          message: 'Signer address copied to clipboard'
                        });
                      }
                    }}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-3"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Copy Address
                  </button>

                  <button
                    onClick={handleSwitchSigner}
                    disabled={isConnectingWallet}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center gap-3 disabled:opacity-50"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 4V10H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M23 20V14H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10M23 14L18.36 18.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Switch Signer
                  </button>

                  <div className="border-t border-gray-600 my-2"></div>

                  <button
                    onClick={handleDisconnectSigner}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-3"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Network Selector */}
        <div className="relative network-selector">
          <div
            className={`bg-white/10 text-white border-2 border-gray-700 rounded-lg px-4 py-2 h-10 cursor-pointer font-medium text-sm flex items-center capitalize transition-all duration-200 backdrop-blur-md hover:bg-white/20 hover:border-gray-500 hover:shadow-lg active:scale-95 ${networkSelectorOpen ? 'bg-white/20 border-gray-500 shadow-lg ring-2 ring-blue-500/30' : ''}`}
            onClick={onToggleNetworkSelector}
            title="Click to switch network"
            data-1p-ignore="true"
            data-lpignore="true"
          >
            {isNetworkSwitching ? (
              <>
                <span className="animate-pulse">{network}</span>
                <div className="w-3 h-3 border border-gray-400 border-t-white rounded-full animate-spin ml-2" />
              </>
            ) : (
              <>
                <span className="mr-2">{network}</span>
                <div className={`ml-2 inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-l-transparent border-r-transparent border-t-current transition-transform duration-250 ${networkSelectorOpen ? 'rotate-180' : 'rotate-0'}`} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Network Selector Dropdown */}
      {networkSelectorOpen && (
        <div className="fixed top-20 right-6 bg-gray-900/95 border border-gray-600 rounded-xl w-48 z-[9999] shadow-2xl backdrop-blur-lg overflow-hidden network-selector">
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'ethereum' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => onSelectNetwork('ethereum')}
            data-1p-ignore="true"
            data-lpignore="true"
          >
            <Badge variant="primary" size="sm" dot />
            Ethereum
          </div>
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'sepolia' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => onSelectNetwork('sepolia')}
            data-1p-ignore="true"
            data-lpignore="true"
          >
            <Badge variant="warning" size="sm" dot />
            Sepolia
          </div>
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'arbitrum' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => onSelectNetwork('arbitrum')}
            data-1p-ignore="true"
            data-lpignore="true"
          >
            <Badge variant="info" size="sm" dot />
            Arbitrum
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
