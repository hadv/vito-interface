import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import logo from '../../logo.svg';
import { walletConnectionService, WalletConnectionState } from '../../services/WalletConnectionService';
import { useToast } from '../../hooks/useToast';

// Utility function for consistent address truncation
const truncateAddress = (address: string, startLength: number = 6, endLength: number = 4): string => {
  if (!address || address.length <= startLength + endLength) return address;
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
};

// Network display configuration
const getNetworkDisplayInfo = (network: string) => {
  const networkConfig = {
    ethereum: {
      short: 'ETH',
      full: 'Ethereum Mainnet',
      color: '#627EEA',
      badgeVariant: 'primary' as const
    },
    sepolia: {
      short: 'SEP',
      full: 'Sepolia Testnet',
      color: '#CFB5F0',
      badgeVariant: 'warning' as const
    },
    arbitrum: {
      short: 'ARB',
      full: 'Arbitrum One',
      color: '#96BEDC',
      badgeVariant: 'info' as const
    }
  };

  return networkConfig[network as keyof typeof networkConfig] || {
    short: network.toUpperCase().slice(0, 3),
    full: network,
    color: '#888888',
    badgeVariant: 'default' as const
  };
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
    setShowSignerMenu(false); // Close dropdown immediately

    try {
      await walletConnectionService.disconnectSignerWallet();
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
      await walletConnectionService.switchSignerWallet();
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

            {/* MetaMask-style Wallet Dropdown */}
            {showSignerMenu && connectionState.signerConnected && (
              <>
                {/* Backdrop Dimming */}
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
                  style={{ zIndex: 9999 }}
                  onClick={() => setShowSignerMenu(false)}
                />

                <div
                  className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                  style={{
                    zIndex: 10000,
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px'
                  }}
                >
                {/* Wallet Header - MetaMask Style */}
                <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Official MetaMask Icon */}
                    <div className="w-8 h-8 flex items-center justify-center">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        <path d="M30.0389 1.51562L17.8555 10.4844L20.2278 4.82812L30.0389 1.51562Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M1.95117 1.51562L14.0278 10.5625L11.7722 4.82812L1.95117 1.51562Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M25.5889 23.0156L22.4445 27.7656L29.4445 29.7656L31.5556 23.1719L25.5889 23.0156Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M0.453125 23.1719L2.55556 29.7656L9.55556 27.7656L6.41112 23.0156L0.453125 23.1719Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.22223 14.0469L7.16668 17.2969L14.1111 17.6406L13.8889 10.0156L9.22223 14.0469Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22.7778 14.0469L18.0278 9.9375L17.8889 17.6406L24.8333 17.2969L22.7778 14.0469Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.55556 27.7656L13.6111 25.7969L10.1111 23.2188L9.55556 27.7656Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.3889 25.7969L22.4445 27.7656L21.8889 23.2188L18.3889 25.7969Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22.4445 27.7656L18.3889 25.7969L18.7222 28.5781L18.6667 29.6875L22.4445 27.7656Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.55556 27.7656L13.3333 29.6875L13.2889 28.5781L13.6111 25.7969L9.55556 27.7656Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13.3889 21.2969L10.0278 20.3281L12.3889 19.2188L13.3889 21.2969Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.6111 21.2969L19.6111 19.2188L21.9722 20.3281L18.6111 21.2969Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.55556 27.7656L10.1389 23.0156L6.41112 23.1719L9.55556 27.7656Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.8611 23.0156L22.4445 27.7656L25.5889 23.1719L21.8611 23.0156Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M24.8333 17.2969L17.8889 17.6406L18.6111 21.2969L19.6111 19.2188L21.9722 20.3281L24.8333 17.2969Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.0278 20.3281L12.3889 19.2188L13.3889 21.2969L14.1111 17.6406L7.16668 17.2969L10.0278 20.3281Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7.16668 17.2969L10.1111 23.2188L10.0278 20.3281L7.16668 17.2969Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21.9722 20.3281L21.8889 23.2188L24.8333 17.2969L21.9722 20.3281Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14.1111 17.6406L13.3889 21.2969L14.3333 25.2969L14.5556 19.9531L14.1111 17.6406Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17.8889 17.6406L17.4445 19.9375L17.6667 25.2969L18.6111 21.2969L17.8889 17.6406Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.6111 21.2969L17.6667 25.2969L18.3889 25.7969L21.8889 23.2188L21.9722 20.3281L18.6111 21.2969Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10.0278 20.3281L10.1111 23.2188L13.6111 25.7969L14.3333 25.2969L13.3889 21.2969L10.0278 20.3281Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.6667 29.6875L18.7222 28.5781L18.4167 28.3125H13.5833L13.2889 28.5781L13.3333 29.6875L9.55556 27.7656L10.9722 28.9375L13.5278 30.7656H18.4722L21.0278 28.9375L22.4445 27.7656L18.6667 29.6875Z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.3889 25.7969L17.6667 25.2969H14.3333L13.6111 25.7969L13.2889 28.5781L13.5833 28.3125H18.4167L18.7222 28.5781L18.3889 25.7969Z" fill="#161616" stroke="#161616" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M30.5556 11.2188L32 5.20312L30.0389 1.51562L18.3889 10.2969L22.7778 14.0469L29.3333 15.9531L30.6111 14.4531L30.0278 14.0156L31.4167 12.7656L30.6667 12.1719L32.0556 11.1406L30.5556 11.2188Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M0 5.20312L1.44445 11.2188L-0.0555556 11.1406L1.33334 12.1719L0.583334 12.7656L1.97223 14.0156L1.38889 14.4531L2.66667 15.9531L9.22223 14.0469L13.6111 10.2969L1.96112 1.51562L0 5.20312Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M29.3333 15.9531L22.7778 14.0469L24.8333 17.2969L21.8889 23.2188L25.5889 23.1719H31.5556L29.3333 15.9531Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9.22223 14.0469L2.66667 15.9531L0.453125 23.1719H6.41112L10.1111 23.2188L7.16668 17.2969L9.22223 14.0469Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17.8889 17.6406L18.3889 10.2969L20.2278 4.82812H11.7722L13.6111 10.2969L14.1111 17.6406L14.3333 19.9688L14.3333 25.2969H17.6667L17.6667 19.9688L17.8889 17.6406Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">MetaMask</div>
                      <div className="text-gray-400 text-xs">Connected</div>
                    </div>
                  </div>

                  {/* Wallet Info */}
                  <div className="space-y-3">
                    {/* Address with Copy and Link buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-mono text-sm">
                          {connectionState.signerAddress ?
                            truncateAddress(connectionState.signerAddress, 6, 4) :
                            'Connected'
                          }
                        </span>
                        {connectionState.signerAddress && (
                          <div className="flex items-center gap-1">
                            {/* Copy Button */}
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(connectionState.signerAddress!);
                                toast.success('Address Copied', {
                                  message: 'Wallet address copied to clipboard'
                                });
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="Copy address"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </button>
                            {/* External Link Button */}
                            <button
                              onClick={() => {
                                const network = connectionState.network || 'ethereum';
                                const baseUrl = network === 'sepolia'
                                  ? 'https://sepolia.etherscan.io'
                                  : network === 'arbitrum'
                                  ? 'https://arbiscan.io'
                                  : 'https://etherscan.io';
                                window.open(`${baseUrl}/address/${connectionState.signerAddress}`, '_blank');
                              }}
                              className="p-1 text-gray-400 hover:text-white transition-colors"
                              title="View on block explorer"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="2"/>
                                <polyline points="15,3 21,3 21,9" stroke="currentColor" strokeWidth="2"/>
                                <line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Balance - on same line */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs uppercase tracking-wide">Balance</span>
                      <span className="text-white font-medium">
                        {connectionState.signerBalance ?
                          `${parseFloat(connectionState.signerBalance).toFixed(4)} ETH` :
                          '0.0000 ETH'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-3">
                  {/* Switch Wallet Button */}
                  <button
                    onClick={handleSwitchSigner}
                    disabled={isConnectingWallet}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 px-4 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    data-1p-ignore="true"
                    data-lpignore="true"
                    type="button"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 15H7.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Switch wallet
                  </button>
                </div>

                {/* Menu Options */}
                <div className="border-t border-gray-700">
                  <button
                    onClick={handleDisconnectSigner}
                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors flex items-center gap-3"
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
              </>
            )}
          </div>
        )}
        
        {/* Network Selector */}
        <div className="relative network-selector">
          {(() => {
            const networkInfo = getNetworkDisplayInfo(network);
            return (
              <div
                className={cn(
                  'bg-white/5 text-white border border-gray-600 rounded-lg',
                  'px-3 py-1.5 h-8 cursor-pointer font-medium text-sm',
                  'flex items-center gap-2 transition-all duration-200',
                  'backdrop-blur-md hover:bg-white/10 hover:border-gray-500',
                  'hover:shadow-lg active:scale-95',
                  networkSelectorOpen && 'bg-white/10 border-gray-500 shadow-lg ring-1 ring-blue-500/30'
                )}
                onClick={onToggleNetworkSelector}
                title={`${networkInfo.full} - Click to switch network`}
                data-1p-ignore="true"
                data-lpignore="true"
              >
                {isNetworkSwitching ? (
                  <>
                    {/* Network indicator dot */}
                    <div
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: networkInfo.color }}
                    />
                    <span className="animate-pulse text-xs">{networkInfo.short}</span>
                    <div className="w-3 h-3 border border-gray-400 border-t-white rounded-full animate-spin" />
                  </>
                ) : (
                  <>
                    {/* Network indicator dot */}
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: networkInfo.color }}
                    />
                    <span className="text-xs font-semibold">{networkInfo.short}</span>
                    <div className={cn(
                      'w-0 h-0 border-l-[3px] border-r-[3px] border-t-[3px]',
                      'border-l-transparent border-r-transparent border-t-current',
                      'transition-transform duration-200',
                      networkSelectorOpen ? 'rotate-180' : 'rotate-0'
                    )} />
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Network Selector Dropdown */}
      {networkSelectorOpen && (
        <>
          {/* Backdrop Dimming */}
          <div
            className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm"
            style={{ zIndex: 9998 }}
            onClick={onToggleNetworkSelector}
          />

          <div className="fixed top-20 right-6 bg-gray-900/95 border border-gray-600 rounded-xl w-52 z-[9999] shadow-2xl backdrop-blur-lg overflow-hidden network-selector">
            {['ethereum', 'sepolia', 'arbitrum'].map((networkKey) => {
              const networkInfo = getNetworkDisplayInfo(networkKey);
              const isSelected = network === networkKey;

              return (
                <div
                  key={networkKey}
                  className={cn(
                    'px-4 py-3 cursor-pointer text-sm font-medium',
                    'transition-all duration-200 flex items-center gap-3',
                    'hover:bg-gray-800 hover:text-white',
                    isSelected
                      ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
                      : 'text-gray-300'
                  )}
                  onClick={() => onSelectNetwork(networkKey)}
                  data-1p-ignore="true"
                  data-lpignore="true"
                >
                  {/* Network colored indicator */}
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: networkInfo.color }}
                  />

                  {/* Network info */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-semibold">{networkInfo.full.split(' ')[0]}</span>
                    {networkInfo.full.includes(' ') && (
                      <span className="text-xs text-gray-400 truncate">
                        {networkInfo.full.split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </div>

                  {/* Short label */}
                  <span className="text-xs font-mono text-gray-500 flex-shrink-0">
                    {networkInfo.short}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
