import React, { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ethers } from 'ethers';
import { useToast } from '../../../hooks/useToast';
import { ErrorHandler } from '../../../utils/errorHandling';
import { errorRecoveryService } from '../../../services/ErrorRecoveryService';

interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  optional?: boolean;
}

interface TransactionConfirmationFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: any) => void;
  transactionData: {
    to: string;
    amount: string;
    token?: string;
    data?: string;
  };
  steps: TransactionStep[];
  currentStepId: string;
  onStepUpdate: (stepId: string, status: TransactionStep['status']) => void;
}

const pulse = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: ${slideIn} 0.3s ease-out;
`;

const Modal = styled.div`
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

const Subtitle = styled.p`
  color: #9ca3af;
  font-size: 0.875rem;
  line-height: 1.5;
`;

const StepsContainer = styled.div`
  margin-bottom: 2rem;
`;

const StepItem = styled.div<{ status: TransactionStep['status']; isActive: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  margin-bottom: 0.75rem;
  transition: all 0.3s ease;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: rgba(14, 165, 233, 0.1);
          border: 1px solid rgba(14, 165, 233, 0.3);
        `;
      case 'failed':
        return `
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        `;
      case 'active':
        return `
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          animation: ${pulse} 2s infinite;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.1);
          border: 1px solid rgba(107, 114, 128, 0.2);
        `;
    }
  }}
`;

const StepIcon = styled.div<{ status: TransactionStep['status'] }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return `
          background: #0ea5e9;
          color: white;
        `;
      case 'failed':
        return `
          background: #ef4444;
          color: white;
        `;
      case 'active':
        return `
          background: #3b82f6;
          color: white;
          animation: ${spin} 1s linear infinite;
        `;
      default:
        return `
          background: rgba(107, 114, 128, 0.3);
          color: #9ca3af;
        `;
    }
  }}
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div<{ status: TransactionStep['status'] }>`
  font-weight: 600;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
  
  ${props => {
    switch (props.status) {
      case 'completed':
        return 'color: #0ea5e9;';
      case 'failed':
        return 'color: #ef4444;';
      case 'active':
        return 'color: #3b82f6;';
      default:
        return 'color: #9ca3af;';
    }
  }}
`;

const StepDescription = styled.div`
  color: #9ca3af;
  font-size: 0.75rem;
  line-height: 1.4;
`;

const TransactionDetails = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 2rem;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const DetailLabel = styled.span`
  color: #9ca3af;
  font-size: 0.875rem;
`;

const DetailValue = styled.span`
  color: #ffffff;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: 'Courier New', monospace;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
`;

const Button = styled.button<{ variant: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
          &:disabled { background: #6b7280; cursor: not-allowed; }
        `;
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      default:
        return `
          background: rgba(255, 255, 255, 0.1);
          color: #d1d5db;
          border: 1px solid rgba(255, 255, 255, 0.2);
          &:hover { background: rgba(255, 255, 255, 0.2); }
        `;
    }
  }}
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #fca5a5;
  font-size: 0.875rem;
`;

const RetryButton = styled(Button)`
  margin-top: 0.5rem;
`;

const getStepIcon = (status: TransactionStep['status']): string => {
  switch (status) {
    case 'completed':
      return '✓';
    case 'failed':
      return '✗';
    case 'active':
      return '⟳';
    default:
      return '○';
  }
};

const TransactionConfirmationFlow: React.FC<TransactionConfirmationFlowProps> = ({
  isOpen,
  onClose,
  onComplete,
  transactionData,
  steps,
  currentStepId,
  onStepUpdate
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const toast = useToast();

  const currentStep = steps.find(step => step.id === currentStepId);
  const currentStepIndex = steps.findIndex(step => step.id === currentStepId);
  const isLastStep = currentStepIndex === steps.length - 1;
  const hasFailedSteps = steps.some(step => step.status === 'failed');

  useEffect(() => {
    if (currentStep?.status === 'failed' && error) {
      const errorDetails = ErrorHandler.classifyError(new Error(error));
      
      if (ErrorHandler.shouldAutoRetry(errorDetails) && retryCount < 3) {
        const delay = ErrorHandler.getRetryDelay(errorDetails, retryCount + 1);
        
        setTimeout(() => {
          handleRetry();
        }, delay);
      }
    }
  }, [currentStep?.status, error, retryCount]);

  const handleRetry = async () => {
    if (!currentStep) return;

    setIsRetrying(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    try {
      // Reset current step to active
      onStepUpdate(currentStep.id, 'active');
      
      // Simulate retry logic - in real implementation, this would call the actual operation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For demo purposes, randomly succeed or fail
      const success = Math.random() > 0.3;
      
      if (success) {
        onStepUpdate(currentStep.id, 'completed');
        toast.success('Step completed successfully');
        
        // Move to next step if not last
        if (!isLastStep) {
          const nextStep = steps[currentStepIndex + 1];
          if (nextStep) {
            onStepUpdate(nextStep.id, 'active');
          }
        } else {
          onComplete({ success: true });
        }
      } else {
        throw new Error('Retry failed');
      }
    } catch (err: any) {
      onStepUpdate(currentStep.id, 'failed');
      setError(err.message);
      toast.error('Retry failed', { message: err.message });
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = () => {
    if (hasFailedSteps || currentStep?.status === 'pending') {
      onClose();
    } else {
      // Show confirmation for canceling active transaction
      if (window.confirm('Are you sure you want to cancel this transaction?')) {
        onClose();
      }
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Overlay isOpen={isOpen}>
      <Modal>
        <Header>
          <Title>Transaction Confirmation</Title>
          <Subtitle>
            Please review and confirm your transaction details
          </Subtitle>
        </Header>

        <TransactionDetails>
          <DetailRow>
            <DetailLabel>To:</DetailLabel>
            <DetailValue>{formatAddress(transactionData.to)}</DetailValue>
          </DetailRow>
          <DetailRow>
            <DetailLabel>Amount:</DetailLabel>
            <DetailValue>{transactionData.amount} ETH</DetailValue>
          </DetailRow>
          {transactionData.token && (
            <DetailRow>
              <DetailLabel>Token:</DetailLabel>
              <DetailValue>{formatAddress(transactionData.token)}</DetailValue>
            </DetailRow>
          )}
        </TransactionDetails>

        <StepsContainer>
          {steps.map((step, index) => (
            <StepItem
              key={step.id}
              status={step.status}
              isActive={step.id === currentStepId}
            >
              <StepIcon status={step.status}>
                {getStepIcon(step.status)}
              </StepIcon>
              <StepContent>
                <StepTitle status={step.status}>
                  {step.title}
                  {step.optional && ' (Optional)'}
                </StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </StepContent>
            </StepItem>
          ))}
        </StepsContainer>

        {error && (
          <ErrorMessage>
            <strong>Error:</strong> {error}
            {retryCount < 3 && (
              <RetryButton
                variant="primary"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? 'Retrying...' : `Retry (${3 - retryCount} attempts left)`}
              </RetryButton>
            )}
          </ErrorMessage>
        )}

        <ActionButtons>
          <Button variant="secondary" onClick={handleCancel}>
            {hasFailedSteps ? 'Close' : 'Cancel'}
          </Button>
          
          {currentStep?.status === 'completed' && isLastStep && (
            <Button variant="primary" onClick={() => onComplete({ success: true })}>
              Complete
            </Button>
          )}
        </ActionButtons>
      </Modal>
    </Overlay>
  );
};

export default TransactionConfirmationFlow;
