import React, { useState } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { useAddressBook } from '../../../hooks/useAddressBook';
import { createSafeTxPoolService } from '../../../services/SafeTxPoolService';
import { getSafeTxPoolAddress } from '../../../contracts/abis';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import { useToast } from '../../../hooks/useToast';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import AddressDisplay from './AddressDisplay';

const Container = styled.div`
  margin: ${theme.spacing[6]} 0;
  padding: ${theme.spacing[6]};
  background: ${theme.colors.status.warning}10;
  border: 2px solid ${theme.colors.status.warning}30;
  border-radius: ${theme.borderRadius.lg};
`;

const WarningTitle = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.status.warning};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const WarningDescription = styled.div`
  margin-bottom: ${theme.spacing[6]};
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[800]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
`;

const AddressBookSection = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const AddressEntry = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[2]};
`;

const AddressInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
`;

const AddressName = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const AddForm = styled.form`
  display: flex;
  gap: ${theme.spacing[3]};
  margin-top: ${theme.spacing[4]};
`;

const FormGroup = styled.div`
  flex: 1;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  margin-top: ${theme.spacing[6]};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing[6]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;



interface GuardAddressBookManagerProps {
  safeAddress: string;
  network: string;
}

const GuardAddressBookManager: React.FC<GuardAddressBookManagerProps> = ({ safeAddress, network }) => {
  // Use the same hook as the address book page - much simpler!
  const {
    entries: addressBookEntries,
    loading: isLoading,
    refresh
  } = useAddressBook({
    network,
    safeAddress,
    autoRefresh: true
  });

  const [newAddress, setNewAddress] = useState('');
  const [newName, setNewName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { addToast } = useToast();



  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newAddress || !newName) {
      addToast('Missing Information', {
        type: 'error',
        message: 'Please provide both address and name'
      });
      return;
    }

    if (!ethers.utils.isAddress(newAddress)) {
      addToast('Invalid Address', {
        type: 'error',
        message: 'Please provide a valid Ethereum address'
      });
      return;
    }

    try {
      setIsAdding(true);

      // This will create a Safe transaction to add the address to the address book
      // The transaction will call the SafeTxPool contract (which is allowed by the guard)
      const safeTxPoolAddress = getSafeTxPoolAddress(network);
      if (!safeTxPoolAddress) {
        throw new Error(`SafeTxPool not configured for ${network} network`);
      }

      const provider = walletConnectionService.getProvider();
      const signer = walletConnectionService.getSigner();
      
      if (!provider || !signer) {
        throw new Error('Please connect your wallet first');
      }

      const safeTxPoolService = createSafeTxPoolService(network);
      // SafeTxPoolService initializes automatically with the provider
      safeTxPoolService.setSigner(signer);

      // Create the transaction to add address book entry
      const txParams = {
        safe: safeAddress,
        to: safeTxPoolAddress,
        value: '0',
        data: safeTxPoolService.createAddAddressBookEntryTxData(safeAddress, newAddress, newName),
        operation: 0, // CALL
        nonce: 0 // Will be set by the service
      };

      await safeTxPoolService.proposeTx(txParams);

      addToast('Address Added', {
        type: 'success',
        message: `${newName} has been added to the address book. You can now send transactions to this address.`
      });

      setNewAddress('');
      setNewName('');
      await refresh();

    } catch (err: any) {
      console.error('Error adding address:', err);
      addToast('Failed to Add Address', {
        type: 'error',
        message: err.message || 'Failed to add address to address book'
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveGuard = async () => {
    try {
      addToast('Remove Guard', {
        type: 'info',
        message: 'To remove the guard, go to the Smart Contract Guard section above and click "Remove Guard"'
      });
    } catch (err: any) {
      console.error('Error removing guard:', err);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <WarningTitle>⚠️ Loading Address Book...</WarningTitle>
      </Container>
    );
  }

  return (
    <Container>
      <WarningTitle>⚠️ Guard Blocking Transactions</WarningTitle>
      
      <WarningDescription>
        <strong>Issue:</strong> Your Safe has the SafeTxPool guard active, which only allows transactions to addresses 
        in your address book. This is why you can't execute transactions to new addresses.
        <br /><br />
        <strong>Solutions:</strong>
        <ul>
          <li><strong>Add addresses below:</strong> Add the addresses you want to send transactions to</li>
          <li><strong>Temporarily remove guard:</strong> Remove the guard, add addresses, then re-enable it</li>
        </ul>
      </WarningDescription>

      <AddressBookSection>
        <SectionTitle>Current Address Book ({addressBookEntries.length} entries)</SectionTitle>
        
        {addressBookEntries.length === 0 ? (
          <EmptyState>
            No addresses in the address book. Add addresses below to enable transactions.
          </EmptyState>
        ) : (
          addressBookEntries.map((entry, index) => (
            <AddressEntry key={index}>
              <AddressInfo>
                <AddressName>{entry.name}</AddressName>
                <AddressDisplay
                  address={entry.walletAddress}
                  network={network}
                  truncate={true}
                  truncateLength={8}
                  showCopy={true}
                />
              </AddressInfo>
            </AddressEntry>
          ))
        )}

        <AddForm onSubmit={handleAddAddress}>
          <FormGroup>
            <Input
              label="Address"
              placeholder="0x..."
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              required
            />
          </FormGroup>
          <FormGroup>
            <Input
              label="Name"
              placeholder="Enter a name for this address"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </FormGroup>
          <FormGroup style={{ display: 'flex', alignItems: 'end' }}>
            <Button
              type="submit"
              variant="primary"
              loading={isAdding}
              disabled={isAdding || !newAddress || !newName}
            >
              Add Address
            </Button>
          </FormGroup>
        </AddForm>
      </AddressBookSection>

      <ActionButtons>
        <Button
          variant="secondary"
          onClick={handleRemoveGuard}
        >
          How to Remove Guard
        </Button>
      </ActionButtons>
    </Container>
  );
};

export default GuardAddressBookManager;
