import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { AddressBookEntry } from '../../../services/AddressBookService';
import { addressBookService } from '../../../services/AddressBookService';
import { safeTxPoolService } from '../../../services/SafeTxPoolService';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { useToast } from '../../../hooks/useToast';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

const ModalContent = styled.div`
  background: ${theme.colors.background.primary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.xl};
  padding: ${theme.spacing[8]};
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.4);
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[8]};
  padding-bottom: ${theme.spacing[4]};
  border-bottom: 1px solid ${theme.colors.border.primary};
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize['2xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  background: linear-gradient(135deg, ${theme.colors.primary[400]} 0%, ${theme.colors.secondary[400]} 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  width: 32px;
  height: 32px;
  border-radius: ${theme.borderRadius.full};
  color: ${theme.colors.text.secondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.typography.fontSize.lg};
  transition: all 0.2s ease;
  
  &:hover {
    background: ${theme.colors.background.tertiary};
    color: ${theme.colors.text.primary};
    border-color: ${theme.colors.border.secondary};
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const FormGroup = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing[2]};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${theme.spacing[8]};
`;

const InfoMessage = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
`;

interface AddressBookTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: () => void;
  operation: 'add' | 'remove';
  safeAddress: string;
  editEntry?: AddressBookEntry | null;
  existingAddresses?: string[];
}

const AddressBookTransactionModal: React.FC<AddressBookTransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  operation,
  safeAddress,
  editEntry,
  existingAddresses = []
}) => {
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [nameError, setNameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error: showError } = useToast();

  const isEditing = Boolean(editEntry);
  const isRemoving = operation === 'remove';

  useEffect(() => {
    if (isOpen) {
      if (editEntry) {
        setName(editEntry.name);
        setWalletAddress(editEntry.walletAddress);
      } else {
        setName('');
        setWalletAddress('');
      }
      setNameError('');
      setAddressError('');
      setIsSubmitting(false);
    }
  }, [isOpen, editEntry]);

  const validateForm = (): boolean => {
    let isValid = true;

    // Validate name (only for add operations)
    if (!isRemoving) {
      if (!name.trim()) {
        setNameError('Name is required');
        isValid = false;
      } else if (name.trim().length > 31) {
        setNameError('Name must be 31 characters or less');
        isValid = false;
      } else {
        setNameError('');
      }
    }

    // Validate address
    if (!walletAddress.trim()) {
      setAddressError('Wallet address is required');
      isValid = false;
    } else if (!ethers.utils.isAddress(walletAddress)) {
      setAddressError('Invalid wallet address format');
      isValid = false;
    } else if (walletAddress === ethers.constants.AddressZero) {
      setAddressError('Cannot use zero address');
      isValid = false;
    } else if (!isEditing && existingAddresses.includes(walletAddress.toLowerCase())) {
      setAddressError('This address is already in your address book');
      isValid = false;
    } else {
      setAddressError('');
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let txData;
      
      if (isRemoving) {
        txData = await addressBookService.createRemoveEntryTransaction(safeAddress, walletAddress);
      } else {
        txData = await addressBookService.createAddEntryTransaction(safeAddress, walletAddress, name.trim());
      }

      // Create the transaction hash for EIP-712 signing
      const connectionState = walletConnectionService.getConnectionState();
      const chainId = connectionState.chainId || 1;
      
      // Propose the transaction to SafeTxPool
      await safeTxPoolService.proposeTx(
        safeAddress,
        txData.to,
        txData.value,
        txData.data,
        txData.operation,
        txData.safeTxGas,
        txData.baseGas,
        txData.gasPrice,
        txData.gasToken,
        txData.refundReceiver,
        txData.nonce
      );

      success(isRemoving ? 'Address book entry removal proposed successfully!' : 'Address book entry addition proposed successfully!');
      onTransactionCreated();
      onClose();
    } catch (error: any) {
      console.error('Error creating address book transaction:', error);
      showError(`Failed to create transaction: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {isRemoving ? 'Remove Address Book Entry' : isEditing ? 'Edit Address Book Entry' : 'Add Address Book Entry'}
          </ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <InfoMessage>
          This will create a Safe transaction that needs to be signed and executed by the required number of owners.
        </InfoMessage>

        <form onSubmit={handleSubmit}>
          {!isRemoving && (
            <FormGroup>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder="Enter a name for this address"
                disabled={isSubmitting}
                error={nameError || undefined}
              />
            </FormGroup>
          )}

          <FormGroup>
            <Label htmlFor="address">Wallet Address</Label>
            <Input
              id="address"
              type="text"
              value={walletAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletAddress(e.target.value)}
              placeholder="0x..."
              disabled={isSubmitting || isEditing}
              error={addressError || undefined}
            />
          </FormGroup>

          <ButtonGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isRemoving ? "danger" : "primary"}
              disabled={isSubmitting}
              loading={isSubmitting}
            >
              {isSubmitting ? 'Creating Transaction...' : isRemoving ? 'Remove Entry' : isEditing ? 'Update Entry' : 'Add Entry'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AddressBookTransactionModal;
