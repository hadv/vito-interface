import React, { useState, useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { useAddressBook } from '../../../hooks/useAddressBook';
import { AddressBookEntry } from '../../../services/AddressBookService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressBookEntryComponent from '../components/AddressBookEntry';
import AddressBookModal from '../components/AddressBookModal';
import { walletConnectionService } from '../../../services/WalletConnectionService';

const Container = styled.div`
  padding: ${theme.spacing[6]};
  max-width: 800px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[6]};
`;

const Title = styled.h1`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
`;

const SearchContainer = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const SearchInput = styled(Input)`
  max-width: 400px;
`;

const EntriesContainer = styled.div`
  min-height: 200px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[8]} ${theme.spacing[4]};
  color: ${theme.colors.text.secondary};
`;

const EmptyStateTitle = styled.h3`
  margin: 0 0 ${theme.spacing[2]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const EmptyStateMessage = styled.p`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.sm};
  line-height: 1.5;
`;

const LoadingState = styled.div`
  text-align: center;
  padding: ${theme.spacing[8]} ${theme.spacing[4]};
  color: ${theme.colors.text.secondary};
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
    searchEntries,
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
        <Title>Address Book</Title>
        <ErrorState>
          <ErrorMessage>
            Please connect to a Safe wallet to manage your address book.
          </ErrorMessage>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Address Book</Title>
        <Button variant="primary" onClick={handleAddEntry}>
          Add Entry
        </Button>
      </Header>

      <SearchContainer>
        <SearchInput
          type="text"
          placeholder="Search by name or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchContainer>

      <EntriesContainer>
        {loading && (
          <LoadingState>
            Loading address book entries...
          </LoadingState>
        )}

        {error && (
          <ErrorState>
            <ErrorMessage>{error}</ErrorMessage>
            <Button variant="secondary" onClick={() => { clearError(); refresh(); }}>
              Try Again
            </Button>
          </ErrorState>
        )}

        {!loading && !error && (
          <>
            {filteredEntries.length > 0 && (
              <EntriesCount>
                {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
                {searchQuery && ` matching "${searchQuery}"`}
              </EntriesCount>
            )}

            {filteredEntries.length === 0 && entries.length === 0 && (
              <EmptyState>
                <EmptyStateTitle>No Address Book Entries</EmptyStateTitle>
                <EmptyStateMessage>
                  Your address book is empty. Add frequently used addresses to make transactions easier.
                </EmptyStateMessage>
                <Button variant="primary" onClick={handleAddEntry}>
                  Add Your First Entry
                </Button>
              </EmptyState>
            )}

            {filteredEntries.length === 0 && entries.length > 0 && (
              <EmptyState>
                <EmptyStateTitle>No Results Found</EmptyStateTitle>
                <EmptyStateMessage>
                  No entries match your search query "{searchQuery}".
                </EmptyStateMessage>
              </EmptyState>
            )}

            {filteredEntries.map((entry) => (
              <AddressBookEntryComponent
                key={entry.walletAddress}
                entry={entry}
                onEdit={handleEditEntry}
                onRemove={handleRemoveEntry}
                isRemoving={removingAddress === entry.walletAddress}
              />
            ))}
          </>
        )}
      </EntriesContainer>

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
