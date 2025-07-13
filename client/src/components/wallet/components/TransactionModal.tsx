import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';
import { Button, Input } from '@components/ui';
import { isValidEthereumAddress } from '../../../utils/ens';


import { safeWalletService } from '../../../services/SafeWalletService';
import { walletConnectionService, WalletConnectionState } from '../../../services/WalletConnectionService';
import { createSafeTxPoolService, AddressBookEntry } from '../../../services/SafeTxPoolService';
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
  const [showAddressBookWarning, setShowAddressBookWarning] = useState(false);
  // const [retryCount, setRetryCount] = useState(0); // Reserved for future retry functionality

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
      toast.success('Wallet Connected', {
        message: 'Signer wallet connected successfully'
      });
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
      setError('Please connect your wallet to sign transactions');
      return;
    }

    // Check if Safe TX Pool is configured for the current network
    if (!isSafeTxPoolConfigured(connectionState.network || 'ethereum')) {
      setError(`Safe TX Pool contract is not configured for ${connectionState.network}. Please configure the contract address to enable transactions.`);
      return;
    }

    // Check if address is in address book (required by SafeTxPool guard)
    if (!fromAddress) {
      setError('Safe address not available. Please connect your wallet and select a Safe.');
      return;
    }

    try {
      const safeTxPoolService = createSafeTxPoolService(connectionState.network || 'ethereum');
      const entries = await safeTxPoolService.getAddressBookEntries(fromAddress);
      const isInAddressBook = entries.some((entry: AddressBookEntry) => entry.walletAddress.toLowerCase() === toAddress.toLowerCase());

      if (!isInAddressBook) {
        setShowAddressBookWarning(true);
        setError(`This address is not in your address book. The SafeTxPool guard requires all transaction destinations to be pre-approved. Please add "${toAddress}" to your address book first.`);
        return;
      }
    } catch (addressBookError) {
      console.error('Error checking address book:', addressBookError);
      setError('Unable to verify address book. Please ensure the address is in your address book before proceeding.');
      return;
    }

    setIsLoading(true);
    setCurrentStep('proposing');

    try {
      // Create and propose transaction directly (without signing)
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

          return await safeWalletService.proposeUnsignedTransaction({
            to: preSelectedAsset.contractAddress,
            value: '0',
            data,
            operation: 0
          });
        } else {
          // ETH transfer
          return await safeWalletService.proposeUnsignedTransaction({
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

      console.log('✅ TRANSACTION MODAL: Transaction proposed successfully');
      console.log('📋 Result:', result);

      setSuccess(`Transaction proposed successfully! Hash: ${result.txHash}`);

      toast.transactionSuccess(result.txHash, 'Transaction proposed successfully');

      if (onTransactionCreated) {
        onTransactionCreated({
          ...result,
          signature: '' // No signature for unsigned proposals
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
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      const errorDetails = ErrorHandler.classifyError(error);
      console.error('❌ Classified error details:', errorDetails);

      // Show error in modal for critical validation issues, toast for others
      if (errorDetails.category === 'validation') {
        setError(errorDetails.userMessage);
      }
      setIsLoading(false);

      toast.transactionError(errorDetails.userMessage, errorDetails.message);
    }
  };



  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
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
          <StepBadge active={currentStep === 'form'} completed={currentStep === 'proposing'}>
            1
          </StepBadge>
          <StepText active={currentStep === 'form'} completed={currentStep === 'proposing'}>
            Create Transaction
          </StepText>

          <StepSeparator />

          <StepBadge active={currentStep === 'proposing'} completed={false}>
            2
          </StepBadge>
          <StepText active={currentStep === 'proposing'} completed={false}>
            Propose to Pool
          </StepText>
        </StepIndicator>

        {preSelectedAsset?.type === 'native' && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(76, 236, 196, 0.1), rgba(68, 160, 141, 0.1))',
            border: '1px solid rgba(76, 236, 196, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #4ECDC4, #44A08D)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1a1a1a',
              fontWeight: 'bold',
              fontSize: '16px'
            }}>
              ETH
            </div>
            <div>
              <div style={{ color: '#4ECDC4', fontWeight: '600', fontSize: '16px' }}>
                Native Ethereum Transfer
              </div>
              <div style={{ color: '#94a3b8', fontSize: '14px' }}>
                Send ETH directly to any Ethereum address
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FormGroup>
            <Label>Recipient Address</Label>
            <AddressBookSelector
              value={toAddress}
              onChange={(newAddress) => {
                setToAddress(newAddress);
                setShowAddressBookWarning(false);
                setError('');
              }}
              placeholder="Select from address book or enter address..."
              disabled={isLoading}
              network={connectionState.network || 'ethereum'}
              safeAddress={fromAddress}
            />
          </FormGroup>

          {preSelectedAsset && (
            <FormGroup>
              <Label>Sending Asset</Label>
              <div style={{
                padding: '12px 16px',
                background: '#334155',
                border: '1px solid #475569',
                borderRadius: '8px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #007bff, #0056b3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {preSelectedAsset.symbol.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>{preSelectedAsset.name}</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    Balance: {preSelectedAsset.balance} {preSelectedAsset.symbol}
                  </div>
                </div>
              </div>
            </FormGroup>
          )}

          <FormGroup>
            <Label>Amount ({preSelectedAsset?.symbol || 'ETH'})</Label>
            <Input
              type="number"
              step="0.000001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
                  <DetailValue style={{ color: '#4ECDC4', fontWeight: 'bold' }}>
                    {decodedTransaction.description}
                  </DetailValue>
                </DetailRow>
              )}

              <DetailRow>
                <DetailLabel>Recipient:</DetailLabel>
                <DetailValue>
                  <AddressDisplay
                    address={toAddress}
                    network={connectionState.network || 'ethereum'}
                    truncate={true}
                    truncateLength={6}
                  />
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
                      <AddressDisplay
                        address={decodedTransaction.details.token.address}
                        network={connectionState.network || 'ethereum'}
                        truncate={true}
                        truncateLength={6}
                      />
                    </DetailValue>
                  </DetailRow>
                </>
              )}

              {/* Show decoded parameters if available */}
              {decodedTransaction?.details?.decodedInputs && decodedTransaction.details.decodedInputs.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <ParameterDisplay
                    parameters={decodedTransaction.details.decodedInputs}
                    network={connectionState.network || 'ethereum'}
                    compact={true}
                  />
                </div>
              )}

              {preSelectedAsset?.type === 'erc20' && (
                <>
                  <DetailRow>
                    <DetailLabel>Function:</DetailLabel>
                    <DetailValue style={{ color: '#4ECDC4' }}>
                      ERC-20 Transfer Function
                    </DetailValue>
                  </DetailRow>
                  <DetailRow>
                    <DetailLabel>Raw Data:</DetailLabel>
                    <DetailValue style={{
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#888',
                      wordBreak: 'break-all',
                      cursor: 'pointer'
                    }}
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

          {error && (
            <ErrorMessage>
              {error}
              {showAddressBookWarning && (
                <div style={{ marginTop: '12px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#495057' }}>
                    💡 How to add an address to your address book:
                  </div>
                  <ol style={{ margin: 0, paddingLeft: '20px', color: '#6c757d', fontSize: '14px' }}>
                    <li>Go to the <strong>Address Book</strong> page</li>
                    <li>Click <strong>"Add Address"</strong></li>
                    <li>Enter the recipient's address and a name</li>
                    <li>Submit the transaction to add them</li>
                    <li>Return here to send your transaction</li>
                  </ol>
                </div>
              )}
            </ErrorMessage>
          )}
          {success && <SuccessMessage>{success}</SuccessMessage>}

          <ButtonGroup>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isLoading}
              data-1p-ignore="true"
              data-lpignore="true"
            >
              Cancel
            </Button>
            {!connectionState.signerConnected ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleConnectSigner}
                disabled={isLoading}
                data-1p-ignore="true"
                data-lpignore="true"
              >
                Connect Wallet to Sign
              </Button>
            ) : (
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading || !toAddress || !amount}
                data-1p-ignore="true"
                data-lpignore="true"
                rightIcon={!isLoading ? (
                  <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.6819 10.4036C13.0879 10.4043 12.603 9.91941 12.6038 9.32544L12.6038 5.83327L5.29387 13.1432C4.87451 13.5625 4.18827 13.5625 3.76891 13.1432C3.34878 12.723 3.34955 12.0376 3.76891 11.6182L11.0788 4.30831L7.58589 4.30755C6.99268 4.30755 6.50774 3.82261 6.50774 3.2294C6.50774 2.63619 6.99268 2.15126 7.58589 2.15126L13.6819 2.15202C13.7719 2.15049 13.8527 2.18252 13.9358 2.2031C13.9869 2.21607 14.0403 2.21454 14.0906 2.23437C14.1356 2.2519 14.1707 2.28698 14.2111 2.31214C14.4162 2.43032 14.5862 2.60188 14.6777 2.82148C14.6968 2.86951 14.6953 2.92136 14.7075 2.97168C14.7296 3.05632 14.7601 3.13714 14.7601 3.23017L14.7601 9.32544C14.7601 9.91865 14.2751 10.4036 13.6819 10.4036Z" fill="currentColor" />
                  </svg>
                ) : undefined}
              >
                {isLoading ?
                  (currentStep === 'proposing' ? 'Proposing Transaction...' : 'Creating Transaction...') :
                  'Propose Transaction'
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
