import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { createSafeWallet, connectSafeWallet } from '@models/SafeWallet';
import { walletConnectionService } from '../../services/WalletConnectionService';
import { theme } from '../../theme';

// Import refactored components
import MenuItem from './components/MenuItem';
import NetworkBadge from './components/NetworkBadge';
import WalletHeader from './components/WalletHeader';
import QRCodeModal from './components/QRCodeModal';
import SignerConnectionBanner from './components/SignerConnectionBanner';
import NetworkSwitchingBanner from './components/NetworkSwitchingBanner';
import SafeTxPoolWarningBanner from './components/SafeTxPoolWarningBanner';

// Import page components
import HomePage from './pages/HomePage';
import AssetsPage from './pages/AssetsPage';
import TransactionsPage from './pages/TransactionsPage';
import SettingsPage from './pages/SettingsPage';

// Import types
import { Asset, Transaction, MenuSection, WalletPageProps } from './types';

// Menu Icons
const HomeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 2L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AssetsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 14V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 14V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 14V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 10V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 10V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 10V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const TransactionsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 19L8 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 19L5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 19L11 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    
    <path d="M16 5L16 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M16 5L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 5L19 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1712 14.08 20.83V21C14.08 21.5523 13.8693 22.0823 13.4942 22.4574C13.1191 22.8325 12.5891 23.0433 12.0367 23.0433C11.4843 23.0433 10.9543 22.8325 10.5792 22.4574C10.2041 22.0823 9.99333 21.5523 9.99333 21V20.91C9.98134 20.2322 9.55389 19.6331 8.92 19.39C8.30293 19.1177 7.58225 19.2483 7.1 19.72L7.04 19.78C6.66495 20.1556 6.15585 20.3666 5.625 20.3666C5.09415 20.3666 4.58505 20.1556 4.21 19.78C3.83439 19.4049 3.62335 18.8958 3.62335 18.365C3.62335 17.8342 3.83439 17.3251 4.21 16.95L4.27 16.89C4.74171 16.4078 4.87231 15.6871 4.6 15.07C4.34094 14.4655 3.74876 14.0726 3.09 14.07H3C2.44772 14.07 1.91774 13.8593 1.54265 13.4842C1.16756 13.1091 0.956787 12.5791 0.956787 12.0267C0.956787 11.4743 1.16756 10.9443 1.54265 10.5692C1.91774 10.1941 2.44772 9.98333 3 9.98333H3.09C3.76784 9.97134 4.36689 9.54389 4.61 8.91C4.88231 8.29293 4.75171 7.57225 4.28 7.09L4.22 7.03C3.84439 6.65495 3.63335 6.14585 3.63335 5.615C3.63335 5.08415 3.84439 4.57505 4.22 4.2C4.59505 3.82439 5.10415 3.61335 5.635 3.61335C6.16585 3.61335 6.67495 3.82439 7.05 4.2L7.11 4.26C7.59225 4.73171 8.31293 4.86231 8.93 4.59C9.5345 4.33094 9.92743 3.73876 9.93 3.08V3C9.93 2.44772 10.1407 1.91774 10.5158 1.54265C10.8909 1.16756 11.4209 0.956787 11.9733 0.956787C12.5257 0.956787 13.0557 1.16756 13.4308 1.54265C13.8059 1.91774 14.0167 2.44772 14.0167 3V3.09C14.0193 3.74876 14.4122 4.34094 15.0167 4.6C15.6338 4.87231 16.3545 4.74171 16.8367 4.27L16.8967 4.21C17.2718 3.83439 17.7809 3.62335 18.3117 3.62335C18.8425 3.62335 19.3516 3.83439 19.7267 4.21C20.1023 4.58505 20.3134 5.09415 20.3134 5.625C20.3134 6.15585 20.1023 6.66495 19.7267 7.04L19.6667 7.1C19.195 7.58225 19.0644 8.30293 19.3367 8.92C19.5958 9.52446 20.1878 9.91739 20.8467 9.92H21C21.5523 9.92 22.0823 10.1307 22.4574 10.5058C22.8325 10.8809 23.0433 11.4109 23.0433 11.9633C23.0433 12.5157 22.8325 13.0457 22.4574 13.4208C22.0823 13.7959 21.5523 14.0067 21 14.0067H20.91C20.2512 14.0093 19.6591 14.4022 19.4 15.0067V15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Layout components
const WalletPageLayout = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  position: relative;
  top: 0;
`;

const LeftSidebar = styled.div`
  width: 320px;
  background: linear-gradient(180deg, ${theme.colors.background.card} 0%, ${theme.colors.background.secondary} 100%);
  border-right: 1px solid ${theme.colors.border.tertiary};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  margin: 0;
  padding: 0;
  position: relative;
  left: 0;
  top: 0;
  box-sizing: border-box;
  backdrop-filter: blur(10px);
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing[6]};
  background: ${theme.colors.background.primary};
`;

const WalletPage: React.FC<WalletPageProps> = ({ 
  walletAddress = '0x1234567890123456789012345678901234567890',
  ensName = '',
  network = 'ethereum',
  isLoadingEns = false
}) => {
  const [activeSection, setActiveSection] = useState<MenuSection>('home');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);

  const handleTransactionCreated = (transaction: any) => {
    // Add the new transaction to the list
    setTransactions(prev => [transaction, ...prev]);
  };
  const [currentNetwork, setCurrentNetwork] = useState(network);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Update currentNetwork when prop changes
  useEffect(() => {
    setCurrentNetwork(network);
  }, [network]);

  // Toggle QR code modal
  const toggleQRCode = () => {
    setShowQRCode(!showQRCode);
  };

  // Initialize Safe wallet data
  useEffect(() => {
    const loadWallet = async () => {
      setIsLoading(true);
      try {
        // First connect to Safe wallet if not already connected
        if (walletAddress && !walletConnectionService.isConnected()) {
          await connectSafeWallet(walletAddress, network || 'ethereum');
        }

        // Load wallet data from Safe services
        const wallet = await createSafeWallet();

        // Create assets based on Safe balance (simplified for now)
        const mockAssets: Asset[] = [
          {
            symbol: 'ETH',
            name: 'Ethereum',
            balance: wallet.accounts[0]?.balance || '0',
            value: `$${(parseFloat(wallet.accounts[0]?.balance || '0') * 2000).toFixed(2)}`, // Mock ETH price
            type: 'native'
          },
          // TODO: Add ERC20 token detection and balances
          {
            symbol: 'USDC',
            name: 'USD Coin',
            balance: '0',
            value: '$0',
            type: 'erc20'
          }
        ];

        setAssets(mockAssets);
        setTransactions(wallet.transactions);
      } catch (error) {
        console.error('Error loading Safe wallet:', error);
        // Fall back to empty state on error
        setAssets([]);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (walletAddress) {
      loadWallet();
    }
  }, [walletAddress, network]);

  // Render appropriate content based on active section
  const renderContent = () => {
    switch (activeSection) {
      case 'home':
        return (
          <HomePage
            walletAddress={walletAddress}
            ensName={ensName}
            network={currentNetwork}
            onTransactionCreated={handleTransactionCreated}
          />
        );
      case 'assets':
        return (
          <AssetsPage 
            assets={assets}
            isLoading={isLoading}
          />
        );
      case 'transactions':
        return (
          <TransactionsPage 
            transactions={transactions}
            isLoading={isLoading}
          />
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <WalletPageLayout>
      <LeftSidebar ref={menuRef}>
        <NetworkBadge network={currentNetwork} />
        
        <WalletHeader
          walletAddress={walletAddress}
          ensName={ensName}
          network={currentNetwork}
          isLoadingEns={isLoadingEns}
          onShowQRCode={toggleQRCode}
        />
        
        <MenuItem 
          active={activeSection === 'home'} 
          onClick={() => setActiveSection('home')}
          icon={<HomeIcon />}
        >
          Home
        </MenuItem>
        <MenuItem 
          active={activeSection === 'assets'} 
          onClick={() => setActiveSection('assets')}
          icon={<AssetsIcon />}
        >
          Assets
        </MenuItem>
        <MenuItem 
          active={activeSection === 'transactions'} 
          onClick={() => setActiveSection('transactions')}
          icon={<TransactionsIcon />}
        >
          Transactions
        </MenuItem>
        <MenuItem 
          active={activeSection === 'settings'} 
          onClick={() => setActiveSection('settings')}
          icon={<SettingsIcon />}
        >
          Settings
        </MenuItem>
      </LeftSidebar>
      
      <MainContent>
        <NetworkSwitchingBanner targetNetwork={currentNetwork} />
        <SafeTxPoolWarningBanner
          network={currentNetwork}
          onOpenSettings={() => setActiveSection('settings')}
        />
        <SignerConnectionBanner />
        {renderContent()}
      </MainContent>
      
      <QRCodeModal
        isOpen={showQRCode}
        walletAddress={walletAddress}
        onClose={toggleQRCode}
      />
    </WalletPageLayout>
  );
};

export default WalletPage; 