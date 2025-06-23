import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';
import AddressDisplay from './AddressDisplay';
import Button from '../../ui/Button';
import AddSignerModal from './AddSignerModal';
import RemoveSignerModal from './RemoveSignerModal';
import UpdateThresholdModal from './UpdateThresholdModal';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: ${theme.spacing[8]}; /* Add bottom padding for better scrolling */
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

  // Modal state
  const [showAddSignerModal, setShowAddSignerModal] = useState(false);
  const [showRemoveSignerModal, setShowRemoveSignerModal] = useState(false);
  const [showUpdateThresholdModal, setShowUpdateThresholdModal] = useState(false);
  const [signerToRemove, setSignerToRemove] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadSafeInfo = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const info = await safeWalletService.getEnhancedSafeInfo();
        setSafeInfo(info);
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

  const handleRemoveSignerClick = (ownerAddress: string) => {
    setSignerToRemove(ownerAddress);
    setShowRemoveSignerModal(true);
  };

  const handleModalSuccess = (message: string) => {
    setSuccessMessage(message);
    // Refresh Safe info after successful transaction
    const loadSafeInfo = async () => {
      try {
        const info = await safeWalletService.getEnhancedSafeInfo();
        setSafeInfo(info);
      } catch (err) {
        console.error('Error refreshing Safe info:', err);
      }
    };
    loadSafeInfo();
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
            <InfoLabel>Safe Transaction Nonce</InfoLabel>
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
                  onClick={() => handleRemoveSignerClick(owner)}
                  disabled={safeInfo.owners.length <= 1}
                >
                  Remove
                </RemoveButton>
              </SignerActions>
            </SignerItem>
          ))}
        </SignersList>

        <ManagementActions>
          <ActionRow>
            <Button
              variant="primary"
              onClick={() => setShowAddSignerModal(true)}
            >
              Add Signer
            </Button>
            <Description style={{ margin: 0, flex: 1 }}>
              Add a new signer to the Safe wallet and set the new threshold
            </Description>
          </ActionRow>
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
          <ActionRow>
            <Button
              variant="secondary"
              onClick={() => setShowUpdateThresholdModal(true)}
            >
              Update Threshold
            </Button>
            <Description style={{ margin: 0, flex: 1 }}>
              Change the number of required confirmations for transactions
            </Description>
          </ActionRow>
        </ManagementActions>
      </Section>

      {/* Success Message */}
      {successMessage && (
        <SuccessMessage>
          ✅ {successMessage}
        </SuccessMessage>
      )}

      {/* Modal Components */}
      <AddSignerModal
        isOpen={showAddSignerModal}
        onClose={() => setShowAddSignerModal(false)}
        currentOwners={safeInfo.owners}
        currentThreshold={safeInfo.threshold}
        currentNonce={safeInfo.nonce}
        network={network}
        safeAddress={safeInfo.address}
        onSuccess={handleModalSuccess}
      />

      <RemoveSignerModal
        isOpen={showRemoveSignerModal}
        onClose={() => {
          setShowRemoveSignerModal(false);
          setSignerToRemove(null);
        }}
        signerToRemove={signerToRemove}
        currentOwners={safeInfo.owners}
        currentThreshold={safeInfo.threshold}
        currentNonce={safeInfo.nonce}
        network={network}
        onSuccess={handleModalSuccess}
      />

      <UpdateThresholdModal
        isOpen={showUpdateThresholdModal}
        onClose={() => setShowUpdateThresholdModal(false)}
        currentThreshold={safeInfo.threshold}
        ownerCount={safeInfo.owners.length}
        currentNonce={safeInfo.nonce}
        network={network}
        safeAddress={safeInfo.address}
        onSuccess={handleModalSuccess}
      />
    </Container>
  );
};

export default SafeSetupTab;
