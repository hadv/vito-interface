import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import SafeManagementService from '../../../services/SafeManagementService';
import AddressDisplay from './AddressDisplay';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[8]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const InfoGrid = styled.div`
  display: grid;
  gap: ${theme.spacing[4]};
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${theme.spacing[3]} 0;
  border-bottom: 1px solid ${theme.colors.neutral[700]};

  &:last-child {
    border-bottom: none;
  }
`;

const InfoLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
  min-width: 140px;
`;

const InfoValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  text-align: right;
  flex: 1;
  word-break: break-all;
`;

const SignersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const SignerItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  padding: ${theme.spacing[2]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const SignerIndex = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: ${theme.colors.primary[400]};
  color: ${theme.colors.neutral[900]};
  border-radius: 50%;
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.bold};
  flex-shrink: 0;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${theme.spacing[8]};
  color: ${theme.colors.text.secondary};
`;

const ErrorState = styled.div`
  padding: ${theme.spacing[4]};
  background: ${theme.colors.status.error}20;
  border: 1px solid ${theme.colors.status.error}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.error};
  font-size: ${theme.typography.fontSize.sm};
`;

const ThresholdBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing[1]};
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  background: ${theme.colors.primary[400]}20;
  color: ${theme.colors.primary[400]};
  border: 1px solid ${theme.colors.primary[400]}30;
  border-radius: ${theme.borderRadius.sm};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
`;

const Description = styled.p`
  margin: ${theme.spacing[2]} 0 0 0;
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.tertiary};
  line-height: 1.4;
`;

const ManagementActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[4]};
  margin-top: ${theme.spacing[4]};
  padding-top: ${theme.spacing[4]};
  border-top: 1px solid ${theme.colors.neutral[700]};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
  flex-wrap: wrap;
`;

const ActionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
`;

const ActionLabel = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
`;

const SignerActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  margin-left: auto;
`;

const RemoveButton = styled(Button)`
  padding: ${theme.spacing[1]} ${theme.spacing[2]};
  font-size: ${theme.typography.fontSize.xs};
`;

const SuccessMessage = styled.div`
  padding: ${theme.spacing[3]};
  background: ${theme.colors.status.success}20;
  border: 1px solid ${theme.colors.status.success}30;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.status.success};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing[3]};
`;

interface SafeInfo {
  address: string;
  owners: string[];
  threshold: number;
  balance: string;
  chainId: number;
  nonce: number;
  version?: string;
}

interface SafeSetupTabProps {
  network: string;
}

const SafeSetupTab: React.FC<SafeSetupTabProps> = ({ network }) => {
  const [safeInfo, setSafeInfo] = useState<SafeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Management state
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newThreshold, setNewThreshold] = useState(1);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSafeInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const info = await safeWalletService.getEnhancedSafeInfo();
        setSafeInfo(info);
        setNewThreshold(info.threshold); // Initialize with current threshold
      } catch (err: any) {
        console.error('Error loading Safe info:', err);
        setError(err.message || 'Failed to load Safe information');
      } finally {
        setIsLoading(false);
      }
    };

    loadSafeInfo();
  }, [network]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleAddOwner = async () => {
    if (!safeInfo || !newOwnerAddress) return;

    try {
      setIsCreatingTransaction(true);
      setError(null);

      // Validate address
      if (!newOwnerAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        throw new Error('Invalid Ethereum address');
      }

      // Check if owner already exists
      if (safeInfo.owners.some(owner => owner.toLowerCase() === newOwnerAddress.toLowerCase())) {
        throw new Error('Address is already an owner');
      }

      // Create transaction
      const txData = SafeManagementService.createAddOwnerTransaction(
        safeInfo.address,
        newOwnerAddress,
        newThreshold,
        safeInfo.nonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      setSuccessMessage(`Transaction created to add owner ${newOwnerAddress.slice(0, 6)}...${newOwnerAddress.slice(-4)}`);
      setNewOwnerAddress('');
    } catch (err: any) {
      console.error('Error creating add owner transaction:', err);
      setError(err.message || 'Failed to create add owner transaction');
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleRemoveOwner = async (ownerToRemove: string) => {
    if (!safeInfo) return;

    try {
      setIsCreatingTransaction(true);
      setError(null);

      // Check if removal is valid
      if (!SafeManagementService.canRemoveOwner(safeInfo.owners.length, newThreshold)) {
        throw new Error(`Cannot remove owner: would leave ${safeInfo.owners.length - 1} owners but threshold is ${newThreshold}`);
      }

      // Find previous owner
      const prevOwner = SafeManagementService.findPrevOwner(safeInfo.owners, ownerToRemove);

      // Create transaction
      const txData = SafeManagementService.createRemoveOwnerTransaction(
        safeInfo.address,
        prevOwner,
        ownerToRemove,
        newThreshold,
        safeInfo.nonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      setSuccessMessage(`Transaction created to remove owner ${ownerToRemove.slice(0, 6)}...${ownerToRemove.slice(-4)}`);
    } catch (err: any) {
      console.error('Error creating remove owner transaction:', err);
      setError(err.message || 'Failed to create remove owner transaction');
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  const handleChangeThreshold = async () => {
    if (!safeInfo) return;

    try {
      setIsCreatingTransaction(true);
      setError(null);

      // Validate threshold
      if (!SafeManagementService.validateThreshold(newThreshold, safeInfo.owners.length)) {
        throw new Error(`Invalid threshold: must be between 1 and ${safeInfo.owners.length}`);
      }

      if (newThreshold === safeInfo.threshold) {
        throw new Error('New threshold is the same as current threshold');
      }

      // Create transaction
      const txData = SafeManagementService.createChangeThresholdTransaction(
        safeInfo.address,
        newThreshold,
        safeInfo.nonce
      );

      // Create and propose transaction
      await safeWalletService.createTransaction({
        to: txData.to,
        value: txData.value,
        data: txData.data
      });

      setSuccessMessage(`Transaction created to change threshold to ${newThreshold}`);
    } catch (err: any) {
      console.error('Error creating change threshold transaction:', err);
      setError(err.message || 'Failed to create change threshold transaction');
    } finally {
      setIsCreatingTransaction(false);
    }
  };

  if (isLoading) {
    return (
      <Container>
        <LoadingState>Loading Safe information...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <strong>Error loading Safe information:</strong><br />
          {error}
        </ErrorState>
      </Container>
    );
  }

  if (!safeInfo) {
    return (
      <Container>
        <ErrorState>No Safe information available</ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      {/* Basic Information */}
      <Section>
        <SectionTitle>Safe Account Information</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Safe Account Nonce</InfoLabel>
            <InfoValue>{safeInfo.nonce}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Contract Version</InfoLabel>
            <InfoValue>{safeInfo.version || 'Unknown'}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Chain ID</InfoLabel>
            <InfoValue>{safeInfo.chainId}</InfoValue>
          </InfoItem>
          <InfoItem>
            <InfoLabel>Safe Address</InfoLabel>
            <InfoValue>
              <AddressDisplay
                address={safeInfo.address}
                network={network}
                truncate={false}
                showCopy={true}
                showExplorer={true}
              />
            </InfoValue>
          </InfoItem>
        </InfoGrid>
      </Section>

      {/* Signers */}
      <Section>
        <SectionTitle>Signers</SectionTitle>
        <Description>
          Signers have full control over the account. They can propose, sign and execute transactions, as well as reject them.
        </Description>
        <SignersList>
          {safeInfo.owners.map((owner, index) => (
            <SignerItem key={owner}>
              <SignerIndex>{index + 1}</SignerIndex>
              <AddressDisplay
                address={owner}
                network={network}
                truncate={true}
                truncateLength={6}
                showCopy={true}
                showExplorer={true}
              />
              <SignerActions>
                <RemoveButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveOwner(owner)}
                  disabled={isCreatingTransaction || safeInfo.owners.length <= 1}
                >
                  Remove
                </RemoveButton>
              </SignerActions>
            </SignerItem>
          ))}
        </SignersList>

        <ManagementActions>
          <ActionGroup>
            <ActionLabel>Add New Signer</ActionLabel>
            <ActionRow>
              <Input
                placeholder="0x... (Ethereum address)"
                value={newOwnerAddress}
                onChange={(e) => setNewOwnerAddress(e.target.value)}
                disabled={isCreatingTransaction}
                style={{ flex: 1, minWidth: '300px' }}
              />
              <Button
                variant="primary"
                onClick={handleAddOwner}
                disabled={isCreatingTransaction || !newOwnerAddress}
                loading={isCreatingTransaction}
              >
                Add Signer
              </Button>
            </ActionRow>
          </ActionGroup>
        </ManagementActions>
      </Section>

      {/* Threshold */}
      <Section>
        <SectionTitle>Required Confirmations</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Current Threshold</InfoLabel>
            <InfoValue>
              <ThresholdBadge>
                {safeInfo.threshold} out of {safeInfo.owners.length} signers
              </ThresholdBadge>
            </InfoValue>
          </InfoItem>
        </InfoGrid>
        <Description>
          Any transaction requires the confirmation of {safeInfo.threshold} out of {safeInfo.owners.length} signers.
          Signers can make Safe transactions to add/remove signers as well as update the threshold.
        </Description>

        <ManagementActions>
          <ActionGroup>
            <ActionLabel>Update Threshold</ActionLabel>
            <ActionRow>
              <Input
                type="number"
                min={1}
                max={safeInfo.owners.length}
                value={newThreshold}
                onChange={(e) => setNewThreshold(parseInt(e.target.value) || 1)}
                disabled={isCreatingTransaction}
                style={{ width: '120px' }}
              />
              <span style={{ color: theme.colors.text.secondary, fontSize: theme.typography.fontSize.sm }}>
                out of {safeInfo.owners.length} signers
              </span>
              <Button
                variant="primary"
                onClick={handleChangeThreshold}
                disabled={isCreatingTransaction || newThreshold === safeInfo.threshold}
                loading={isCreatingTransaction}
              >
                Update Threshold
              </Button>
            </ActionRow>
          </ActionGroup>
        </ManagementActions>
      </Section>

      {/* Success Message */}
      {successMessage && (
        <SuccessMessage>
          ✅ {successMessage}
        </SuccessMessage>
      )}
    </Container>
  );
};

export default SafeSetupTab;
