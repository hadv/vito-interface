import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { useAddressBook } from '../../../hooks/useAddressBook';
import { AddressBookEntry } from '../../../services/AddressBookService';
import { Card } from '../../ui';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressBookTransactionModal from '../components/AddressBookTransactionModal';
import AddressDisplay from '../components/AddressDisplay';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import WalletConnectionModal from '../../ui/WalletConnectionModal';

const Container = styled.div`
  padding: 0;
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const Heading = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  color: ${theme.colors.primary[400]};
`;

const SubHeading = styled.p`
  font-size: ${theme.typography.fontSize.lg};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[6]};
`;

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  flex: 1;
  max-width: 500px;
`;

const AddButton = styled(Button)`
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  border: none;
  border-radius: ${theme.borderRadius.lg};
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  border: 1px solid rgba(14, 165, 233, 0.4);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }

  &:hover {
    background: linear-gradient(135deg, #0284c7, #0369a1);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(14, 165, 233, 0.4);
    border-color: rgba(14, 165, 233, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
  }
`;

const EntriesGrid = styled.div`
  display: grid;
  gap: ${theme.spacing[4]};
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[12]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.lg};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[12]};
  color: ${theme.colors.text.tertiary};
`;

const EmptyStateIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.background.elevated};
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${theme.spacing[4]};
  color: ${theme.colors.text.muted};
`;

const EmptyStateTitle = styled.h3`
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[2]};
`;

const EmptyStateDescription = styled.p`
  font-size: ${theme.typography.fontSize.base};
  color: ${theme.colors.text.muted};
  margin-bottom: ${theme.spacing[6]};
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${theme.spacing[8]} ${theme.spacing[4]};
  color: ${theme.colors.status.error};
`;

const ErrorMessage = styled.p`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.sm};
`;

const EntriesCount = styled.div`
  margin-bottom: ${theme.spacing[4]};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

// Address Book Entry Card Component
const AddressBookEntryCard = styled(Card)`
  transition: ${theme.transitions.normal};
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${theme.shadows.xl};
  }
`;

const EntryItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[4]};
`;

const EntryIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: ${theme.borderRadius.full};
  background: linear-gradient(135deg, ${theme.colors.primary[500]}, ${theme.colors.secondary[500]});
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.inverse};
  font-weight: ${theme.typography.fontWeight.bold};
  font-size: ${theme.typography.fontSize.lg};
  box-shadow: ${theme.shadows.md};
  border: 2px solid rgba(255, 255, 255, 0.1);
`;

const EntryInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const EntryName = styled.div`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
  word-break: break-word;
`;

const EntryAddressContainer = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const EntryActions = styled.div`
  display: flex;
  gap: ${theme.spacing[2]};
  margin-left: ${theme.spacing[4]};
`;

interface AddressBookPageProps {
  network?: string;
}

const AddressBookPage: React.FC<AddressBookPageProps> = ({ network = 'ethereum' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalOperation, setModalOperation] = useState<'add' | 'remove'>('add');
  const [editingEntry, setEditingEntry] = useState<AddressBookEntry | null>(null);
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);

  // Get current Safe address and wallet connection state
  const [safeAddress, setSafeAddress] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [showWalletModal, setShowWalletModal] = useState(false);

  useEffect(() => {
    const updateConnectionState = () => {
      const state = walletConnectionService.getConnectionState();
      setSafeAddress(state.safeAddress || null);
      setConnectionState(state);
    };

    updateConnectionState();

    // Listen for connection state changes
    const unsubscribe = walletConnectionService.onConnectionStateChange(updateConnectionState);

    return unsubscribe;
  }, []);

  const {
    entries,
    loading,
    error,
    refresh,
    clearError
  } = useAddressBook({
    network,
    safeAddress: safeAddress || undefined,
    autoRefresh: true
  });

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return entries;
    }

    const query = searchQuery.toLowerCase().trim();
    return entries.filter(entry =>
      entry.name.toLowerCase().includes(query) ||
      entry.walletAddress.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  const existingAddresses = useMemo(() => {
    return entries.map(entry => entry.walletAddress);
  }, [entries]);

  // Render address book entry item
  const renderAddressBookEntry = (entry: AddressBookEntry, isSelected: boolean, isFocused: boolean) => (
    <AddressBookEntryCard
      variant="elevated"
      padding="lg"
      className={isSelected ? 'selected' : ''}
    >
      <EntryItem>
        <EntryIcon>
          {entry.name.charAt(0).toUpperCase()}
        </EntryIcon>
        <EntryInfo>
          <EntryName>{entry.name}</EntryName>
          <EntryAddressContainer>
            <AddressDisplay
              address={entry.walletAddress}
              showCopy={true}
              network={network}
              truncate={true}
              truncateLength={6}
            />
          </EntryAddressContainer>
        </EntryInfo>
        <EntryActions>
          <Button
            variant="secondary"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleEditEntry(entry);
            }}
            disabled={removingAddress === entry.walletAddress || !isSignerConnected}
            allowClickWhenDisabled={!isSignerConnected}
            className={!isSignerConnected ? 'opacity-50' : ''}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              handleRemoveEntry(entry);
            }}
            disabled={removingAddress === entry.walletAddress || !isSignerConnected}
            loading={removingAddress === entry.walletAddress}
            allowClickWhenDisabled={!isSignerConnected && removingAddress !== entry.walletAddress}
            className={!isSignerConnected ? 'opacity-50' : ''}
            data-1p-ignore="true"
            data-lpignore="true"
          >
            Remove
          </Button>
        </EntryActions>
      </EntryItem>
    </AddressBookEntryCard>
  );

  // Check if signer wallet is connected
  const isSignerConnected = connectionState.signerConnected && !connectionState.readOnlyMode;

  // Handle wallet connection requirement
  const handleWalletConnectionRequired = (action: () => void) => {
    if (isSignerConnected) {
      action();
    } else {
      setShowWalletModal(true);
    }
  };

  const handleAddEntry = () => {
    handleWalletConnectionRequired(() => {
      setEditingEntry(null);
      setModalOperation('add');
      setIsModalOpen(true);
    });
  };

  const handleEditEntry = (entry: AddressBookEntry) => {
    handleWalletConnectionRequired(() => {
      setEditingEntry(entry);
      setModalOperation('add');
      setIsModalOpen(true);
    });
  };

  const handleRemoveEntry = (entry: AddressBookEntry) => {
    handleWalletConnectionRequired(() => {
      setEditingEntry(entry);
      setModalOperation('remove');
      setIsModalOpen(true);
    });
  };

  const handleTransactionCreated = () => {
    // Refresh the entries after transaction is created
    refresh();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
    setRemovingAddress(null);
  };

  // Handle wallet selection from modal
  const handleWalletSelect = async (walletType: string) => {
    try {
      if (walletType === 'metamask') {
        await walletConnectionService.connectSignerWallet();
      } else if (walletType === 'rabby') {
        await walletConnectionService.connectRabbyWallet();
      } else if (walletType === 'phantom') {
        await walletConnectionService.connectPhantomWallet();
      } else if (walletType === 'walletconnect') {
        // WalletConnect connection is handled by the WalletConnectModal
        // This is called after successful connection
      } else if (walletType === 'web3auth') {
        await walletConnectionService.connectWeb3AuthSigner();
      }
      setShowWalletModal(false);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // Keep modal open on error
    }
  };

  if (!safeAddress) {
    return (
      <Container>
        <Header>
          <Heading>Address Book</Heading>
          <SubHeading>Manage your frequently used addresses</SubHeading>
        </Header>
        <ErrorState>
          <ErrorMessage>
            Please connect to a Safe wallet to manage your address book.
          </ErrorMessage>
        </ErrorState>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container>
        <Header>
          <Heading>Address Book</Heading>
          <SubHeading>Manage your frequently used addresses</SubHeading>
        </Header>
        <LoadingState>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}>
            <div style={{
              width: '20px',
              height: '20px',
              border: `2px solid ${theme.colors.primary[500]}`,
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading your address book...
          </div>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Heading>Address Book</Heading>
          <SubHeading>Manage your frequently used addresses</SubHeading>
        </Header>
        <ErrorState>
          <ErrorMessage>{error}</ErrorMessage>
          <Button variant="secondary" onClick={() => { clearError(); refresh(); }}>
            Try Again
          </Button>
        </ErrorState>
      </Container>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Container>
        <Header>
          <Heading>Address Book</Heading>
          <SubHeading>Manage your frequently used addresses</SubHeading>
        </Header>

        <ActionBar>
          <SearchContainer>
            <Input
              type="text"
              placeholder="Search by name or address..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </SearchContainer>
          <AddButton
            onClick={handleAddEntry}
            disabled={!isSignerConnected}
            allowClickWhenDisabled={!isSignerConnected}
            className={!isSignerConnected ? 'opacity-50' : ''}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Entry
          </AddButton>
        </ActionBar>

        <EmptyState>
          <EmptyStateIcon>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M16 4H18C18.5523 4 19 4.44772 19 5V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M8 17C8 15.8954 9.79086 15 12 15C14.2091 15 16 15.8954 16 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </EmptyStateIcon>
          <EmptyStateTitle>No Address Book Entries</EmptyStateTitle>
          <EmptyStateDescription>
            Your address book is empty. Add frequently used addresses to make transactions easier and faster.
          </EmptyStateDescription>
        </EmptyState>

        <AddressBookTransactionModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onTransactionCreated={handleTransactionCreated}
          operation={modalOperation}
          safeAddress={safeAddress}
          editEntry={editingEntry}
          existingAddresses={existingAddresses}
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Heading>Address Book</Heading>
        <SubHeading>
          Manage your frequently used addresses. Total entries: {entries.length}
        </SubHeading>
      </Header>

      <ActionBar>
        <SearchContainer>
          <Input
            type="text"
            placeholder="Search by name or address..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </SearchContainer>
        <AddButton
          onClick={handleAddEntry}
          disabled={!isSignerConnected}
          allowClickWhenDisabled={!isSignerConnected}
          className={!isSignerConnected ? 'opacity-50' : ''}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Add Entry
        </AddButton>
      </ActionBar>

      {filteredEntries.length > 0 && (
        <EntriesCount>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M16 4H18C18.5523 4 19 4.44772 19 5V19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V5C5 4.44772 5.44772 4 6 4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 17C8 15.8954 9.79086 15 12 15C14.2091 15 16 15.8954 16 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          {searchQuery && ` matching "${searchQuery}"`}
        </EntriesCount>
      )}

      {filteredEntries.length === 0 && entries.length > 0 && (
        <EmptyState>
          <EmptyStateIcon>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </EmptyStateIcon>
          <EmptyStateTitle>No Results Found</EmptyStateTitle>
          <EmptyStateDescription>
            No entries match your search query "{searchQuery}". Try a different search term.
          </EmptyStateDescription>
        </EmptyState>
      )}

      <EntriesGrid>
        {filteredEntries.map((entry, index) => (
          <div key={entry.walletAddress} onClick={() => console.log(`Selected ${entry.name} (${entry.walletAddress})`)}>
            {renderAddressBookEntry(entry, false, false)}
          </div>
        ))}
      </EntriesGrid>

      <AddressBookTransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTransactionCreated={handleTransactionCreated}
        operation={modalOperation}
        safeAddress={safeAddress}
        editEntry={editingEntry}
        existingAddresses={existingAddresses}
      />

      {/* Wallet Connection Modal */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletSelect={handleWalletSelect}
      />
    </Container>
  );
};

export default AddressBookPage;
