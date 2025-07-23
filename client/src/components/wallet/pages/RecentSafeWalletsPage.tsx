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
  padding: ${theme.spacing[6]} ${theme.spacing[4]} ${theme.spacing[8]};
  background: #030712;
`;

const ContentCard = styled(Card)`
  width: 100%;
  max-width: 900px;
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
  display: grid;
  gap: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const WalletItem = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${theme.spacing[4]};
  align-items: center;
  padding: ${theme.spacing[5]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.xl};
  background: ${theme.colors.neutral[800]};
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;

  &:hover {
    border-color: ${theme.colors.primary[500]};
    background: ${theme.colors.neutral[700]};
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const WalletInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[3]};
  min-width: 0; /* Allow text truncation */
`;

const WalletHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  margin-bottom: ${theme.spacing[1]};
`;

const WalletName = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.neutral[100]};
  margin: 0;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const EditNameButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.neutral[400]};
  cursor: pointer;
  padding: ${theme.spacing[1]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};

  &:hover {
    color: ${theme.colors.neutral[300]};
    background: ${theme.colors.neutral[700]};
  }
`;

const WalletDetails = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  flex-wrap: wrap;
`;

const NetworkBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  background: ${theme.colors.primary[900]};
  color: ${theme.colors.primary[300]};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  text-transform: capitalize;
  border: 1px solid ${theme.colors.primary[700]};
`;

const LastConnected = styled.span`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.neutral[500]};
  font-weight: ${theme.typography.fontWeight.medium};
`;

const WalletActions = styled.div`
  display: flex;
  gap: ${theme.spacing[2]};
  align-items: center;
  flex-shrink: 0;
`;

const ConnectHint = styled.div`
  position: absolute;
  top: ${theme.spacing[2]};
  right: ${theme.spacing[3]};
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.neutral[500]};
  background: ${theme.colors.neutral[900]};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;

  ${WalletItem}:hover & {
    opacity: 1;
  }
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
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

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

  const handleDoubleClick = (wallet: RecentSafeWallet) => {
    handleConnectWallet(wallet);
  };

  const handleRemoveWallet = (wallet: RecentSafeWallet, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering double-click
    safeWalletStorageService.removeRecentWallet(wallet.address, wallet.network);
    loadRecentWallets();
  };

  const handleClearAll = () => {
    safeWalletStorageService.clearRecentWallets();
    loadRecentWallets();
  };

  const handleEditName = (wallet: RecentSafeWallet, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingWallet(`${wallet.address}-${wallet.network}`);
    setEditingName(wallet.name);
  };

  const handleSaveName = (wallet: RecentSafeWallet) => {
    if (editingName.trim()) {
      safeWalletStorageService.updateWalletName(wallet.address, wallet.network, editingName.trim());
      loadRecentWallets();
    }
    setEditingWallet(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingWallet(null);
    setEditingName('');
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
              {recentWallets.map((wallet) => {
                const walletKey = `${wallet.address}-${wallet.network}`;
                const isEditing = editingWallet === walletKey;

                return (
                  <WalletItem
                    key={walletKey}
                    onDoubleClick={() => handleDoubleClick(wallet)}
                  >
                    <ConnectHint>Double-click to connect</ConnectHint>

                    <WalletInfo>
                      <WalletHeader>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onBlur={() => handleSaveName(wallet)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveName(wallet);
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                            style={{
                              background: theme.colors.neutral[700],
                              border: `1px solid ${theme.colors.primary[500]}`,
                              borderRadius: theme.borderRadius.md,
                              padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                              color: theme.colors.neutral[100],
                              fontSize: theme.typography.fontSize.xl,
                              fontWeight: theme.typography.fontWeight.semibold,
                              width: '100%',
                              outline: 'none'
                            }}
                          />
                        ) : (
                          <>
                            <WalletName>{wallet.name}</WalletName>
                            <EditNameButton
                              onClick={(e) => handleEditName(wallet, e)}
                              title="Edit wallet name"
                            >
                              ✏️
                            </EditNameButton>
                          </>
                        )}
                      </WalletHeader>

                      <WalletDetails>
                        <AddressDisplay
                          address={wallet.address}
                          network={wallet.network}
                          truncate={true}
                          truncateLength={8}
                          showCopy={true}
                          showExplorer={true}
                        />
                        <NetworkBadge>{wallet.network}</NetworkBadge>
                        <LastConnected>
                          Last used {formatLastConnected(wallet.lastConnected)}
                        </LastConnected>
                      </WalletDetails>
                    </WalletInfo>

                    <WalletActions>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleRemoveWallet(wallet, e)}
                      >
                        🗑️
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnectWallet(wallet);
                        }}
                        className="bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600"
                      >
                        Connect
                      </Button>
                    </WalletActions>
                  </WalletItem>
                );
              })}
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
            <p>Connect to your first Safe wallet to get started</p>
            <div style={{ marginTop: theme.spacing[4] }}>
              <Button
                variant="primary"
                size="lg"
                onClick={onAddNew}
                className="bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600"
              >
                Add Safe Wallet
              </Button>
            </div>
          </EmptyState>
        )}

        {recentWallets.length > 0 && (
          <ActionButtons>
            <Button
              variant="primary"
              size="lg"
              onClick={onAddNew}
              className="bg-sky-500 border-sky-500 hover:bg-sky-600 hover:border-sky-600"
            >
              Add Another Safe Wallet
            </Button>
          </ActionButtons>
        )}
      </ContentCard>
    </Container>
  );
};

export default RecentSafeWalletsPage;
