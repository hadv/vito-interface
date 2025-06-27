import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { theme } from '../../../theme';
import { AddressBookEntry, createAddressBookService } from '../../../services/AddressBookService';
import { createSafeTxPoolService } from '../../../services/SafeTxPoolService';
import { useWallet } from '../../../contexts/WalletContext';
import { toChecksumAddress, isValidAddress, isZeroAddress } from '../../../utils/addressUtils';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import WalletModal from '../../ui/WalletModal';
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
  const [currentNetwork, setCurrentNetwork] = useState<string>('sepolia');
  const [addressBookService, setAddressBookService] = useState<any>(null);
  const [safeTxPoolService, setSafeTxPoolService] = useState<any>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const { success, error: showError } = useToast();
  const { state: walletState, connectSigner, showWalletModal: showWalletConnectionModal } = useWallet();

  const isEditing = Boolean(editEntry);
  const isRemoving = operation === 'remove';

  // Get current network and initialize services when modal opens
  useEffect(() => {
    if (isOpen) {
      // Get the current network from wallet state
      const network = walletState.network || 'sepolia'; // Default to sepolia

      setCurrentNetwork(network);

      // Create network-specific services without wallet connection
      const addressBookSvc = createAddressBookService(network);
      const safeTxPoolSvc = createSafeTxPoolService(network);

      // Only initialize services with provider if MetaMask is connected
      // Avoid window.ethereum for WalletConnect to prevent Chrome extension popups
      if (walletState.signerConnected && walletState.walletType === 'metamask' && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        // Only initialize with provider, no signer to avoid triggering wallet popup
        addressBookSvc.initialize(provider);
        // SafeTxPoolService doesn't need initialization here, we'll set signer later
      } else if (walletState.signerConnected && walletState.walletType === 'walletconnect') {
        // Don't initialize provider for WalletConnect to avoid triggering Chrome extensions
      }

      setAddressBookService(addressBookSvc);
      setSafeTxPoolService(safeTxPoolSvc);
    }
  }, [isOpen]);

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

  // Listen for wallet connection changes to close the wallet modal
  useEffect(() => {
    if (walletState.signerConnected && showWalletModal) {
      setShowWalletModal(false);
    }
  }, [walletState.signerConnected, showWalletModal]);

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
    } else if (!isValidAddress(walletAddress)) {
      setAddressError('Invalid wallet address format');
      isValid = false;
    } else if (isZeroAddress(walletAddress)) {
      setAddressError('Cannot use zero address');
      isValid = false;
    } else {
      // Check for duplicates using checksum comparison
      const checksumAddress = toChecksumAddress(walletAddress);
      const isDuplicate = !isEditing && checksumAddress && existingAddresses.some(existing => {
        const checksumExisting = toChecksumAddress(existing);
        return checksumExisting === checksumAddress;
      });

      if (isDuplicate) {
        setAddressError('This address is already in your address book');
        isValid = false;
      } else {
        setAddressError('');
      }
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!addressBookService || !safeTxPoolService) {
      showError('Services not initialized. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(`Creating transaction for network: ${currentNetwork}`);

      // Check if signer wallet is connected
      if (!walletState.signerConnected) {
        setShowWalletModal(true);
        return;
      }

      let provider: ethers.providers.Provider;
      let signer: ethers.Signer;

      if (walletState.walletType === 'metamask') {
        // Use MetaMask provider
        if (!window.ethereum) {
          throw new Error('MetaMask not available');
        }
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        provider = web3Provider;
        signer = (web3Provider as ethers.providers.Web3Provider).getSigner();
      } else if (walletState.walletType === 'walletconnect') {
        // For WalletConnect, we'll need to get the provider from the wallet service
        // This is a simplified approach - in production you might want to use the wallet client directly
        throw new Error('WalletConnect transaction creation not yet implemented in new system');
      } else {
        throw new Error(`Unsupported wallet type: ${walletState.walletType}`);
      }

      // Update services with signer for transaction submission
      addressBookService.initialize(provider, signer);
      safeTxPoolService.setSigner(signer);

      // Convert to checksum address for consistency
      const checksumWalletAddress = toChecksumAddress(walletAddress);
      if (!checksumWalletAddress) {
        throw new Error('Invalid wallet address format');
      }

      let txData;

      if (isRemoving) {
        txData = await addressBookService.createRemoveEntryTransaction(safeAddress, checksumWalletAddress);
      } else {
        txData = await addressBookService.createAddEntryTransaction(safeAddress, checksumWalletAddress, name.trim());
      }

      // Propose the transaction to SafeTxPool
      const proposeTxParams = {
        safe: safeAddress,
        to: txData.to,
        value: txData.value,
        data: txData.data,
        operation: txData.operation,
        nonce: txData.nonce
      };

      console.log('Proposing transaction:', proposeTxParams);
      await safeTxPoolService.proposeTx(proposeTxParams);

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
              data-1p-ignore="true"
              data-lpignore="true"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isRemoving ? "danger" : "primary"}
              disabled={isSubmitting}
              loading={isSubmitting}
              data-1p-ignore="true"
              data-lpignore="true"
            >
              {isSubmitting ? 'Creating Transaction...' : isRemoving ? 'Remove Entry' : isEditing ? 'Update Entry' : 'Add Entry'}
            </Button>
          </ButtonGroup>
        </form>
      </ModalContent>

      {/* Wallet Connection Modal */}
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </ModalOverlay>
  );
};

export default AddressBookTransactionModal;
