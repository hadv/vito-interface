import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { AddressBookEntry } from '../../../services/AddressBookService';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[4]};
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const Label = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const ErrorMessage = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.status.error};
  margin-top: ${theme.spacing[1]};
`;

const HelperText = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  margin-top: ${theme.spacing[1]};
`;

const FormActions = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${theme.spacing[4]};
`;

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (walletAddress: string, name: string) => Promise<void>;
  editEntry?: AddressBookEntry | null;
  existingAddresses?: string[];
}

const AddressBookModal: React.FC<AddressBookModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editEntry,
  existingAddresses = []
}) => {
  const [name, setName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [nameError, setNameError] = useState('');
  const [addressError, setAddressError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(editEntry);

  // Initialize form when modal opens or edit entry changes
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

  const validateName = (value: string): string => {
    if (!value.trim()) {
      return 'Name is required';
    }
    if (value.trim().length > 31) {
      return 'Name must be 31 characters or less';
    }
    return '';
  };

  const validateAddress = (value: string): string => {
    if (!value.trim()) {
      return 'Wallet address is required';
    }
    
    if (!ethers.utils.isAddress(value)) {
      return 'Invalid wallet address format';
    }
    
    if (value === ethers.constants.AddressZero) {
      return 'Cannot use zero address';
    }

    // Check for duplicates (only when adding new entry or changing address)
    if (!isEditing || (isEditing && value.toLowerCase() !== editEntry?.walletAddress.toLowerCase())) {
      if (existingAddresses.some(addr => addr.toLowerCase() === value.toLowerCase())) {
        return 'This address already exists in your address book';
      }
    }

    return '';
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setNameError(validateName(value));
  };

  const handleAddressChange = (value: string) => {
    setWalletAddress(value);
    setAddressError(validateAddress(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidationError = validateName(name);
    const addressValidationError = validateAddress(walletAddress);

    setNameError(nameValidationError);
    setAddressError(addressValidationError);

    if (nameValidationError || addressValidationError) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSave(walletAddress.trim(), name.trim());
      onClose();
    } catch (error) {
      console.error('Error saving address book entry:', error);
      // Error handling is done in the parent component via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            {isEditing ? 'Edit Address Book Entry' : 'Add Address Book Entry'}
          </ModalTitle>
          <CloseButton onClick={handleClose} disabled={isSubmitting}>
            ×
          </CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleNameChange(e.target.value)}
              placeholder="Enter a name for this address"
              disabled={isSubmitting}
              error={nameError || undefined}
            />
            {nameError && <ErrorMessage>{nameError}</ErrorMessage>}
            <HelperText>Maximum 31 characters</HelperText>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="address">Wallet Address</Label>
            <Input
              id="address"
              type="text"
              value={walletAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAddressChange(e.target.value)}
              placeholder="0x..."
              disabled={isSubmitting || isEditing}
              error={addressError || undefined}
            />
            {addressError && <ErrorMessage>{addressError}</ErrorMessage>}
            {isEditing && (
              <HelperText>Address cannot be changed when editing</HelperText>
            )}
          </FormGroup>

          <FormActions>
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={Boolean(nameError || addressError)}
            >
              {isEditing ? 'Update' : 'Add'} Entry
            </Button>
          </FormActions>
        </Form>
      </ModalContent>
    </ModalOverlay>
  );
};

export default AddressBookModal;
