import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { safeWalletService } from '../../../services/SafeWalletService';

import AddressDisplay from './AddressDisplay';

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
            </SignerItem>
          ))}
        </SignersList>
      </Section>

      {/* Threshold */}
      <Section>
        <SectionTitle>Required Confirmations</SectionTitle>
        <InfoGrid>
          <InfoItem>
            <InfoLabel>Threshold</InfoLabel>
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
      </Section>
    </Container>
  );
};

export default SafeSetupTab;
