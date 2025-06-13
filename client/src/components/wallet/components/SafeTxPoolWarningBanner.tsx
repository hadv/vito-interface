import React from 'react';
import styled from 'styled-components';
import { isSafeTxPoolConfigured } from '../../../contracts/abis';
import { theme } from '../../../theme';

const BannerContainer = styled.div`
  background: linear-gradient(135deg, ${theme.colors.status.warning}15, ${theme.colors.status.error}15);
  border: 1px solid ${theme.colors.status.warning}30;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin: ${theme.spacing[4]} 0;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const IconContainer = styled.div`
  width: 40px;
  height: 40px;
  border-radius: ${theme.borderRadius.full};
  background: ${theme.colors.status.warning}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.status.warning};
  flex-shrink: 0;
`;

const TextContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[1]};
  flex: 1;
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const Description = styled.p`
  margin: 0;
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  line-height: 1.4;
`;

const ActionContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[2]};
  align-items: flex-end;
`;

const ConfigButton = styled.button`
  background: ${theme.colors.status.warning};
  color: ${theme.colors.background.primary};
  border: none;
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${theme.colors.status.warning}dd;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`;

const LearnMoreLink = styled.a`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.status.warning};
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

interface SafeTxPoolWarningBannerProps {
  network: string;
  onOpenSettings?: () => void;
  className?: string;
}

const SafeTxPoolWarningBanner: React.FC<SafeTxPoolWarningBannerProps> = ({ 
  network, 
  onOpenSettings,
  className 
}) => {
  // Only show banner if Safe TX Pool is not configured for the current network
  if (isSafeTxPoolConfigured(network)) {
    return null;
  }

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  const handleLearnMore = () => {
    // Open the configuration guide
    window.open('https://github.com/your-repo/vito-interface/blob/main/SAFE_TX_POOL_CONFIGURATION.md', '_blank');
  };

  return (
    <BannerContainer className={className}>
      <IconContainer>
        <WarningIcon />
      </IconContainer>
      <TextContainer>
        <Title>Safe TX Pool Not Configured</Title>
        <Description>
          Transaction features are limited on {network} because the Safe TX Pool contract 
          is not configured. Configure the contract address to enable transaction proposals 
          and multi-signature workflows.
        </Description>
      </TextContainer>
      <ActionContainer>
        {onOpenSettings && (
          <ConfigButton onClick={handleOpenSettings}>
            View Settings
          </ConfigButton>
        )}
        <LearnMoreLink onClick={handleLearnMore}>
          Learn More
        </LearnMoreLink>
      </ActionContainer>
    </BannerContainer>
  );
};

export default SafeTxPoolWarningBanner;
