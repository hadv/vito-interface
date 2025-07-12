/**
 * Transaction Proposal Modal
 * Rich interface for creating and proposing transactions without requiring signatures
 * This is the first step in the separated transaction flow - maintains all original features
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
import { TransactionDecoder, DecodedTransactionData } from '../../../utils/transactionDecoder';
import { TokenService } from '../../../services/TokenService';
import { getRpcUrl } from '../../../contracts/abis';
import AddressDisplay from './AddressDisplay';
import ParameterDisplay from './ParameterDisplay';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  padding: 32px;
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #CBD5E1;
  font-size: 32px;
  cursor: pointer;
  padding: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
    color: #fff;
    transform: scale(1.1);
    box-shadow: 0 0 20px rgba(255, 107, 107, 0.4);
  }
`;

const FormGroup = styled.div`
  margin-bottom: 32px;
`;

const Label = styled.label`
  display: block;
  color: #4ECDC4;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
`;

const AssetSection = styled.div`
  background: rgba(78, 205, 196, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const AssetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
`;

const AssetIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(45deg, #4ECDC4, #44A08D);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: white;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.5);
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.h3`
  color: #4ECDC4;
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px 0;
  text-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
`;

const AssetDescription = styled.p`
  color: #CBD5E1;
  font-size: 14px;
  margin: 0 0 8px 0;
`;

const AssetBalance = styled.div`
  color: #96CEB4;
  font-size: 14px;
  font-weight: 500;
`;

const TransactionDetails = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }
`;

const DetailLabel = styled.span`
  color: #4ECDC4;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const DetailValue = styled.div`
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  word-break: break-word;
  line-height: 1.5;
`;

const ErrorMessage = styled.div`
  color: #FF6B6B;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
`;

const SuccessMessage = styled.div`
  color: #96CEB4;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(150, 206, 180, 0.1);
  border: 1px solid rgba(150, 206, 180, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(150, 206, 180, 0.3);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  margin-top: 40px;
  flex-wrap: wrap;
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
  const [decodedTransaction, setDecodedTransaction] = useState<DecodedTransactionData | null>(null);

  const toast = useToast();
  const { connectionState } = useWalletConnection();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setToAddress('');
      setAmount('');
      setError('');
      setSuccess('');
      setDecodedTransaction(null);
    }
  }, [isOpen]);

  // Decode transaction data when inputs change
  useEffect(() => {
    const decodeTransaction = async () => {
      if (!toAddress || !amount || parseFloat(amount) <= 0) {
        setDecodedTransaction(null);
        return;
      }

      try {
        // Initialize decoder with current network
        const network = connectionState.network || 'ethereum';
        const rpcUrl = getRpcUrl(network);
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const tokenService = new TokenService(provider, network);
        const decoder = new TransactionDecoder(tokenService, network);

        let transactionTo: string;
        let transactionValue: string;
        let transactionData: string;

        if (preSelectedAsset && preSelectedAsset.type === 'erc20' && preSelectedAsset.contractAddress) {
          // ERC-20 token transfer
          const transferInterface = new ethers.utils.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
          ]);

          const decimals = preSelectedAsset.decimals || 18;
          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
          const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);

          transactionTo = preSelectedAsset.contractAddress;
          transactionValue = '0';
          transactionData = data;
        } else {
          // ETH transfer
          transactionTo = toAddress;
          transactionValue = ethers.utils.parseEther(amount).toString();
          transactionData = '0x';
        }

        const decoded = await decoder.decodeTransactionData(
          transactionTo,
          transactionValue,
          transactionData,
          toAddress
        );

        setDecodedTransaction(decoded);
      } catch (error) {
        console.error('Error decoding transaction:', error);
        setDecodedTransaction(null);
      }
    };

    decodeTransaction();
  }, [toAddress, amount, preSelectedAsset, connectionState.network]);

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

  // Mock values for gas estimation (in production, these would be calculated)
  const estimatedGas = '0.001';
  const networkFee = '0.002';

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            {preSelectedAsset?.type === 'native' ? 'Send ETH' : 'Send Transaction'}
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        {preSelectedAsset?.type === 'native' && (
          <AssetSection>
            <AssetHeader>
              <AssetIcon>ETH</AssetIcon>
              <AssetInfo>
                <AssetName>Native Ethereum Transfer</AssetName>
                <AssetDescription>Send ETH directly to any Ethereum address</AssetDescription>
              </AssetInfo>
            </AssetHeader>
          </AssetSection>
        )}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="toAddress">Recipient Address</Label>
            <Input
              id="toAddress"
              type="text"
              value={toAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setToAddress(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
          </FormGroup>

          {preSelectedAsset && (
            <FormGroup>
              <Label>Sending Asset</Label>
              <AssetSection>
                <AssetHeader>
                  <AssetIcon>{preSelectedAsset.symbol.charAt(0)}</AssetIcon>
                  <AssetInfo>
                    <AssetName>{preSelectedAsset.name}</AssetName>
                    <AssetBalance>Balance: {preSelectedAsset.balance} {preSelectedAsset.symbol}</AssetBalance>
                  </AssetInfo>
                </AssetHeader>
              </AssetSection>
            </FormGroup>
          )}

          <FormGroup>
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
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
              data-form-type="other"
            />
          </FormGroup>

          {(toAddress && amount && parseFloat(amount) > 0) && (
            <TransactionDetails>
              {decodedTransaction && (
                <DetailRow>
                  <DetailLabel>Transaction Type:</DetailLabel>
                  <DetailValue>{decodedTransaction.description}</DetailValue>
                </DetailRow>
              )}

              <DetailRow>
                <DetailLabel>Recipient:</DetailLabel>
                <DetailValue>
                  <AddressDisplay address={toAddress} />
                </DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>Amount:</DetailLabel>
                <DetailValue>{amount} {preSelectedAsset?.symbol || 'ETH'}</DetailValue>
              </DetailRow>

              {decodedTransaction?.details.token && (
                <>
                  <DetailRow>
                    <DetailLabel>Token:</DetailLabel>
                    <DetailValue>
                      {decodedTransaction.details.token.name} ({decodedTransaction.details.token.symbol})
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Token Address:</DetailLabel>
                    <DetailValue>
                      <AddressDisplay address={decodedTransaction.details.token.address} />
                    </DetailValue>
                  </DetailRow>
                </>
              )}

              {/* Show decoded parameters if available */}
              {decodedTransaction?.details?.decodedInputs && decodedTransaction.details.decodedInputs.length > 0 && (
                <DetailRow>
                  <DetailLabel>Parameters:</DetailLabel>
                  <DetailValue>
                    <ParameterDisplay
                      parameters={decodedTransaction.details.decodedInputs}
                      network={connectionState.network || 'ethereum'}
                      compact={true}
                    />
                  </DetailValue>
                </DetailRow>
              )}

              {preSelectedAsset?.type === 'erc20' && (
                <>
                  <DetailRow>
                    <DetailLabel>Function:</DetailLabel>
                    <DetailValue>ERC-20 Transfer Function</DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Raw Data:</DetailLabel>
                    <DetailValue
                      onClick={() => {
                        // Calculate the hex data for copying
                        if (preSelectedAsset?.contractAddress) {
                          const transferInterface = new ethers.utils.Interface([
                            'function transfer(address to, uint256 amount) returns (bool)'
                          ]);
                          const decimals = preSelectedAsset.decimals || 18;
                          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
                          const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);
                          navigator.clipboard.writeText(data);
                          toast.success('Transaction data copied to clipboard');
                        }
                      }}
                      title="Click to copy raw transaction data"
                      style={{ cursor: 'pointer' }}
                    >
                      {(() => {
                        if (preSelectedAsset?.contractAddress) {
                          const transferInterface = new ethers.utils.Interface([
                            'function transfer(address to, uint256 amount) returns (bool)'
                          ]);
                          const decimals = preSelectedAsset.decimals || 18;
                          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
                          const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);
                          return data.length > 50 ? `${data.slice(0, 50)}...` : data;
                        }
                        return 'Calculating...';
                      })()}
                    </DetailValue>
                  </DetailRow>
                </>
              )}

              <DetailRow>
                <DetailLabel>Estimated Gas:</DetailLabel>
                <DetailValue>{estimatedGas} ETH</DetailValue>
              </DetailRow>

              <DetailRow>
                <DetailLabel>Network Fee:</DetailLabel>
                <DetailValue>{networkFee} ETH</DetailValue>
              </DetailRow>
            </TransactionDetails>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <ButtonGroup>
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
              {isLoading ? 'Creating Proposal...' : 'Create Transaction Proposal'}
            </Button>
          </ButtonGroup>
        </form>


      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionProposalModal;
