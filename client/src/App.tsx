import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import WalletPage from '@components/wallet/WalletPage';
import { VitoContainer } from '@components/vitoUI';
import { resolveAddressToEns, isValidEthereumAddress } from '@utils';
import './App.css';
import logo from './logo.svg';
import { processCommand } from './commands';

const AppContainer = styled.div`
  height: 100vh;
  color: #d4d4d4;
  background-color: #1e1e1e;
  font-family: 'Courier New', monospace;
  overflow: hidden; /* Prevent scrolling */
  display: flex;
  flex-direction: column;
  margin-bottom: env(safe-area-inset-bottom, 0px); /* Add space for mobile browsers */
  padding: 0;
  margin: 0;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #252526;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #333;
  height: 48px;
  box-sizing: border-box;
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
`;

const Logo = styled.img`
  height: 24px;
  margin-right: 10px;
`;

const AppName = styled.h1`
  margin: 0;
  font-size: 1.25rem;
  line-height: 1;
`;

const NetworkSelectorContainer = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
`;

const ArrowIcon = styled.div<{ isOpen: boolean }>`
  margin-left: 6px;
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid currentColor;
  border-bottom: 0;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s;
`;

const CurrentNetwork = styled.div`
  background-color: #252526;
  color: #d4d4d4;
  border: none;
  border-left: 1px solid #333;
  padding: 0 1rem;
  height: 100%;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  text-transform: capitalize;
  
  &:hover {
    color: #ffffff;
  }
`;

const NetworkOptions = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 40px;
  right: 0;
  background-color: #1e1e1e;
  border: 1px solid #333;
  border-radius: 0 0 4px 4px;
  width: 150px;
  z-index: 20;
  display: ${props => props.isOpen ? 'block' : 'none'};
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const NetworkOption = styled.div<{ isActive: boolean }>`
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-size: 0.9rem;
  text-transform: capitalize;
  background-color: ${props => props.isActive ? '#252526' : 'transparent'};
  
  &:hover {
    background-color: #2a2d2e;
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 0;
  margin: 0;
`;

const InputContainer = styled.div`
  margin-top: 2rem;
  margin-bottom: 1rem;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
`;

const WalletInput = styled.input`
  width: 100%;
  max-width: 500px;
  background-color: #333;
  color: #d4d4d4;
  border: 1px solid #555;
  padding: 0.5rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  
  &:focus {
    outline: none;
    border-color: #0e639c;
  }
`;

const ConnectButton = styled.button`
  margin-top: 1rem;
  background-color: #0e639c;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  
  &:hover {
    background-color: #1177bb;
  }
  
  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`;

const Overlay = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 5;
  display: ${props => props.isVisible ? 'block' : 'none'};
`;

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
    <div style={{ padding: '2rem', height: 'calc(100% - 4rem)', overflowY: 'auto' }}>
      <h1>Vito Safe Wallet Interface</h1>
      <p>Welcome to the Vito UI for Safe Wallet interaction.</p>
      <p>Please enter your Safe Wallet address to get started.</p>
      <p>Navigate using keyboard shortcuts and commands (press : to enter command mode).</p>
      
      <InputContainer>
        <InputLabel htmlFor="wallet-address">Safe Wallet Address:</InputLabel>
        <WalletInput 
          id="wallet-address"
          type="text"
          value={walletAddress}
          onChange={handleAddressChange}
          placeholder="Enter your Safe wallet address..."
          style={{ borderColor: !isValidAddress ? '#f48771' : undefined }}
        />
        {!isValidAddress && (
          <div style={{ color: '#f48771', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Please enter a valid Ethereum address
          </div>
        )}
      </InputContainer>
      
      <ConnectButton 
        onClick={onConnect}
        disabled={!walletAddress || !isValidAddress}
      >
        Connect Wallet
      </ConnectButton>
      
      <div style={{ marginTop: '2rem' }}>
        <p><strong>Available Commands:</strong></p>
        <p>:c - Connect to Safe wallet</p>
        <p>:help - Show help information</p>
      </div>
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
    <AppContainer>
      <Header>
        <LogoContainer>
          <Logo src={logo} alt="Vito Logo" />
          <AppName>Vito</AppName>
        </LogoContainer>
        <NetworkSelectorContainer className="network-selector">
          <CurrentNetwork onClick={toggleNetworkSelector}>
            {network}
            <ArrowIcon isOpen={networkSelectorOpen} />
          </CurrentNetwork>
          <NetworkOptions isOpen={networkSelectorOpen}>
            <NetworkOption 
              isActive={network === 'ethereum'} 
              onClick={() => selectNetwork('ethereum')}
            >
              Ethereum
            </NetworkOption>
            <NetworkOption 
              isActive={network === 'sepolia'} 
              onClick={() => selectNetwork('sepolia')}
            >
              Sepolia
            </NetworkOption>
            <NetworkOption 
              isActive={network === 'arbitrum'} 
              onClick={() => selectNetwork('arbitrum')}
            >
              Arbitrum
            </NetworkOption>
          </NetworkOptions>
        </NetworkSelectorContainer>
      </Header>
      <Overlay isVisible={networkSelectorOpen} />
      <ContentContainer>
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
      </ContentContainer>
    </AppContainer>
  );
}

export default App;
