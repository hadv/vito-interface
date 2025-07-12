import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { Button, Input } from '@components/ui';
import { isValidEthereumAddress } from '../../../utils/ens';

import { safeWalletService } from '../../../services/SafeWalletService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { isSafeTxPoolConfigured } from '../../../contracts/abis';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import { errorRecoveryService } from '../../../services/ErrorRecoveryService';
import { Asset } from '../types';
import { TransactionDecoder, DecodedTransactionData } from '../../../utils/transactionDecoder';
import { TokenService } from '../../../services/TokenService';
import { getRpcUrl } from '../../../contracts/abis';
import AddressDisplay from './AddressDisplay';
import AddressBookSelector from './AddressBookSelector';
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

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px;
  background: #334155;
  border-radius: 12px;
  border: 1px solid #475569;
  flex-wrap: nowrap;
  overflow-x: auto;
  justify-content: space-between;
  min-width: 100%;
`;

const StepBadge = styled.div<{ active: boolean; completed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  font-size: 16px;
  font-weight: 700;
  background: ${props =>
    props.completed ? '#0ea5e9' :
    props.active ? '#3b82f6' :
    '#64748b'
  };
  color: #ffffff;
  flex-shrink: 0;
`;

const StepText = styled.span<{ active: boolean; completed: boolean }>`
  font-size: 14px;
  color: ${props =>
    props.completed ? '#38bdf8' :
    props.active ? '#60a5fa' : '#e5e7eb'
  };
  font-weight: ${props => props.active ? '700' : '600'};
  white-space: nowrap;
  flex-shrink: 1;
  text-align: center;
  min-width: 0;
`;

const StepSeparator = styled.div`
  width: 24px;
  height: 3px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 4px;
  border-radius: 2px;
  flex-shrink: 0;
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

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated?: (transaction: any) => void;
  fromAddress?: string;
  preSelectedAsset?: Asset | null; // Pre-selected asset for sending
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  fromAddress,
  preSelectedAsset
}) => {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(''); // Keep for critical validation errors only
  const [success, setSuccess] = useState(''); // Keep for success messages
  const [currentStep, setCurrentStep] = useState<'form' | 'proposing'>('form');
  const [connectionState, setConnectionState] = useState<WalletConnectionState>({ isConnected: false });
  const [decodedTransaction, setDecodedTransaction] = useState<DecodedTransactionData | null>(null);

  // Initialize toast system
  const toast = useToast();

  // Subscribe to wallet connection state changes
  useEffect(() => {
    setConnectionState(walletConnectionService.getState());
    const unsubscribe = walletConnectionService.subscribe((state) => {
      setConnectionState(state);
    });
    return unsubscribe;
  }, []);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setToAddress('');
      setAmount('');
      setError('');
      setSuccess('');
      setCurrentStep('form');
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

  const handleConnectSigner = async () => {
    try {
      await walletConnectionService.connectSignerWallet();
      toast.success('Wallet Connected', { message: 'Signer wallet connected successfully' });
    } catch (error: any) {
      const errorDetails = ErrorHandler.classifyError(error);
      // Only show toast for wallet connection errors, not duplicate in modal
      toast.walletError(errorDetails.userMessage, handleConnectSigner);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation - show these in modal only (immediate feedback)
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
      setError('Please connect your wallet to create transactions');
      return;
    }

    // Check if Safe TX Pool is configured for the current network
    if (!isSafeTxPoolConfigured(connectionState.network || 'ethereum')) {
      setError(`Safe TX Pool contract is not configured for ${connectionState.network}. Please configure the contract address to enable transactions.`);
      return;
    }

    setIsLoading(true);
    setCurrentStep('proposing');

    try {
      // Create EIP-712 transaction and propose it (no signing required)
      const result = await errorRecoveryService.retry(async () => {
        // Handle ERC-20 token transfers vs ETH transfers
        if (preSelectedAsset && preSelectedAsset.type === 'erc20' && preSelectedAsset.contractAddress) {
          // ERC-20 token transfer
          const transferInterface = new ethers.utils.Interface([
            'function transfer(address to, uint256 amount) returns (bool)'
          ]);

          const decimals = preSelectedAsset.decimals || 18;
          const parsedAmount = ethers.utils.parseUnits(amount, decimals);
          const data = transferInterface.encodeFunctionData('transfer', [toAddress, parsedAmount]);

          return await safeWalletService.createEIP712Transaction({
            to: preSelectedAsset.contractAddress,
            value: '0',
            data,
            operation: 0
          });
        } else {
          // ETH transfer
          return await safeWalletService.createEIP712Transaction({
            to: toAddress,
            value: ethers.utils.parseEther(amount).toString(),
            data: '0x',
            operation: 0
          });
        }
      }, {
        maxAttempts: 3,
        retryCondition: (error) => {
          const errorDetails = ErrorHandler.classifyError(error);
          return ErrorHandler.shouldAutoRetry(errorDetails);
        }
      });

      // Propose the transaction without signing
      await safeWalletService.proposeUnsignedTransaction(
        result.safeTransactionData,
        result.txHash
      );

      setSuccess(`Transaction proposed successfully! Hash: ${result.txHash}`);
      toast.transactionSuccess(result.txHash, 'Transaction proposed and ready for signing');

      if (onTransactionCreated) {
        onTransactionCreated({
          ...result.safeTransactionData,
          txHash: result.txHash
        });
      }

      // Reset form
      setTimeout(() => {
        setToAddress('');
        setAmount('');
        setSuccess('');
        setCurrentStep('form');
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('❌ TRANSACTION MODAL: Error creating transaction:', error);
      const errorDetails = ErrorHandler.classifyError(error);

      // Show error in modal for critical validation issues, toast for others
      if (errorDetails.category === 'validation') {
        setError(errorDetails.userMessage);
      }

      setIsLoading(false);
      setCurrentStep('form');
      toast.transactionError(errorDetails.userMessage, errorDetails.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const estimatedGas = '0.001'; // Mock gas estimation
  const networkFee = '0.002'; // Mock network fee

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            {preSelectedAsset?.type === 'native' ? 'Send ETH' : 'Send Transaction'}
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <StepIndicator>
          <StepBadge active={currentStep === 'form'} completed={currentStep === 'proposing'}>1</StepBadge>
          <StepText active={currentStep === 'form'} completed={currentStep === 'proposing'}>Create EIP-712</StepText>
          <StepSeparator />
          <StepBadge active={currentStep === 'proposing'} completed={false}>2</StepBadge>
          <StepText active={currentStep === 'proposing'} completed={false}>Propose to Pool</StepText>
        </StepIndicator>

        {preSelectedAsset?.type === 'native' && (
          <TransactionDetails>
            <DetailRow>
              <DetailLabel>Asset:</DetailLabel>
              <DetailValue>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    ETH
                  </div>
                  <div>
                    <div style={{ fontWeight: '600' }}>Native Ethereum Transfer</div>
                    <div style={{ fontSize: '12px', color: '#CBD5E1' }}>Send ETH directly to any Ethereum address</div>
                  </div>
                </div>
              </DetailValue>
            </DetailRow>
          </TransactionDetails>
        )}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label htmlFor="toAddress">Recipient Address</Label>
            <AddressBookSelector
              value={toAddress}
              onChange={setToAddress}
              placeholder="Select from address book or enter address..."
              disabled={isLoading}
              network={connectionState.network || 'ethereum'}
              safeAddress={fromAddress}
              error={error && error.includes('address') ? error : undefined}
            />
          </FormGroup>

          {preSelectedAsset && (
            <FormGroup>
              <Label>Sending Asset</Label>
              <TransactionDetails>
                <DetailRow>
                  <DetailLabel>Asset:</DetailLabel>
                  <DetailValue>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(45deg, #4ECDC4, #44A08D)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'white'
                      }}>
                        {preSelectedAsset.symbol.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{preSelectedAsset.name}</div>
                        <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
                          Balance: {preSelectedAsset.balance} {preSelectedAsset.symbol}
                        </div>
                      </div>
                    </div>
                  </DetailValue>
                </DetailRow>
              </TransactionDetails>
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
            {!connectionState.signerConnected ? (
              <Button
                variant="primary"
                onClick={handleConnectSigner}
                disabled={isLoading}
                type="button"
              >
                Connect Wallet to Create
              </Button>
            ) : (
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ?
                  (currentStep === 'form' ? 'Creating EIP-712 Transaction...' : 'Proposing to SafeTxPool...') :
                  'Create Transaction Proposal'
                }
              </Button>
            )}
          </ButtonGroup>
        </form>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default TransactionModal;
