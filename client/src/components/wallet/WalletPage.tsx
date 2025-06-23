import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { createSafeWallet, connectSafeWallet } from '@models/SafeWallet';
import { walletConnectionService } from '../../services/WalletConnectionService';
import { theme } from '../../theme';

// Import refactored components
import MenuItem from './components/MenuItem';
import NetworkBadge from './components/NetworkBadge';
import WalletHeader from './components/WalletHeader';
import QRCodeModal from './components/QRCodeModal';

import NetworkSwitchingBanner from './components/NetworkSwitchingBanner';
import SafeTxPoolWarningBanner from './components/SafeTxPoolWarningBanner';
import TransactionModal from './components/TransactionModal';

// Import page components
import HomePage from './pages/HomePage';
import AssetsPage from './pages/AssetsPage';
import TransactionsPage from './pages/TransactionsPage';
import AddressBookPage from './pages/AddressBookPage';
import SettingsPage from './pages/SettingsPage';

// Import types
import { Asset, Transaction, MenuSection, WalletPageProps } from './types';

// Import services
import { TokenService } from '../../services/TokenService';
import { safeWalletService } from '../../services/SafeWalletService';
import { getRpcUrl } from '../../contracts/abis';


// Menu Icons
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 2L21 9.5V20C21 20.5523 20.5523 21 20 21H4C3.44772 21 3 20.5523 3 20V9.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 21V14H15V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AssetsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const TransactionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 19L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 19L5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8 19L11 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

    <path d="M16 5L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 5L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 5L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const AddressBookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 4H18C18.5523 4 19 4.44772 19 5V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 17C8 15.8954 9.79086 15 12 15C14.2091 15 16 15.8954 16 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 21V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
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
  overflow-y: hidden; /* Remove auto scroll - let child components handle scrolling */
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showQRCode, setShowQRCode] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedAssetForSend, setSelectedAssetForSend] = useState<Asset | null>(null);

  const handleTransactionCreated = (transaction: any) => {
    // Add the new transaction to the list
    setTransactions(prev => [transaction, ...prev]);
  };

  const handleSendAsset = (asset: Asset) => {
    setSelectedAssetForSend(asset);
    setIsTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setSelectedAssetForSend(null);
    // Refresh token balances after transaction
    refreshTokenBalances();
  };

  // Function to refresh token balances
  const refreshTokenBalances = async () => {
    if (!walletAddress) return;

    try {
      console.log('🔄 Refreshing token balances...');
      const refreshedAssets = await loadTokenBalances(walletAddress, network || 'ethereum');
      setAssets(refreshedAssets);
      console.log('✅ Token balances refreshed');
    } catch (error) {
      console.error('❌ Error refreshing token balances:', error);
    }
  };

  // Load real token balances for the Safe wallet
  const loadTokenBalances = async (safeAddress: string, network: string): Promise<Asset[]> => {
    try {
      console.log(`🪙 Loading token balances for Safe: ${safeAddress} on ${network}`);

      // Initialize TokenService with the current provider
      const rpcUrl = getRpcUrl(network);
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const tokenService = new TokenService(provider, network);

      // Get ETH balance from Safe info
      const safeInfo = await safeWalletService.getSafeInfo();
      const ethBalance = safeInfo.balance;

      // Start with ETH asset
      const assets: Asset[] = [
        {
          symbol: 'ETH',
          name: 'Ethereum',
          balance: ethBalance,
          value: `$${(parseFloat(ethBalance) * 2000).toFixed(2)}`, // Mock ETH price
          type: 'native'
        }
      ];

      // Get all token balances (known + popular tokens)
      console.log(`🔍 Checking for ERC-20 token balances on ${network}...`);
      console.log(`📍 Safe address: ${safeAddress}`);

      // Debug: Show which tokens we're checking
      const knownTokens = tokenService.getKnownTokens();
      const popularAddresses = tokenService.getPopularTokenAddresses();
      console.log(`🔍 Known tokens from TOKEN_ADDRESSES:`, knownTokens);
      console.log(`🔍 Popular token addresses for ${network}:`, popularAddresses);

      const tokenBalances = await tokenService.getAllTokenBalances(safeAddress);

      console.log(`✅ Found ${tokenBalances.length} tokens with balances`);

      // Add all tokens with balances to assets
      for (const tokenBalance of tokenBalances) {
        // Calculate mock USD value (in a real app, you'd fetch from a price API)
        const symbol = tokenBalance.tokenInfo.symbol.toUpperCase();
        const mockPrice = symbol === 'USDC' || symbol === 'USDT' ? 1 :
                         symbol === 'DAI' ? 1 :
                         symbol === 'WETH' || symbol === 'ETH' ? 2000 :
                         symbol === 'WBTC' || symbol === 'BTC' ? 45000 :
                         symbol === 'UNI' ? 8 :
                         symbol === 'AAVE' ? 85 :
                         symbol === 'LINK' ? 15 : 100;

        const usdValue = parseFloat(tokenBalance.formattedBalance) * mockPrice;

        assets.push({
          symbol: tokenBalance.tokenInfo.symbol,
          name: tokenBalance.tokenInfo.name,
          balance: tokenBalance.formattedBalance,
          value: `$${usdValue.toFixed(2)}`,
          type: 'erc20',
          contractAddress: tokenBalance.tokenInfo.address,
          decimals: tokenBalance.tokenInfo.decimals
        });

        console.log(`💰 ${tokenBalance.tokenInfo.symbol}: ${tokenBalance.formattedBalance} ($${usdValue.toFixed(2)})`);
      }

      console.log(`🎯 Loaded ${assets.length} assets (${assets.length - 1} ERC-20 tokens with balances)`);
      return assets;

    } catch (error) {
      console.error('❌ Error loading token balances:', error);

      // Fallback to ETH only if token loading fails
      try {
        const safeInfo = await safeWalletService.getSafeInfo();
        return [{
          symbol: 'ETH',
          name: 'Ethereum',
          balance: safeInfo.balance,
          value: `$${(parseFloat(safeInfo.balance) * 2000).toFixed(2)}`,
          type: 'native'
        }];
      } catch (fallbackError) {
        console.error('❌ Even ETH balance loading failed:', fallbackError);
        return [];
      }
    }
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

        // Load real token balances for the Safe wallet
        const realAssets = await loadTokenBalances(walletAddress, network || 'ethereum');

        setAssets(realAssets);
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
            onSendAsset={handleSendAsset}
            network={currentNetwork}
          />
        );
      case 'transactions':
        return (
          <TransactionsPage
            safeAddress={walletAddress}
            network={network}
          />
        );
      case 'addressbook':
        return <AddressBookPage network={currentNetwork} />;
      case 'settings':
        return <SettingsPage network={currentNetwork} />;
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
          active={activeSection === 'addressbook'}
          onClick={() => setActiveSection('addressbook')}
          icon={<AddressBookIcon />}
        >
          Address Book
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
        {renderContent()}
      </MainContent>
      
      <QRCodeModal
        isOpen={showQRCode}
        walletAddress={walletAddress}
        network={currentNetwork}
        onClose={toggleQRCode}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={handleCloseTransactionModal}
        onTransactionCreated={handleTransactionCreated}
        fromAddress={walletAddress}
        preSelectedAsset={selectedAssetForSend}
      />
    </WalletPageLayout>
  );
};

export default WalletPage; 