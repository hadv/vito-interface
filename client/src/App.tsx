import React, { useState, useEffect } from 'react';
import WalletPage from './components/wallet/WalletPage';
import AddSafeAccountPage from './components/wallet/pages/AddSafeAccountPage';
import { resolveAddressToEns, isValidEthereumAddress } from './utils';
import { walletConnectionService } from './services/WalletConnectionService';
import { cn } from './utils/cn';
import './App.css';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastNotificationContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { ErrorHandler } from './utils/errorHandling';
import Header from './components/ui/Header';
import Web3AuthProvider from './components/providers/Web3AuthProvider';

// Tailwind classes for app container
const appContainerClasses = cn(
  'h-screen text-white',
  'bg-gray-950',
  'font-sans flex flex-col',
  'p-0 m-0'
);



const contentContainerClasses = 'flex-1 overflow-hidden relative p-0 m-0';



// Tailwind classes for overlay
const getOverlayClasses = (isVisible: boolean) => cn(
  'fixed inset-0 bg-black/30 z-40',
  'transition-opacity duration-200',
  isVisible ? 'block opacity-100' : 'hidden opacity-0'
);

// Interface for Safe Account data
interface SafeAccountData {
  name: string;
  network: string;
  address: string;
}

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

  // Initialize WalletConnect error suppression on app start
  useEffect(() => {
    ErrorHandler.initializeWalletConnectErrorSuppression();

    // Add ultra-aggressive error suppression at the global level
    const originalOnError = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = typeof message === 'string' ? message : error?.message || '';

      if (errorMessage.includes('No matching key') ||
          errorMessage.includes('session or pairing topic doesn\'t exist') ||
          errorMessage.includes('session topic doesn\'t exist') ||
          errorMessage.includes('pairing topic doesn\'t exist')) {
        console.log('🔇 Suppressed WalletConnect window error:', errorMessage);
        return true; // Prevent default error handling
      }

      return originalOnError ? originalOnError(message, source, lineno, colno, error) : false;
    };

    // Override unhandled promise rejections
    const originalUnhandledRejection = window.onunhandledrejection;
    window.onunhandledrejection = (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || '';

      if (errorMessage.includes('No matching key') ||
          errorMessage.includes('session or pairing topic doesn\'t exist') ||
          errorMessage.includes('session topic doesn\'t exist') ||
          errorMessage.includes('pairing topic doesn\'t exist')) {
        console.log('🔇 Suppressed WalletConnect promise rejection:', errorMessage);
        event.preventDefault();
        return;
      }

      if (originalUnhandledRejection) {
        originalUnhandledRejection.call(window, event);
      }
    };

    // Cleanup on unmount
    return () => {
      ErrorHandler.cleanupWalletConnectErrorSuppression();
      window.onerror = originalOnError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);



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

  const connectWallet = async (safeData?: SafeAccountData) => {
    const addressToConnect = safeData?.address || walletAddress;
    const networkToConnect = safeData?.network || network;

    if (addressToConnect.trim() && isValidEthereumAddress(addressToConnect)) {
      try {
        console.log(`Connecting to Safe wallet: ${addressToConnect} on network: ${networkToConnect}`);

        // Update state with the new data
        if (safeData) {
          setWalletAddress(safeData.address);
          setNetwork(safeData.network);
        }

        // Connect in read-only mode by default - user can connect signer later
        await walletConnectionService.connectWallet({
          safeAddress: addressToConnect,
          network: networkToConnect,
          readOnlyMode: true
        });

        setWalletConnected(true);
        toast.success('Wallet Connected', {
          message: `Successfully connected to Safe wallet "${safeData?.name || 'Safe'}" on ${networkToConnect}`
        });
      } catch (error: any) {
        console.error('Failed to connect to Safe wallet:', error);
        const errorDetails = ErrorHandler.classifyError(error);
        toast.error('Connection Failed', {
          message: errorDetails.userMessage,
          action: {
            label: 'Retry',
            onClick: () => connectWallet(safeData)
          }
        });
      }
    } else {
      const errorMsg = 'Please enter a valid Safe wallet address';
      toast.error('Invalid Address', { message: errorMsg });
    }
  };

  const handleLogoClick = async () => {
    if (walletConnected) {
      try {
        // Disconnect the Safe wallet and any connected signer
        await walletConnectionService.disconnectWallet();

        // Reset state to initial values
        setWalletConnected(false);
        setWalletAddress('');
        setEnsName('');
        setIsLoadingEns(false);

        toast.success('Disconnected', {
          message: 'Successfully disconnected from Safe wallet'
        });
      } catch (error: any) {
        console.error('Failed to disconnect:', error);
        toast.error('Disconnection Failed', {
          message: 'Failed to disconnect from Safe wallet'
        });
      }
    }
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



  return (
    <Web3AuthProvider>
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
      {/* Old error notification removed - using toast system instead */}

      <Header
        network={network}
        networkSelectorOpen={networkSelectorOpen}
        isNetworkSwitching={isNetworkSwitching}
        walletConnected={walletConnected}
        onToggleNetworkSelector={toggleNetworkSelector}
        onSelectNetwork={selectNetwork}
        onLogoClick={handleLogoClick}
      />

        {/* Toast Notifications - Positioned below header */}
        <ToastNotificationContainer
          toasts={toast.toasts}
          onClose={toast.removeToast}
          style={{ top: '80px' }}
        />

      <div className={getOverlayClasses(networkSelectorOpen)} />
      <div className={contentContainerClasses}>
        {walletConnected ? (
          <WalletPage
            walletAddress={walletAddress}
            ensName={ensName}
            network={network}
            isLoadingEns={isLoadingEns}
          />
        ) : (
          <AddSafeAccountPage
            onConnect={connectWallet}
          />
        )}
      </div>
        </div>
      </ErrorBoundary>
    </Web3AuthProvider>
  );
}

export default App;
