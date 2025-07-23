import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { Button, Card } from '../../ui';
import { safeWalletStorageService, RecentSafeWallet } from '../../../services/SafeWalletStorageService';
import AddressDisplay from '../components/AddressDisplay';

// Types
interface RecentSafeWalletsPageProps {
  onConnectExisting: (wallet: RecentSafeWallet) => void;
  onAddNew: () => void;
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: ${theme.spacing[8]} ${theme.spacing[8]} ${theme.spacing[12]};
  background: #030712;
`;

const ContentCard = styled(Card)`
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: ${theme.spacing[8]};
`;

const Title = styled.h1`
  font-size: ${theme.typography.fontSize['4xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.primary[400]};
  margin-bottom: ${theme.spacing[4]};
`;

const Subtitle = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.neutral[400]};
  margin-bottom: ${theme.spacing[6]};
`;

const WalletsList = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const WalletItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing[6]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  margin-bottom: ${theme.spacing[4]};
  background: ${theme.colors.neutral[800]};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.primary[500]};
    background: ${theme.colors.neutral[700]};
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const WalletInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const WalletName = styled.h3`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.neutral[100]};
  margin: 0;
`;

const WalletDetails = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[4]};
`;

const NetworkBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  background: ${theme.colors.primary[900]};
  color: ${theme.colors.primary[300]};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  text-transform: capitalize;
`;

const LastConnected = styled.span`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.neutral[500]};
`;

const WalletActions = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  align-items: center;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[12]} ${theme.spacing[6]};
  color: ${theme.colors.neutral[500]};
`;

const EmptyStateIcon = styled.div`
  font-size: 4rem;
  margin-bottom: ${theme.spacing[4]};
`;

const EmptyStateText = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  margin-bottom: ${theme.spacing[6]};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing[4]};
  justify-content: center;
  margin-top: ${theme.spacing[6]};
  padding-top: ${theme.spacing[6]};
`;

const ClearAllContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: ${theme.spacing[6]};
  padding-top: ${theme.spacing[4]};
  border-top: 1px solid ${theme.colors.neutral[800]};
`;

const ClearAllButton = styled(Button)`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.neutral[400]};
  background: transparent;
  border: 1px solid ${theme.colors.neutral[700]};
  padding: ${theme.spacing[2]} ${theme.spacing[4]};

  &:hover {
    color: ${theme.colors.neutral[300]};
    border-color: ${theme.colors.neutral[600]};
    background: ${theme.colors.neutral[800]};
  }

  &:active {
    background: ${theme.colors.neutral[700]};
  }
`;

const RecentSafeWalletsPage: React.FC<RecentSafeWalletsPageProps> = ({
  onConnectExisting,
  onAddNew
}) => {
  const [recentWallets, setRecentWallets] = useState<RecentSafeWallet[]>([]);

  useEffect(() => {
    loadRecentWallets();
  }, []);

  const loadRecentWallets = () => {
    const wallets = safeWalletStorageService.getRecentWallets();
    setRecentWallets(wallets);
  };

  const handleConnectWallet = (wallet: RecentSafeWallet) => {
    onConnectExisting(wallet);
  };

  const handleRemoveWallet = (wallet: RecentSafeWallet) => {
    safeWalletStorageService.removeRecentWallet(wallet.address, wallet.network);
    loadRecentWallets();
  };

  const handleClearAll = () => {
    safeWalletStorageService.clearRecentWallets();
    loadRecentWallets();
  };

  const formatLastConnected = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <Container>
      <ContentCard variant="elevated" padding="xl">
        <Header>
          <Title>Your Safe Wallets</Title>
          <Subtitle>
            Connect to a recent Safe wallet or add a new one
          </Subtitle>
        </Header>

        {recentWallets.length > 0 ? (
          <>
            <WalletsList>
              {recentWallets.map((wallet) => (
                <WalletItem key={`${wallet.address}-${wallet.network}`}>
                  <WalletInfo>
                    <WalletName>{wallet.name}</WalletName>
                    <WalletDetails>
                      <AddressDisplay
                        address={wallet.address}
                        network={wallet.network}
                        truncate={true}
                        truncateLength={6}
                        showCopy={false}
                        showExplorer={false}
                      />
                      <NetworkBadge>{wallet.network}</NetworkBadge>
                      <LastConnected>
                        {formatLastConnected(wallet.lastConnected)}
                      </LastConnected>
                    </WalletDetails>
                  </WalletInfo>
                  <WalletActions>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveWallet(wallet)}
                    >
                      Remove
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnectWallet(wallet)}
                      className="bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600"
                    >
                      Connect
                    </Button>
                  </WalletActions>
                </WalletItem>
              ))}
            </WalletsList>

            <ClearAllContainer>
              <ClearAllButton
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
              >
                🗑️ Clear All History
              </ClearAllButton>
            </ClearAllContainer>
          </>
        ) : (
          <EmptyState>
            <EmptyStateIcon>🔒</EmptyStateIcon>
            <EmptyStateText>
              No recent Safe wallets found
            </EmptyStateText>
            <p>Add your first Safe wallet to get started</p>
          </EmptyState>
        )}

        <ActionButtons>
          <Button
            variant="primary"
            size="lg"
            onClick={onAddNew}
            className="bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600"
          >
            Add Safe Wallet
          </Button>
        </ActionButtons>
      </ContentCard>
    </Container>
  );
};

export default RecentSafeWalletsPage;
