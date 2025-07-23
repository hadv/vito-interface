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

const ActionButton = styled.button`
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[600]};
  color: ${theme.colors.neutral[300]};
  cursor: pointer;
  padding: ${theme.spacing[2]};
  border-radius: ${theme.borderRadius.md};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  transition: all 0.2s ease;

  &:hover {
    background: ${theme.colors.neutral[700]};
    border-color: ${theme.colors.neutral[500]};
    color: ${theme.colors.neutral[200]};
    transform: translateY(-1px);
  }

  &.edit {
    &:hover {
      background: #1e3a8a;
      border-color: #3b82f6;
      color: #93c5fd;
    }
  }

  &.delete {
    &:hover {
      background: #7f1d1d;
      border-color: #b91c1c;
      color: #fca5a5;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const ConnectButton = styled(Button)`
  background: ${theme.colors.primary[600]};
  border-color: ${theme.colors.primary[600]};
  color: white;
  font-weight: ${theme.typography.fontWeight.medium};

  &:hover {
    background: ${theme.colors.primary[700]};
    border-color: ${theme.colors.primary[700]};
    transform: translateY(-1px);
  }
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



const BottomActions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: ${theme.spacing[6]};
  padding-top: ${theme.spacing[4]};
  border-top: 1px solid ${theme.colors.neutral[800]};
  gap: ${theme.spacing[4]};
`;

const SecondaryButton = styled.button`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.neutral[400]};
  background: transparent;
  border: 1px solid ${theme.colors.neutral[700]};
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.md};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.colors.neutral[200]};
    border-color: ${theme.colors.neutral[600]};
    background: ${theme.colors.neutral[800]};
    transform: translateY(-1px);
  }

  &.destructive {
    &:hover {
      color: #fca5a5;
      border-color: #b91c1c;
      background: #7f1d1d;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const PrimaryButton = styled(Button)`
  background: ${theme.colors.primary[600]};
  border-color: ${theme.colors.primary[600]};
  color: white;
  font-weight: ${theme.typography.fontWeight.medium};
  padding: ${theme.spacing[3]} ${theme.spacing[6]};

  &:hover {
    background: ${theme.colors.primary[700]};
    border-color: ${theme.colors.primary[700]};
    transform: translateY(-1px);
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
                          <WalletName>{wallet.name}</WalletName>
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
                      <ActionButton
                        className="edit"
                        onClick={(e) => handleEditName(wallet, e)}
                        title="Edit wallet name"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </ActionButton>
                      <ActionButton
                        className="delete"
                        onClick={(e) => handleRemoveWallet(wallet, e)}
                        title="Remove wallet from history"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18"/>
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          <line x1="10" x2="10" y1="11" y2="17"/>
                          <line x1="14" x2="14" y1="11" y2="17"/>
                        </svg>
                      </ActionButton>
                      <ConnectButton
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnectWallet(wallet);
                        }}
                      >
                        Connect
                      </ConnectButton>
                    </WalletActions>
                  </WalletItem>
                );
              })}
            </WalletsList>

            <BottomActions>
              <SecondaryButton
                className="destructive"
                onClick={handleClearAll}
                title="Clear all wallet history"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                  <line x1="10" x2="10" y1="11" y2="17"/>
                  <line x1="14" x2="14" y1="11" y2="17"/>
                </svg>
                Clear All History
              </SecondaryButton>

              <PrimaryButton
                onClick={onAddNew}
                size="lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: theme.spacing[2] }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8"/>
                  <path d="M8 12h8"/>
                </svg>
                Add Safe Wallet
              </PrimaryButton>
            </BottomActions>
          </>
        ) : (
          <EmptyState>
            <EmptyStateIcon>🔒</EmptyStateIcon>
            <EmptyStateText>
              No recent Safe wallets found
            </EmptyStateText>
            <p>Connect to your first Safe wallet to get started</p>
            <div style={{ marginTop: theme.spacing[6] }}>
              <PrimaryButton
                onClick={onAddNew}
                size="lg"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: theme.spacing[2] }}>
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 8v8"/>
                  <path d="M8 12h8"/>
                </svg>
                Add Safe Wallet
              </PrimaryButton>
            </div>
          </EmptyState>
        )}
      </ContentCard>
    </Container>
  );
};

export default RecentSafeWalletsPage;
