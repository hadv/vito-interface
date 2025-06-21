import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { AddressBookEntry } from '../../../services/AddressBookService';
import { useAddressBook } from '../../../hooks/useAddressBook';
import Input from '../../ui/Input';
import AddressDisplay from './AddressDisplay';
import { isValidEthereumAddress } from '../../../utils/ens';

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const Backdrop = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 999;
  display: ${props => props.isOpen ? 'block' : 'none'};
  animation: ${props => props.isOpen ? 'fadeIn' : 'fadeOut'} 0.2s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to { opacity: 0; }
  }
`;

const SelectorButton = styled.button.withConfig({
  shouldForwardProp: (prop) => !['isOpen', 'hasValue'].includes(prop),
})<{ isOpen: boolean; hasValue: boolean }>`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid ${props => props.isOpen ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 16px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
  min-height: 48px;

  &:hover {
    border-color: ${props => props.isOpen ? '#3b82f6' : 'rgba(255, 255, 255, 0.3)'};
    background: rgba(255, 255, 255, 0.15);
  }

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
  }

  ${props => props.hasValue && `
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.4);
  `}
`;

const SelectorContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  text-align: left;
  justify-content: flex-start;
`;

const EntryIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 2px;
`;

const EntryInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  text-align: left;
`;

const EntryName = styled.div`
  font-weight: 600;
  color: white;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const EntryAddress = styled.div`
  font-size: 12px;
  color: #94a3b8;
  text-align: left;
  word-break: break-all;
  line-height: 1.3;
`;

const PlaceholderText = styled.div`
  color: #94a3b8;
  font-size: 14px;
  text-align: left;
`;

const ChevronIcon = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #94a3b8;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.2s ease;
  flex-shrink: 0;
`;

const Dropdown = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isOpen',
})<{ isOpen: boolean }>`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: rgba(17, 24, 39, 0.95);
  border: 2px solid rgba(75, 85, 99, 0.8);
  border-radius: 16px;
  margin-top: 8px;
  max-height: 400px;
  overflow-y: auto;
  z-index: 1001;
  display: ${props => props.isOpen ? 'block' : 'none'};
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(12px);
  min-width: 100%;
`;

const DropdownSection = styled.div`
  padding: 12px 0;
`;

const SectionTitle = styled.div`
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const AddressOption = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isFocused',
})<{ isFocused?: boolean }>`
  padding: 16px;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  min-height: 60px;

  &:hover, ${props => props.isFocused && `
    background: rgba(59, 130, 246, 0.1);
    border-left-color: #3b82f6;
  `}

  ${props => props.isFocused && `
    background: rgba(59, 130, 246, 0.15);
    border-left-color: #60a5fa;
  `}
`;

const SearchContainer = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid rgba(75, 85, 99, 0.5);
`;

const ManualInputSection = styled.div`
  padding: 12px 16px;
  border-top: 1px solid rgba(75, 85, 99, 0.5);
`;

const ManualInputLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EmptyState = styled.div`
  padding: 24px 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
`;

export interface AddressBookSelectorProps {
  value: string;
  onChange: (address: string) => void;
  placeholder?: string;
  disabled?: boolean;
  network?: string;
  safeAddress?: string;
  error?: string;
}

const AddressBookSelector: React.FC<AddressBookSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select from address book or enter address...",
  disabled = false,
  network = 'ethereum',
  safeAddress,
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { entries, loading, error: addressBookError } = useAddressBook({
    network,
    safeAddress,
    autoRefresh: true
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filter entries based on search query
  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.walletAddress.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if we have a valid safe address for address book functionality
  const hasValidSafeAddress = safeAddress && safeAddress.length > 0;

  // Find the selected entry if value matches an address book entry
  const selectedEntry = entries.find(entry => 
    entry.walletAddress.toLowerCase() === value.toLowerCase()
  );

  const handleEntrySelect = (entry: AddressBookEntry) => {
    onChange(entry.walletAddress);
    setIsOpen(false);
    setSearchQuery('');
    setManualInput('');
  };

  // Reset manual input when an address book entry is selected
  useEffect(() => {
    if (selectedEntry && manualInput) {
      setManualInput('');
    }
  }, [selectedEntry, manualInput]);

  // Reset focused index when entries change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [filteredEntries]);

  const handleManualInputChange = (inputValue: string) => {
    setManualInput(inputValue);
    onChange(inputValue);
    // Clear search when user starts typing manually
    if (inputValue && searchQuery) {
      setSearchQuery('');
    }
  };

  const handleManualInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValidEthereumAddress(manualInput)) {
      onChange(manualInput);
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(-1);
      }
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredEntries.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredEntries.length) {
          handleEntrySelect(filteredEntries[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <>
      <Backdrop isOpen={isOpen && !disabled} />
      <Container ref={containerRef}>
        <SelectorButton
        type="button"
        isOpen={isOpen}
        hasValue={!!value}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      >
        <SelectorContent>
          {selectedEntry ? (
            <>
              <EntryIcon>
                {selectedEntry.name.charAt(0).toUpperCase()}
              </EntryIcon>
              <EntryInfo>
                <EntryName>{selectedEntry.name}</EntryName>
                <EntryAddress>
                  <AddressDisplay
                    address={selectedEntry.walletAddress}
                    network={network}
                    truncate={false}
                    showCopy={false}
                    showExplorer={false}
                  />
                </EntryAddress>
              </EntryInfo>
            </>
          ) : value ? (
            <>
              <EntryIcon>
                {value.slice(2, 4).toUpperCase()}
              </EntryIcon>
              <EntryInfo>
                <EntryName>Manual Address</EntryName>
                <EntryAddress>
                  <AddressDisplay
                    address={value}
                    network={network}
                    truncate={false}
                    showCopy={false}
                    showExplorer={false}
                  />
                </EntryAddress>
              </EntryInfo>
            </>
          ) : (
            <PlaceholderText>{placeholder}</PlaceholderText>
          )}
        </SelectorContent>
        <ChevronIcon isOpen={isOpen} />
        </SelectorButton>

        <Dropdown isOpen={isOpen && !disabled}>
        <SearchContainer>
          <Input
            type="text"
            placeholder="Search address book..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            variant="filled"
            inputSize="sm"
            fullWidth
          />
        </SearchContainer>

        {!hasValidSafeAddress ? (
          <EmptyState>
            Connect your wallet to access address book
          </EmptyState>
        ) : addressBookError ? (
          <EmptyState>
            Unable to load address book: {addressBookError}
          </EmptyState>
        ) : loading ? (
          <EmptyState>Loading address book...</EmptyState>
        ) : filteredEntries.length > 0 ? (
          <DropdownSection>
            <SectionTitle>Address Book</SectionTitle>
            {filteredEntries.map((entry, index) => (
              <AddressOption
                key={entry.walletAddress}
                isFocused={index === focusedIndex}
                onClick={() => handleEntrySelect(entry)}
              >
                <EntryIcon>
                  {entry.name.charAt(0).toUpperCase()}
                </EntryIcon>
                <EntryInfo>
                  <EntryName>{entry.name}</EntryName>
                  <EntryAddress>
                    <AddressDisplay
                      address={entry.walletAddress}
                      network={network}
                      truncate={false}
                      showCopy={false}
                      showExplorer={false}
                    />
                  </EntryAddress>
                </EntryInfo>
              </AddressOption>
            ))}
          </DropdownSection>
        ) : searchQuery ? (
          <EmptyState>No addresses found matching "{searchQuery}"</EmptyState>
        ) : (
          <EmptyState>No addresses in your address book</EmptyState>
        )}

        <ManualInputSection>
          <ManualInputLabel>Or enter address manually</ManualInputLabel>
          <Input
            type="text"
            placeholder="0x..."
            value={manualInput}
            onChange={(e) => handleManualInputChange(e.target.value)}
            onKeyPress={handleManualInputKeyPress}
            variant="filled"
            inputSize="sm"
            fullWidth
            error={manualInput && !isValidEthereumAddress(manualInput) ? 'Invalid address format' : undefined}
          />
        </ManualInputSection>
        </Dropdown>
      </Container>
    </>
  );
};

export default AddressBookSelector;
