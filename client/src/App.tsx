import React, { useState, useEffect } from 'react';
import WalletPage from '@components/wallet/WalletPage';
import { VitoContainer } from '@components/vitoUI';
import { resolveAddressToEns, isValidEthereumAddress } from '@utils';
import { Button, Input, Card, Badge } from '@components/ui';
import { cn } from './utils/cn';
import './App.css';
import logo from './logo.svg';
import { processCommand } from './commands';

// Tailwind classes for app container
const appContainerClasses = cn(
  'h-screen text-white overflow-hidden',
  'bg-gradient-to-br from-gray-950 to-gray-900',
  'font-sans flex flex-col',
  'p-0 m-0'
);

// Tailwind classes for header
const headerClasses = cn(
  'flex justify-between items-center',
  'bg-white/5 backdrop-blur-md',
  'px-6 py-4 border-b border-gray-800',
  'h-16 box-border relative',
  'before:absolute before:inset-0',
  'before:bg-gradient-to-r before:from-primary-500/20 before:via-transparent before:to-secondary-500/20',
  'before:pointer-events-none'
);

// Tailwind classes for logo section
const logoContainerClasses = 'flex items-center h-full relative z-10';
const logoClasses = 'h-8 mr-3 drop-shadow-md';
const appNameClasses = cn(
  'm-0 text-2xl font-bold leading-none',
  'bg-gradient-to-br from-primary-400 to-secondary-400',
  'bg-clip-text text-transparent'
);

// Tailwind classes for network selector
const networkSelectorClasses = 'relative h-full flex items-center z-10';

const getArrowClasses = (isOpen: boolean) => cn(
  'ml-2 inline-block w-0 h-0',
  'border-l-[4px] border-r-[4px] border-t-[4px]',
  'border-l-transparent border-r-transparent border-t-current',
  'transition-transform duration-250',
  isOpen ? 'rotate-180' : 'rotate-0'
);

const currentNetworkClasses = cn(
  'bg-white/10 text-white border border-gray-700',
  'rounded-lg px-4 py-2 h-10 cursor-pointer',
  'font-medium text-sm flex items-center capitalize',
  'transition-all duration-250 backdrop-blur-md',
  'hover:bg-white/15 hover:border-gray-600 hover:-translate-y-0.5'
);

const getNetworkOptionsClasses = (isOpen: boolean) => cn(
  'absolute top-12 right-0 bg-dark-900 border border-dark-600',
  'rounded-xl w-45 z-20 shadow-xl backdrop-blur-lg overflow-hidden',
  isOpen ? 'block' : 'hidden'
);

const getNetworkOptionClasses = (isActive: boolean) => cn(
  'px-4 py-3 cursor-pointer text-sm font-medium capitalize',
  'transition-all duration-250 flex items-center gap-2',
  isActive
    ? 'bg-primary-500/20 text-primary-400'
    : 'text-gray-300 hover:bg-dark-800 hover:text-white'
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
  'bg-gradient-to-br from-primary-400 to-secondary-400',
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
  'bg-primary-500 text-white',
  'px-2 py-1 rounded font-medium',
  'min-w-[24px] text-center'
);

const commandDescriptionClasses = 'text-gray-300';

// Tailwind classes for overlay
const getOverlayClasses = (isVisible: boolean) => cn(
  'fixed inset-0 bg-black/50 z-[5]',
  isVisible ? 'block' : 'hidden'
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

  const handleNetworkChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNetwork(e.target.value);
  };

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

  const connectWallet = () => {
    if (walletAddress.trim() && isValidEthereumAddress(walletAddress)) {
      console.log(`Connecting to wallet: ${walletAddress} on network: ${network}`);
      setWalletConnected(true);
    }
  };
  
  const handleCommand = (command: string) => {
    const cmd = command.trim().toLowerCase();
    console.log('Command received:', cmd);
    
    // Use the centralized command processor
    processCommand(cmd, {
      connectWallet,
      disconnectWallet: () => {
        console.log('Disconnecting wallet');
        setWalletConnected(false);
        setWalletAddress('');
        setEnsName('');
      }
    });
  };

  // Toggle network selector
  const toggleNetworkSelector = () => {
    setNetworkSelectorOpen(!networkSelectorOpen);
  };

  // Handle network selection
  const selectNetwork = (selectedNetwork: string) => {
    setNetwork(selectedNetwork);
    setNetworkSelectorOpen(false);
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
    <div className={appContainerClasses}>
      <header className={headerClasses}>
        <div className={logoContainerClasses}>
          <img src={logo} alt="Vito Logo" className={logoClasses} />
          <h1 className={appNameClasses}>Vito</h1>
        </div>
        <div className={cn(networkSelectorClasses, "network-selector")}>
          <div className={currentNetworkClasses} onClick={toggleNetworkSelector}>
            {network}
            <div className={getArrowClasses(networkSelectorOpen)} />
          </div>
          <div className={getNetworkOptionsClasses(networkSelectorOpen)}>
            <div
              className={getNetworkOptionClasses(network === 'ethereum')}
              onClick={() => selectNetwork('ethereum')}
            >
              <Badge variant="primary" size="sm" dot />
              Ethereum
            </div>
            <div
              className={getNetworkOptionClasses(network === 'sepolia')}
              onClick={() => selectNetwork('sepolia')}
            >
              <Badge variant="warning" size="sm" dot />
              Sepolia
            </div>
            <div
              className={getNetworkOptionClasses(network === 'arbitrum')}
              onClick={() => selectNetwork('arbitrum')}
            >
              <Badge variant="info" size="sm" dot />
              Arbitrum
            </div>
          </div>
        </div>
      </header>
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
  );
}

export default App;
