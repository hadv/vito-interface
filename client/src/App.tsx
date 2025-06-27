import React, { useState, useEffect } from 'react';
import WalletPage from './components/wallet/WalletPage';
import { resolveAddressToEns, isValidEthereumAddress } from './utils';
import { Button, Input, Card } from './components/ui';
import { cn } from './utils/cn';
import './App.css';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ToastNotificationContainer } from './components/ui/Toast';
import { useToast } from './hooks/useToast';
import { ErrorHandler } from './utils/errorHandling';
import Header from './components/ui/Header';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import WalletModal from './components/ui/WalletModal';

// Tailwind classes for app container
const appContainerClasses = cn(
  'h-screen text-white',
  'bg-gray-950',
  'font-sans flex flex-col',
  'p-0 m-0'
);



const contentContainerClasses = 'flex-1 overflow-hidden relative p-0 m-0';

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
            autoComplete="off"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
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
          data-1p-ignore="true"
          data-lpignore="true"
          rightIcon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 5L19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }
        >
          Connect Safe Wallet
        </Button>


      </Card>
    </div>
  );
};

// Inner component that uses the wallet context
function AppContent() {
  const [network, setNetwork] = useState('ethereum');
  const [walletAddress, setWalletAddress] = useState('');
  const [ensName, setEnsName] = useState('');
  const [isLoadingEns, setIsLoadingEns] = useState(false);
  const toast = useToast();
  const { state, connectSafe, isModalOpen, hideWalletModal } = useWallet();

  // Update local state when wallet state changes
  useEffect(() => {
    if (state.safeAddress) {
      setWalletAddress(state.safeAddress);
    } else if (!state.isConnected) {
      setWalletAddress('');
    }
  }, [state.isConnected, state.safeAddress]);

  // Network change is handled by selectNetwork function in the UI

  // Resolve ENS name when wallet address changes
  useEffect(() => {
    let isMounted = true;
    
    const resolveEns = async () => {
      if (!state.isConnected || !walletAddress) return;
      
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
  }, [state.isConnected, walletAddress, network]);

  // Auto-dismiss error logic removed - using toast system instead

  const connectWallet = async () => {
    if (walletAddress.trim() && isValidEthereumAddress(walletAddress)) {
      try {
        await connectSafe({
          safeAddress: walletAddress as `0x${string}`,
          network: network,
          readOnlyMode: true
        });

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





  // Handle network selection
  const selectNetwork = (selectedNetwork: string) => {
    setNetwork(selectedNetwork);
  };





  return (
    <div className={appContainerClasses}>
      <Header
        network={network}
        walletConnected={state.isConnected}
        onSelectNetwork={selectNetwork}
      />

      <ToastNotificationContainer
        toasts={toast.toasts}
        onClose={toast.removeToast}
        style={{ top: '80px' }}
      />

      <div className={contentContainerClasses}>
        {state.isConnected ? (
          <WalletPage
            walletAddress={walletAddress}
            ensName={ensName}
            network={network}
            isLoadingEns={isLoadingEns}
          />
        ) : (
          <NoWalletPage
            walletAddress={walletAddress}
            setWalletAddress={setWalletAddress}
            onConnect={connectWallet}
          />
        )}
      </div>

      <WalletModal isOpen={isModalOpen} onClose={hideWalletModal} />
    </div>
  );
}

// Main App component with providers
function App() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('App Error Boundary caught error:', error, errorInfo);
      }}
    >
      <WalletProvider>
        <AppContent />
      </WalletProvider>
    </ErrorBoundary>
  );
}

export default App;
