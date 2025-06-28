import React, { useState, useEffect } from 'react';
import { cn } from '../../utils/cn';
import logo from '../../logo.svg';
import Badge from './Badge';
import { walletConnectionService, WalletConnectionState } from '../../services/WalletConnectionService';
import { useToast } from '../../hooks/useToast';
import WalletConnectionModal from './WalletConnectionModal';

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
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render counter
  const toast = useToast();

  // Monitor wallet connection state
  useEffect(() => {
    // Get initial state
    setConnectionState(walletConnectionService.getState());

    // Subscribe to state changes
    const unsubscribe = walletConnectionService.subscribe((state) => {
      console.log('Header: Wallet connection state changed:', state);
      setConnectionState(state);

      // Force re-render to ensure UI updates immediately
      setForceRender(prev => prev + 1);
      console.log('Header: Forcing re-render after state change');

      // Auto-close wallet modal when signer is connected
      if (state.signerConnected && showWalletModal) {
        console.log('Header: Auto-closing wallet modal due to signer connection');
        setShowWalletModal(false);
      }
    });

    return unsubscribe;
  }, [showWalletModal]);

  // Force re-render effect (ensures component updates when forceRender changes)
  useEffect(() => {
    console.log('Header: Re-render triggered, forceRender:', forceRender);
  }, [forceRender]);



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

    try {
      console.log('Switching signer wallet, forcefully disconnecting current wallet...');
      // Force disconnect the current signer wallet to clean up any existing sessions
      // This is especially important for WalletConnect to ensure clean state
      await walletConnectionService.disconnectSignerWallet(true);
      console.log('Current signer wallet forcefully disconnected, opening wallet selection modal...');
    } catch (error) {
      console.error('Failed to disconnect current signer wallet:', error);
      // Continue to show modal even if disconnect fails
    }

    setShowWalletModal(true);
  };

  // Handle wallet selection from modal
  const handleWalletSelect = async (walletType: string) => {
    setIsConnectingWallet(true);
    try {
      if (walletType === 'metamask') {
        await walletConnectionService.connectSignerWallet();
        toast.success('Wallet Connected', {
          message: 'Successfully connected MetaMask wallet'
        });
      } else if (walletType === 'walletconnect') {
        // WalletConnect connection is handled by the WalletConnectModal
        // This is called after successful connection
        toast.success('Wallet Connected', {
          message: 'Successfully connected via WalletConnect'
        });
      } else {
        throw new Error(`${walletType} is not yet supported`);
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Show user-friendly error messages
      let errorMessage = 'Failed to connect wallet';
      if (error.message.includes('cancelled') || error.message.includes('rejected')) {
        errorMessage = 'Connection cancelled by user';
      } else if (error.message.includes('pending')) {
        errorMessage = 'Connection request already pending. Please check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error('Connection Failed', {
        message: errorMessage
      });

      // Re-throw error so the modal can handle it appropriately
      throw error;
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
                onClick={() => setShowWalletModal(true)}
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
                {/* Wallet Header - Dynamic based on wallet type */}
                <div className="px-4 py-4 bg-gray-800 border-b border-gray-700">
                  <div className="flex items-center gap-3 mb-3">
                    {/* Dynamic Wallet Icon */}
                    <div className="w-8 h-8 flex items-center justify-center">
                      {connectionState.walletType === 'walletconnect' ? (
                        // WalletConnect Icon - official clean version
                        <svg width="32" height="20" viewBox="0 0 40 25" fill="none" className="flex-shrink-0">
                          <path d="m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z" fill="#3b99fc"/>
                        </svg>
                      ) : (
                        // MetaMask Icon (default)
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="flex-shrink-0">
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
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold text-sm">
                        {connectionState.walletType === 'walletconnect' ? 'WalletConnect' : 'MetaMask'}
                      </div>
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

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => {
          console.log('Header: Closing wallet modal');
          setShowWalletModal(false);
        }}
        onWalletSelect={handleWalletSelect}
      />
    </header>
  );
};

export default Header;
