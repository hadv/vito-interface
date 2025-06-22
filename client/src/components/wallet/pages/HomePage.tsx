import React, { useState } from 'react';
import styled from 'styled-components';
// import { Asset, Transaction } from '../types';
import { formatWalletAddress } from '@utils';
import { theme } from '../../../theme';
import { Card } from '../../ui';
import TransactionModal from '../components/TransactionModal';

const Container = styled.div`
  padding: 0;
  height: 100%;
  overflow-y: auto;
`;

const WelcomeSection = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const Heading = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  color: ${theme.colors.primary[400]};
`;

const InfoText = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[6]};
  line-height: ${theme.typography.lineHeight.relaxed};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: ${theme.spacing[6]};
  margin-bottom: ${theme.spacing[8]};
`;

const StatCard = styled(Card)`
  text-align: center;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: ${theme.colors.primary[500]};
  }
`;

const StatValue = styled.div`
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[2]};
`;

const StatLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: ${theme.typography.fontWeight.medium};
`;

const QuickActionsSection = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const SectionTitle = styled.h2`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[4]};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${theme.spacing[4]};
`;

const ActionCard = styled(Card)`
  cursor: pointer;
  text-align: center;
  transition: ${theme.transitions.normal};

  &:hover {
    transform: translateY(-4px);
    box-shadow: ${theme.shadows.xl};
  }
`;

const ActionIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.borderRadius.full};
  background: linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${theme.spacing[3]};
  color: ${theme.colors.text.inverse};
`;

const ActionTitle = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
`;

const ActionDescription = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.tertiary};
`;

// Remove old styled components - they will be replaced with new modern ones

// Remove old components

interface HomePageProps {
  walletAddress: string;
  ensName?: string;
  network: string;
  onTransactionCreated?: (transaction: any) => void;
}

// Mock data - In a real app these would be fetched from an API
// const mockAssets: Asset[] = [
//   { symbol: 'ETH', name: 'Ethereum', balance: '1.23', value: '$2,460', type: 'native' },
//   { symbol: 'USDC', name: 'USD Coin', balance: '1,000', value: '$1,000', type: 'erc20' },
//   { symbol: 'UNI', name: 'Uniswap', balance: '50', value: '$450', type: 'erc20' },
// ];

// const mockPendingTransactions: Transaction[] = [
//   {
//     id: 'tx1',
//     from: '0x1234567890abcdef1234567890abcdef12345678',
//     to: '0xabcdef1234567890abcdef1234567890abcdef12',
//     amount: '0.5',
//     status: 'pending',
//     timestamp: Date.now() - 3600000,
//     type: 'send',
//     token: 'ETH'
//   },
//   {
//     id: 'tx2',
//     from: '0xfedcba0987654321fedcba0987654321fedcba09',
//     to: '0x1234567890abcdef1234567890abcdef12345678',
//     amount: '100',
//     status: 'pending',
//     timestamp: Date.now() - 7200000,
//     type: 'receive',
//     token: 'USDC'
//   }
// ];

const HomePage: React.FC<HomePageProps> = ({ walletAddress, ensName, network, onTransactionCreated }) => {
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  const handleSendETHClick = () => {
    setIsTransactionModalOpen(true);
  };

  const handleTransactionCreated = (transaction: any) => {
    if (onTransactionCreated) {
      onTransactionCreated(transaction);
    }
  };

  const quickActions = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" clipRule="evenodd" d="M13.6819 10.4036C13.0879 10.4043 12.603 9.91941 12.6038 9.32544L12.6038 5.83327L5.29387 13.1432C4.87451 13.5625 4.18827 13.5625 3.76891 13.1432C3.34878 12.723 3.34955 12.0376 3.76891 11.6182L11.0788 4.30831L7.58589 4.30755C6.99268 4.30755 6.50774 3.82261 6.50774 3.2294C6.50774 2.63619 6.99268 2.15126 7.58589 2.15126L13.6819 2.15202C13.7719 2.15049 13.8527 2.18252 13.9358 2.2031C13.9869 2.21607 14.0403 2.21454 14.0906 2.23437C14.1356 2.2519 14.1707 2.28698 14.2111 2.31214C14.4162 2.43032 14.5862 2.60188 14.6777 2.82148C14.6968 2.86951 14.6953 2.92136 14.7075 2.97168C14.7296 3.05632 14.7601 3.13714 14.7601 3.23017L14.7601 9.32544C14.7601 9.91865 14.2751 10.4036 13.6819 10.4036Z" fill="currentColor" />
        </svg>
      ),
      title: 'Send ETH',
      description: 'Transfer native Ethereum to other addresses'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M8 19L8 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 19L5 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 19L11 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 5L16 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 5L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M16 5L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'View Transactions',
      description: 'Browse transaction history'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 14V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M8 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M16 10V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      ),
      title: 'Manage Assets',
      description: 'View and manage your tokens'
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1712 14.08 20.83V21C14.08 21.5523 13.8693 22.0823 13.4942 22.4574C13.1191 22.8325 12.5891 23.0433 12.0367 23.0433C11.4843 23.0433 10.9543 22.8325 10.5792 22.4574C10.2041 22.0823 9.99333 21.5523 9.99333 21V20.91C9.98134 20.2322 9.55389 19.6331 8.92 19.39C8.30293 19.1177 7.58225 19.2483 7.1 19.72L7.04 19.78C6.66495 20.1556 6.15585 20.3666 5.625 20.3666C5.09415 20.3666 4.58505 20.1556 4.21 19.78C3.83439 19.4049 3.62335 18.8958 3.62335 18.365C3.62335 17.8342 3.83439 17.3251 4.21 16.95L4.27 16.89C4.74171 16.4078 4.87231 15.6871 4.6 15.07C4.34094 14.4655 3.74876 14.0726 3.09 14.07H3C2.44772 14.07 1.91774 13.8593 1.54265 13.4842C1.16756 13.1091 0.956787 12.5791 0.956787 12.0267C0.956787 11.4743 1.16756 10.9443 1.54265 10.5692C1.91774 10.1941 2.44772 9.98333 3 9.98333H3.09C3.76784 9.97134 4.36689 9.54389 4.61 8.91C4.88231 8.29293 4.75171 7.57225 4.28 7.09L4.22 7.03C3.84439 6.65495 3.63335 6.14585 3.63335 5.615C3.63335 5.08415 3.84439 4.57505 4.22 4.2C4.59505 3.82439 5.10415 3.61335 5.635 3.61335C6.16585 3.61335 6.67495 3.82439 7.05 4.2L7.11 4.26C7.59225 4.73171 8.31293 4.86231 8.93 4.59C9.5345 4.33094 9.92743 3.73876 9.93 3.08V3C9.93 2.44772 10.1407 1.91774 10.5158 1.54265C10.8909 1.16756 11.4209 0.956787 11.9733 0.956787C12.5257 0.956787 13.0557 1.16756 13.4308 1.54265C13.8059 1.91774 14.0167 2.44772 14.0167 3V3.09C14.0193 3.74876 14.4122 4.34094 15.0167 4.6C15.6338 4.87231 16.3545 4.74171 16.8367 4.27L16.8967 4.21C17.2718 3.83439 17.7809 3.62335 18.3117 3.62335C18.8425 3.62335 19.3516 3.83439 19.7267 4.21C20.1023 4.58505 20.3134 5.09415 20.3134 5.625C20.3134 6.15585 20.1023 6.66495 19.7267 7.04L19.6667 7.1C19.195 7.58225 19.0644 8.30293 19.3367 8.92C19.5958 9.52446 20.1878 9.91739 20.8467 9.92H21C21.5523 9.92 22.0823 10.1307 22.4574 10.5058C22.8325 10.8809 23.0433 11.4109 23.0433 11.9633C23.0433 12.5157 22.8325 13.0457 22.4574 13.4208C22.0823 13.7959 21.5523 14.0067 21 14.0067H20.91C20.2512 14.0093 19.6591 14.4022 19.4 15.0067V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Settings',
      description: 'Configure wallet preferences'
    }
  ];

  return (
    <Container>
      <WelcomeSection>
        <Heading>Vito Wallet Dashboard</Heading>
        <InfoText>
          Welcome to your Vito multi-signature wallet. Secure, decentralized, and fully under your control.
        </InfoText>

        <StatsGrid>
          <StatCard variant="elevated" padding="lg">
            <StatValue>Multi-Sig</StatValue>
            <StatLabel>Wallet Type</StatLabel>
          </StatCard>

          <StatCard variant="elevated" padding="lg">
            <StatValue>{network}</StatValue>
            <StatLabel>Network</StatLabel>
          </StatCard>

          <StatCard variant="elevated" padding="lg">
            <StatValue>
              {ensName ? ensName : formatWalletAddress(walletAddress)}
            </StatValue>
            <StatLabel>Wallet Address</StatLabel>
          </StatCard>
        </StatsGrid>
      </WelcomeSection>

      <QuickActionsSection>
        <SectionTitle>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Quick Actions
        </SectionTitle>

        <QuickActionsGrid>
          {quickActions.map((action, index) => (
            <ActionCard
              key={index}
              variant="glass"
              padding="lg"
              hover
              onClick={index === 0 ? handleSendETHClick : undefined}
            >
              <ActionIcon>{action.icon}</ActionIcon>
              <ActionTitle>{action.title}</ActionTitle>
              <ActionDescription>{action.description}</ActionDescription>
            </ActionCard>
          ))}
        </QuickActionsGrid>
      </QuickActionsSection>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onTransactionCreated={handleTransactionCreated}
        fromAddress={walletAddress}
        preSelectedAsset={{
          type: 'native',
          symbol: 'ETH',
          name: 'Ethereum',
          balance: '0',
          value: '0',
          decimals: 18
        }}
      />
    </Container>
  );
};

export default HomePage; 