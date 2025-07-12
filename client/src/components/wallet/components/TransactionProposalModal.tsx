/**
 * Transaction Proposal Modal
 * Allows users to create and propose transactions without requiring signatures
 * This is the first step in the separated transaction flow
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import { isValidEthereumAddress } from '../../../utils/ens';
import { useToast } from '../../../hooks/useToast';
import { useWalletConnection } from '../../../hooks/useWalletConnection';
import { transactionProposalService, TransactionProposalRequest } from '../../../services/TransactionProposalService';
import { isSafeTxPoolConfigured } from '../../../contracts/abis';
import { Asset } from '../types';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.75);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(8px);
`;

const ModalContainer = styled.div`
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
`;

const ModalTitle = styled.h2`
  color: #f8fafc;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    color: #f8fafc;
    background-color: rgba(148, 163, 184, 0.1);
  }
`;

const ModalContent = styled.div`
  padding: 32px;
`;

const ProposalBadge = styled.div`
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
  margin-bottom: 24px;
`;

const InfoSection = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoTitle = styled.h3`
  color: #3b82f6;
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const InfoText = styled.p`
  color: #cbd5e1;
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0;
`;

const FormSection = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  color: #f8fafc;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 8px;
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 6px;
`;

const SuccessMessage = styled.div`
  color: #10b981;
  font-size: 0.875rem;
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 6px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #374151;
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;



interface TransactionProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionProposed: (transaction: any) => void;
  fromAddress: string;
  preSelectedAsset?: Asset;
}

const TransactionProposalModal: React.FC<TransactionProposalModalProps> = ({
  isOpen,
  onClose,
  onTransactionProposed,
  fromAddress,
  preSelectedAsset
}) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const toast = useToast();
  const { connectionState } = useWalletConnection();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setToAddress('');
      setAmount('');
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!toAddress.trim()) {
      setError('Recipient address is required');
      return;
    }

    if (!isValidEthereumAddress(toAddress)) {
      setError('Invalid recipient address');
      return;
    }

    if (!amount.trim() || parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    // Check if signer is connected
    if (!connectionState.signerConnected) {
      setError('Please connect your wallet to propose transactions');
      return;
    }

    // Check if Safe TX Pool is configured for the current network
    if (!isSafeTxPoolConfigured(connectionState.network || 'ethereum')) {
      setError(`Safe TX Pool contract is not configured for ${connectionState.network}. Please configure the contract address to enable transactions.`);
      return;
    }

    setIsLoading(true);

    try {
      // Prepare transaction request
      let transactionRequest: TransactionProposalRequest;

      if (preSelectedAsset && preSelectedAsset.type === 'erc20' && preSelectedAsset.contractAddress) {
        // ERC-20 token transfer
        const transferInterface = new ethers.utils.Interface([
          'function transfer(address to, uint256 amount) returns (bool)'
        ]);

        const decimals = preSelectedAsset.decimals || 18;
        const parsedAmount = ethers.utils.parseUnits(amount, decimals);
        const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);

        transactionRequest = {
          to: preSelectedAsset.contractAddress,
          value: '0',
          data,
          operation: 0
        };
      } else {
        // ETH transfer
        transactionRequest = {
          to: toAddress,
          value: ethers.utils.parseEther(amount).toString(),
          data: '0x',
          operation: 0
        };
      }

      // Validate request
      const validation = transactionProposalService.validateProposalRequest(transactionRequest);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid transaction request');
        return;
      }

      // Propose transaction
      const proposedTransaction = await transactionProposalService.proposeTransaction(
        fromAddress,
        transactionRequest,
        connectionState.network || 'ethereum'
      );

      setSuccess(`Transaction proposed successfully! Hash: ${proposedTransaction.txHash}`);
      
      toast.success('Transaction Proposed', {
        message: 'Transaction has been proposed and is ready for signing'
      });

      if (onTransactionProposed) {
        onTransactionProposed(proposedTransaction);
      }

      // Reset form after successful proposal
      setTimeout(() => {
        setToAddress('');
        setAmount('');
        setSuccess('');
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Error proposing transaction:', error);
      setError(error.message || 'Failed to propose transaction');
      toast.error('Proposal Failed', {
        message: error.message || 'Failed to propose transaction'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            📝 Propose Transaction
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalContent>
          <ProposalBadge>
            Step 1: Create Transaction Proposal
          </ProposalBadge>

          <InfoSection>
            <InfoTitle>Transaction Proposal</InfoTitle>
            <InfoText>
              Create a transaction proposal without requiring signatures. 
              The transaction will be added to the pending queue and can be signed later 
              by you or other Safe owners.
            </InfoText>
          </InfoSection>

          <form onSubmit={handleSubmit}>
            <FormSection>
              <Label htmlFor="toAddress">Recipient Address</Label>
              <Input
                id="toAddress"
                type="text"
                value={toAddress}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToAddress(e.target.value)}
                placeholder="0x..."
                disabled={isLoading}
              />
            </FormSection>

            <FormSection>
              <Label htmlFor="amount">
                Amount ({preSelectedAsset?.symbol || 'ETH'})
              </Label>
              <Input
                id="amount"
                type="number"
                step="any"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                placeholder="0.0"
                disabled={isLoading}
              />
            </FormSection>

            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
                type="button"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
              >
                {isLoading && <LoadingSpinner />}
                {isLoading ? 'Proposing...' : 'Propose Transaction'}
              </Button>
            </div>
          </form>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionProposalModal;
