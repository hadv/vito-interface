import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import WalletPage from '@components/wallet/WalletPage';
import { VitoContainer } from '@components/vitoUI';
import { resolveAddressToEns, isValidEthereumAddress } from '@utils';
import { Button, Input, Card, Badge } from '@components/ui';
import { theme } from './theme';
import './App.css';
import logo from './logo.svg';
import { processCommand } from './commands';

const AppContainer = styled.div`
  height: 100vh;
  color: ${theme.colors.text.primary};
  background: linear-gradient(135deg, ${theme.colors.background.primary} 0%, ${theme.colors.background.secondary} 100%);
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin-bottom: env(safe-area-inset-bottom, 0px);
  padding: 0;
  margin: 0;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  padding: ${theme.spacing[4]} ${theme.spacing[6]};
  border-bottom: 1px solid ${theme.colors.border.tertiary};
  height: 64px;
  box-sizing: border-box;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, ${theme.colors.primary[500]}20 0%, transparent 50%, ${theme.colors.secondary[500]}20 100%);
    pointer-events: none;
  }
`;

const LogoContainer = styled.div`
  display: flex;
  align-items: center;
  height: 100%;
  position: relative;
  z-index: 1;
`;

const Logo = styled.img`
  height: 32px;
  margin-right: ${theme.spacing[3]};
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`;

const AppName = styled.h1`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  line-height: 1;
  background: linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.secondary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const NetworkSelectorContainer = styled.div`
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  z-index: 1;
`;

const ArrowIcon = styled.div<{ isOpen: boolean }>`
  margin-left: ${theme.spacing[2]};
  display: inline-block;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid currentColor;
  border-bottom: 0;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: ${theme.transitions.normal};
`;

const CurrentNetwork = styled.div`
  background: rgba(255, 255, 255, 0.1);
  color: ${theme.colors.text.primary};
  border: 1px solid ${theme.colors.border.tertiary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[2]} ${theme.spacing[4]};
  height: 40px;
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  font-size: ${theme.typography.fontSize.sm};
  display: flex;
  align-items: center;
  text-transform: capitalize;
  transition: ${theme.transitions.normal};
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: ${theme.colors.border.secondary};
    transform: translateY(-1px);
  }
`;

const NetworkOptions = styled.div<{ isOpen: boolean }>`
  position: absolute;
  top: 48px;
  right: 0;
  background: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.xl};
  width: 180px;
  z-index: 20;
  display: ${props => props.isOpen ? 'block' : 'none'};
  box-shadow: ${theme.shadows.xl};
  backdrop-filter: blur(20px);
  overflow: hidden;
`;

const NetworkOption = styled.div<{ isActive: boolean }>`
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  cursor: pointer;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  text-transform: capitalize;
  background-color: ${props => props.isActive ? theme.colors.primary[500] + '20' : 'transparent'};
  color: ${props => props.isActive ? theme.colors.primary[400] : theme.colors.text.secondary};
  transition: ${theme.transitions.normal};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};

  &:hover {
    background-color: ${props => props.isActive ? theme.colors.primary[500] + '30' : theme.colors.background.elevated};
    color: ${theme.colors.text.primary};
  }

  &:first-child {
    border-radius: ${theme.borderRadius.xl} ${theme.borderRadius.xl} 0 0;
  }

  &:last-child {
    border-radius: 0 0 ${theme.borderRadius.xl} ${theme.borderRadius.xl};
  }
`;

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 0;
  margin: 0;
`;

const WelcomeContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 64px);
  padding: ${theme.spacing[8]};
  text-align: center;
`;

const WelcomeCard = styled(Card)`
  max-width: 600px;
  width: 100%;
  text-align: center;
`;

const WelcomeTitle = styled.h1`
  font-size: ${theme.typography.fontSize['4xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  background: linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.secondary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const WelcomeSubtitle = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[8]};
  line-height: ${theme.typography.lineHeight.relaxed};
`;

const InputContainer = styled.div`
  margin-bottom: ${theme.spacing[6]};
  width: 100%;
`;

const CommandsSection = styled.div`
  margin-top: ${theme.spacing[8]};
  padding-top: ${theme.spacing[6]};
  border-top: 1px solid ${theme.colors.border.tertiary};
`;

const CommandsTitle = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[4]};
`;

const CommandsList = styled.div`
  display: grid;
  gap: ${theme.spacing[2]};
  text-align: left;
`;

const CommandItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  padding: ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  background: rgba(255, 255, 255, 0.05);
  font-family: ${theme.typography.fontFamily.mono.join(', ')};
  font-size: ${theme.typography.fontSize.sm};
`;

const CommandKey = styled.code`
  background: ${theme.colors.primary[500]};
  color: ${theme.colors.text.inverse};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.base};
  font-weight: ${theme.typography.fontWeight.medium};
  min-width: 24px;
  text-align: center;
`;

const CommandDescription = styled.span`
  color: ${theme.colors.text.secondary};
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
    <WelcomeContainer>
      <WelcomeCard variant="glass" padding="xl">
        <WelcomeTitle>Vito Safe Wallet</WelcomeTitle>
        <WelcomeSubtitle>
          Secure multi-signature wallet interface for Ethereum and EVM networks.
          Connect your Safe wallet to manage assets, transactions, and settings.
        </WelcomeSubtitle>

        <InputContainer>
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
        </InputContainer>

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

        <CommandsSection>
          <CommandsTitle>Keyboard Shortcuts</CommandsTitle>
          <CommandsList>
            <CommandItem>
              <CommandKey>:c</CommandKey>
              <CommandDescription>Connect to Safe wallet</CommandDescription>
            </CommandItem>
            <CommandItem>
              <CommandKey>:help</CommandKey>
              <CommandDescription>Show help information</CommandDescription>
            </CommandItem>
            <CommandItem>
              <CommandKey>:</CommandKey>
              <CommandDescription>Enter command mode</CommandDescription>
            </CommandItem>
          </CommandsList>
        </CommandsSection>
      </WelcomeCard>
    </WelcomeContainer>
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
              <Badge variant="primary" size="sm" dot />
              Ethereum
            </NetworkOption>
            <NetworkOption
              isActive={network === 'sepolia'}
              onClick={() => selectNetwork('sepolia')}
            >
              <Badge variant="warning" size="sm" dot />
              Sepolia
            </NetworkOption>
            <NetworkOption
              isActive={network === 'arbitrum'}
              onClick={() => selectNetwork('arbitrum')}
            >
              <Badge variant="info" size="sm" dot />
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
