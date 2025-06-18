import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { VitoList } from '@components/vitoUI';
import { theme } from '../../../theme';
import { useAddressBook } from '../../../hooks/useAddressBook';
import { AddressBookEntry } from '../../../services/AddressBookService';
import { Card } from '../../ui';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressBookModal from '../components/AddressBookModal';
import AddressDisplay from '../components/AddressDisplay';
import { walletConnectionService } from '../../../services/WalletConnectionService';

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
  color: ${theme.colors.text.primary};
  background: linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.secondary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  max-width: 400px;
`;

const AddButton = styled(Button)`
  background: linear-gradient(135deg, #10b981, #059669);
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
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  border: 1px solid rgba(16, 185, 129, 0.4);
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
    background: linear-gradient(135deg, #059669, #047857);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    border-color: rgba(16, 185, 129, 0.6);

    &::before {
      left: 100%;
    }
  }

  &:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
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
  const [editingEntry, setEditingEntry] = useState<AddressBookEntry | null>(null);
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);

  // Get current Safe address from wallet connection service
  const [safeAddress, setSafeAddress] = useState<string | null>(null);

  useEffect(() => {
    const updateSafeAddress = () => {
      const connectionState = walletConnectionService.getConnectionState();
      setSafeAddress(connectionState.safeAddress || null);
    };

    updateSafeAddress();

    // Listen for connection state changes
    const unsubscribe = walletConnectionService.onConnectionStateChange(updateSafeAddress);

    return unsubscribe;
  }, []);

  const {
    entries,
    loading,
    error,
    addEntry,
    removeEntry,
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
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleEditEntry(entry);
            }}
            disabled={removingAddress === entry.walletAddress}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              handleRemoveEntry(entry.walletAddress);
            }}
            disabled={removingAddress === entry.walletAddress}
            loading={removingAddress === entry.walletAddress}
          >
            Remove
          </Button>
        </EntryActions>
      </EntryItem>
    </AddressBookEntryCard>
  );

  const handleAddEntry = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const handleEditEntry = (entry: AddressBookEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleRemoveEntry = async (walletAddress: string) => {
    setRemovingAddress(walletAddress);
    try {
      await removeEntry(walletAddress);
    } catch (error) {
      console.error('Error removing entry:', error);
    } finally {
      setRemovingAddress(null);
    }
  };

  const handleSaveEntry = async (walletAddress: string, name: string) => {
    if (editingEntry) {
      // For editing, we need to remove the old entry and add the new one
      // Since we can't change the address, we only update the name
      await addEntry(walletAddress, name);
    } else {
      await addEntry(walletAddress, name);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
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
          <AddButton onClick={handleAddEntry}>
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
          <AddButton onClick={handleAddEntry}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Add Your First Entry
          </AddButton>
        </EmptyState>

        <AddressBookModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveEntry}
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
        <AddButton onClick={handleAddEntry}>
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
        <VitoList
          items={filteredEntries}
          renderItem={renderAddressBookEntry}
          onItemEnter={(entry) => console.log(`Selected ${entry.name} (${entry.walletAddress})`)}
        />
      </EntriesGrid>

      <AddressBookModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveEntry}
        editEntry={editingEntry}
        existingAddresses={existingAddresses}
      />
    </Container>
  );
};

export default AddressBookPage;
