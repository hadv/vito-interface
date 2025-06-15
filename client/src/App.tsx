import React, { useState, useEffect } from 'react';
import WalletPage from '@components/wallet/WalletPage';
import { VitoContainer } from '@components/vitoUI';
import { resolveAddressToEns, isValidEthereumAddress } from '@utils';
import { Button, Input, Card, Badge } from '@components/ui';
import { walletConnectionService } from './services/WalletConnectionService';
import { cn } from './utils/cn';
import './App.css';
import logo from './logo.svg';
import { processCommand } from './commands';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastNotificationContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { ErrorHandler } from './utils/errorHandling';

// Tailwind classes for app container
const appContainerClasses = cn(
  'h-screen text-white',
  'bg-gray-950',
  'font-sans flex flex-col',
  'p-0 m-0'
);

// Tailwind classes for header
const headerClasses = cn(
  'flex justify-between items-center',
  'bg-white/5 backdrop-blur-md',
  'px-6 py-4 border-b border-gray-800',
  'h-16 box-border relative overflow-visible'
);

// Tailwind classes for logo section
const logoContainerClasses = 'flex items-center h-full relative z-10';
const logoClasses = 'h-8 mr-3 drop-shadow-md';
const appNameClasses = cn(
  'm-0 text-2xl font-bold leading-none',
  'text-blue-400'
);

// These utility functions are kept for potential future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const networkSelectorClasses = 'relative h-full flex items-center z-20 overflow-visible';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getArrowClasses = (isOpen: boolean) => cn(
  'ml-2 inline-block w-0 h-0',
  'border-l-[4px] border-r-[4px] border-t-[4px]',
  'border-l-transparent border-r-transparent border-t-current',
  'transition-transform duration-250',
  isOpen ? 'rotate-180' : 'rotate-0'
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getCurrentNetworkClasses = (isOpen: boolean) => cn(
  'bg-white/10 text-white border-2 border-gray-700',
  'rounded-lg px-4 py-2 h-10 cursor-pointer',
  'font-medium text-sm flex items-center capitalize',
  'transition-all duration-200 backdrop-blur-md',
  'hover:bg-white/20 hover:border-gray-500 hover:shadow-lg',
  'active:scale-95',
  isOpen ? 'bg-white/20 border-gray-500 shadow-lg ring-2 ring-blue-500/30' : ''
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNetworkOptionsClasses = (isOpen: boolean) => cn(
  'fixed top-20 right-6 bg-gray-900 border-2 border-white',
  'rounded-xl w-48 z-[9999] shadow-2xl',
  'min-h-[120px]',
  isOpen ? 'block' : 'hidden'
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getNetworkOptionClasses = (isActive: boolean) => cn(
  'px-4 py-3 cursor-pointer text-sm font-medium capitalize',
  'transition-all duration-200 flex items-center gap-2',
  'hover:bg-gray-800 hover:text-white',
  isActive
    ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500'
    : 'text-gray-300'
);

const contentContainerClasses = 'flex-1 overflow-auto relative p-0 m-0';

// Tailwind classes for welcome page
const welcomeContainerClasses = cn(
  'flex flex-col items-center justify-center',
  'min-h-[calc(100vh-4rem)] p-8 text-center'
);

const welcomeCardClasses = 'max-w-2xl w-full text-center';

const welcomeTitleClasses = cn(
  'text-4xl font-bold mb-4',
  'bg-gradient-to-br from-blue-400 to-purple-400',
  'bg-clip-text text-transparent'
);

const welcomeSubtitleClasses = cn(
  'text-lg text-gray-300 mb-8 leading-relaxed'
);

const inputContainerClasses = 'mb-6 w-full';

const commandsSectionClasses = cn(
  'mt-8 pt-6 border-t border-gray-800'
);

const commandsTitleClasses = cn(
  'text-lg font-semibold text-white mb-4'
);

const commandsListClasses = 'grid gap-2 text-left';

const commandItemClasses = cn(
  'flex items-center gap-3 p-2',
  'rounded-md bg-white/5',
  'font-mono text-sm'
);

const commandKeyClasses = cn(
  'bg-blue-500 text-white',
  'px-2 py-1 rounded font-medium',
  'min-w-[24px] text-center'
);

const commandDescriptionClasses = 'text-gray-300';

// Tailwind classes for overlay
const getOverlayClasses = (isVisible: boolean) => cn(
  'fixed inset-0 bg-black/30 z-40',
  'transition-opacity duration-200',
  isVisible ? 'block opacity-100' : 'hidden opacity-0'
);

const NoWalletPage = ({ walletAddress, setWalletAddress, onConnect }: {
  walletAddress: string;
  setWalletAddress: (address: string) => void;
  onConnect: () => void;
}) => {
  const [isValidAddress, setIsValidAddress] = useState(true);

  // Validate wallet address
  const validateAddress = (address: string) => {
    if (!address) {
      setIsValidAddress(true);
      return;
    }

    setIsValidAddress(isValidEthereumAddress(address));
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setWalletAddress(newAddress);
    validateAddress(newAddress);
  };

  return (
    <div className={welcomeContainerClasses}>
      <Card variant="glass" padding="xl" className={welcomeCardClasses}>
        <h1 className={welcomeTitleClasses}>Vito Safe Wallet</h1>
        <p className={welcomeSubtitleClasses}>
          Secure multi-signature wallet interface for Ethereum and EVM networks.
          Connect your Safe wallet to manage assets, transactions, and settings.
        </p>

        <div className={inputContainerClasses}>
          <Input
            label="Safe Wallet Address"
            placeholder="Enter your Safe wallet address (0x...)"
            value={walletAddress}
            onChange={handleAddressChange}
            error={!isValidAddress ? 'Please enter a valid Ethereum address' : undefined}
            variant="outlined"
            inputSize="lg"
            fullWidth
            leftIcon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          />
        </div>

        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={onConnect}
          disabled={!walletAddress || !isValidAddress}
          rightIcon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        >
          Connect Safe Wallet
        </Button>

        <div className={commandsSectionClasses}>
          <h3 className={commandsTitleClasses}>Keyboard Shortcuts</h3>
          <div className={commandsListClasses}>
            <div className={commandItemClasses}>
              <code className={commandKeyClasses}>:c</code>
              <span className={commandDescriptionClasses}>Connect to Safe wallet</span>
            </div>
            <div className={commandItemClasses}>
              <code className={commandKeyClasses}>:help</code>
              <span className={commandDescriptionClasses}>Show help information</span>
            </div>
            <div className={commandItemClasses}>
              <code className={commandKeyClasses}>:</code>
              <span className={commandDescriptionClasses}>Enter command mode</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

function App() {
  const [network, setNetwork] = useState('ethereum');
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [ensName, setEnsName] = useState('');
  const [isLoadingEns, setIsLoadingEns] = useState(false);
  const [networkSelectorOpen, setNetworkSelectorOpen] = useState(false);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState(false);
  // Remove redundant error state - using toast system instead
  // const [error, setError] = useState<string | null>(null);

  // Initialize toast system
  const toast = useToast();

  // Network change is handled by selectNetwork function in the UI

  // Resolve ENS name when wallet address changes
  useEffect(() => {
    let isMounted = true;
    
    const resolveEns = async () => {
      if (!walletConnected || !walletAddress) return;
      
      setIsLoadingEns(true);
      try {
        const name = await resolveAddressToEns(walletAddress, network);
        if (isMounted) {
          setEnsName(name || '');
        }
      } catch (error) {
        console.error('Failed to resolve ENS name:', error);
        if (isMounted) {
          setEnsName('');
        }
      } finally {
        if (isMounted) {
          setIsLoadingEns(false);
        }
      }
    };
    
    resolveEns();
    
    return () => {
      isMounted = false;
    };
  }, [walletAddress, network, walletConnected]);

  // Auto-dismiss error logic removed - using toast system instead

  const connectWallet = async () => {
    if (walletAddress.trim() && isValidEthereumAddress(walletAddress)) {
      try {
        console.log(`Connecting to Safe wallet: ${walletAddress} on network: ${network}`);

        // Connect in read-only mode by default - user can connect signer later
        await walletConnectionService.connectWallet({
          safeAddress: walletAddress,
          network: network,
          readOnlyMode: true
        });

        setWalletConnected(true);
        toast.success('Wallet Connected', {
          message: `Successfully connected to Safe wallet on ${network}`
        });
      } catch (error: any) {
        console.error('Failed to connect to Safe wallet:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        toast.error('Connection Failed', {
          message: errorDetails.userMessage,
          action: {
            label: 'Retry',
            onClick: connectWallet
          }
        });
      }
    } else {
      const errorMsg = 'Please enter a valid Safe wallet address';
      toast.error('Invalid Address', { message: errorMsg });
    }
  };
  
  const handleCommand = (command: string) => {
    const cmd = command.trim().toLowerCase();
    console.log('Command received:', cmd);

    // Use the centralized command processor
    processCommand(cmd, {
      connectWallet,
      disconnectWallet: async () => {
        console.log('Disconnecting wallet');
        try {
          await walletConnectionService.disconnectWallet();
        } catch (error) {
          console.error('Error disconnecting wallet:', error);
        }
        setWalletConnected(false);
        setWalletAddress('');
        setEnsName('');
      }
    });
  };

  // Toggle network selector
  const toggleNetworkSelector = () => {
    console.log('Toggle network selector clicked, isNetworkSwitching:', isNetworkSwitching, 'current state:', networkSelectorOpen);
    if (!isNetworkSwitching) {
      setNetworkSelectorOpen(!networkSelectorOpen);
    }
  };

  // Handle network selection
  const selectNetwork = async (selectedNetwork: string) => {
    console.log(`Network selection clicked: ${selectedNetwork}, current: ${network}`);
    const previousNetwork = network;
    setNetwork(selectedNetwork);
    setNetworkSelectorOpen(false);

    // If wallet is connected, switch the network for the connected wallet
    if (walletConnected && walletAddress) {
      setIsNetworkSwitching(true);
      try {
        console.log(`Switching network from ${previousNetwork} to ${selectedNetwork} for wallet: ${walletAddress}`);

        await walletConnectionService.switchNetwork(selectedNetwork);

        console.log(`Successfully switched to ${selectedNetwork}`);
      } catch (error: any) {
        console.error('Failed to switch network:', error);
        // Revert network selection on error
        setNetwork(previousNetwork);
        toast.networkError(selectedNetwork, () => selectNetwork(selectedNetwork));
      } finally {
        setIsNetworkSwitching(false);
      }
    } else {
      console.log(`Network changed to ${selectedNetwork} (no wallet connected)`);
    }
  };

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (networkSelectorOpen && !(event.target as Element).closest('.network-selector')) {
        setNetworkSelectorOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [networkSelectorOpen]);

  // Add an effect to handle wallet disconnection
  useEffect(() => {
    if (!walletConnected) {
      console.log('Wallet connection state changed to disconnected');
    }
  }, [walletConnected]);

  // Add effect to listen for commands from WalletPage
  useEffect(() => {
    const handleGlobalCommand = (event: CustomEvent<{ command: string }>) => {
      const cmd = event.detail.command;
      console.log('Global command received:', cmd);
      
      if (cmd === 'q') {
        console.log('Disconnecting wallet from global command');
        setWalletConnected(false);
        setWalletAddress('');
        setEnsName('');
      }
    };

    window.addEventListener('vito:command', handleGlobalCommand as EventListener);
    return () => {
      window.removeEventListener('vito:command', handleGlobalCommand as EventListener);
    };
  }, []);

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary caught error:', error, errorInfo);
        toast.error('Application Error', {
          message: 'An unexpected error occurred. The page will reload automatically.',
          duration: 8000
        });
      }}
    >
      <div className={appContainerClasses}>
        {/* Toast Notifications */}
        <ToastNotificationContainer toasts={toast.toasts} onClose={toast.removeToast} />

        {/* Debug Panel - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed top-4 left-4 bg-black/80 text-white p-2 rounded text-xs z-[100] font-mono">
            Network: {network} | Selector Open: {networkSelectorOpen ? 'Yes' : 'No'} | Switching: {isNetworkSwitching ? 'Yes' : 'No'}
          </div>
        )}

      {/* Old error notification removed - using toast system instead */}

      <header className={headerClasses}>
        <div className={logoContainerClasses}>
          <img src={logo} alt="Vito Logo" className={logoClasses} />
          <h1 className={appNameClasses}>Vito</h1>
        </div>
        <div className="relative network-selector">
          <div
            className={`bg-white/10 text-white border-2 border-gray-700 rounded-lg px-4 py-2 h-10 cursor-pointer font-medium text-sm flex items-center capitalize transition-all duration-200 backdrop-blur-md hover:bg-white/20 hover:border-gray-500 hover:shadow-lg active:scale-95 ${networkSelectorOpen ? 'bg-white/20 border-gray-500 shadow-lg ring-2 ring-blue-500/30' : ''}`}
            onClick={toggleNetworkSelector}
            title="Click to switch network"
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
      </header>

      {networkSelectorOpen && (
        <div className="fixed top-20 right-6 bg-gray-900/95 border border-gray-600 rounded-xl w-48 z-[9999] shadow-2xl backdrop-blur-lg overflow-hidden network-selector">
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'ethereum' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => selectNetwork('ethereum')}
          >
            <Badge variant="primary" size="sm" dot />
            Ethereum
          </div>
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'sepolia' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => selectNetwork('sepolia')}
          >
            <Badge variant="warning" size="sm" dot />
            Sepolia
          </div>
          <div
            className={`px-4 py-3 cursor-pointer text-sm font-medium capitalize transition-all duration-200 flex items-center gap-2 hover:bg-gray-800 hover:text-white ${network === 'arbitrum' ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-300'}`}
            onClick={() => selectNetwork('arbitrum')}
          >
            <Badge variant="info" size="sm" dot />
            Arbitrum
          </div>
        </div>
      )}

      <div className={getOverlayClasses(networkSelectorOpen)} />
      <div className={contentContainerClasses}>
        {walletConnected ? (
          <VitoContainer onCommand={handleCommand}>
            <WalletPage
              walletAddress={walletAddress}
              ensName={ensName}
              network={network}
              isLoadingEns={isLoadingEns}
            />
          </VitoContainer>
        ) : (
          <VitoContainer onCommand={handleCommand}>
            <NoWalletPage
              walletAddress={walletAddress}
              setWalletAddress={setWalletAddress}
              onConnect={connectWallet}
            />
          </VitoContainer>
        )}
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
