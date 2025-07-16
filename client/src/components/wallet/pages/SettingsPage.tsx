import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import NetworkConfigStatus from '../components/NetworkConfigStatus';
import SafeSetupTab from '../components/SafeSetupTab';
import SmartContractGuardSection from '../components/SmartContractGuardSection';
import TrustedContractsSection from '../components/TrustedContractsSection';

const Container = styled.div`
  padding: 0;
  height: 100%;
  overflow-y: auto;
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const Heading = styled.h1`
  font-size: ${theme.typography.fontSize['3xl']};
  font-weight: ${theme.typography.fontWeight.bold};
  margin-bottom: ${theme.spacing[4]};
  color: ${theme.colors.primary[400]};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

// Horizontal tabs (matching TransactionsPage style)
const TabsContainer = styled.div`
  display: flex;
  border-bottom: 1px solid ${theme.colors.neutral[700]};
  margin-bottom: ${theme.spacing[6]};
  position: relative;
`;

const Tab = styled.button<{ isActive: boolean }>`
  padding: ${theme.spacing[4]} ${theme.spacing[6]};
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${props => props.isActive ? '700' : '600'};
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  letter-spacing: 0.025em;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  background: transparent;
  position: relative;
  color: ${props => props.isActive
    ? theme.colors.primary[400]
    : theme.colors.text.tertiary
  };

  /* Professional underline animation */
  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, ${theme.colors.primary[400]}, ${theme.colors.primary[300]});
    transform: scaleX(${props => props.isActive ? '1' : '0'});
    transform-origin: center;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 1px;
  }

  /* Hover effects */
  &:hover {
    color: ${props => props.isActive
      ? theme.colors.primary[300]
      : theme.colors.text.secondary
    };

    &::after {
      transform: scaleX(${props => props.isActive ? '1' : '0.5'});
      opacity: ${props => props.isActive ? '1' : '0.6'};
    }
  }

  /* Focus states for accessibility */
  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${theme.colors.primary[400]}40;
    border-radius: ${theme.borderRadius.sm};
  }

  /* Active press state */
  &:active {
    transform: translateY(1px);
  }
`;

const TabContent = styled.div`
  height: calc(100vh - 200px); /* Adjust based on header height */
  overflow-y: auto;
  padding-right: ${theme.spacing[2]};

  /* Custom scrollbar styling */
  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${theme.colors.neutral[800]};
    border-radius: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${theme.colors.neutral[600]};
    border-radius: 4px;

    &:hover {
      background: ${theme.colors.neutral[500]};
    }
  }

  /* Firefox scrollbar */
  scrollbar-width: thin;
  scrollbar-color: ${theme.colors.neutral[600]} ${theme.colors.neutral[800]};
`;

interface SettingsPageProps {
  network?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ network = 'ethereum' }) => {
  // TODO: Add 'trusted' back to union type after new SafeTxPool contract deployment
  const [activeTab, setActiveTab] = useState<'setup' | 'security' | 'network' | 'about'>('setup');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'setup':
        return <SafeSetupTab network={network} />;
      case 'security':
        return <SmartContractGuardSection network={network} />;
      // TODO: Enable after new SafeTxPool contract deployment
      // case 'trusted':
      //   return <TrustedContractsSection network={network} />;
      case 'network':
        return (
          <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: theme.spacing[8] }}>
            <Section>
              <SectionTitle>Network Configuration</SectionTitle>
              <SectionDescription>
                View the configuration status of Safe TX Pool contracts across different networks.
                Properly configured networks enable full transaction functionality including
                transaction proposals and multi-signature workflows.
              </SectionDescription>
              <NetworkConfigStatus />
            </Section>
          </div>
        );
      case 'about':
        return (
          <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: theme.spacing[8] }}>
            <Section>
              <SectionTitle>About</SectionTitle>
              <SectionDescription>
                Vito Safe Wallet Interface provides a modern, user-friendly interface for
                interacting with Safe (formerly Gnosis Safe) multi-signature wallets.
                Features include read-only wallet viewing, transaction creation, and
                multi-network support.
              </SectionDescription>
            </Section>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Container>
      <Header>
        <Heading>Settings</Heading>
      </Header>

      {/* Tab Navigation */}
      <TabsContainer>
        <Tab
          isActive={activeTab === 'setup'}
          onClick={() => setActiveTab('setup')}
        >
          Setup
        </Tab>
        <Tab
          isActive={activeTab === 'security'}
          onClick={() => setActiveTab('security')}
        >
          Security
        </Tab>
        {/* TODO: Enable after new SafeTxPool contract deployment */}
        {/* <Tab
          isActive={activeTab === 'trusted'}
          onClick={() => setActiveTab('trusted')}
        >
          Trusted Contracts
        </Tab> */}
        <Tab
          isActive={activeTab === 'network'}
          onClick={() => setActiveTab('network')}
        >
          Network
        </Tab>
        <Tab
          isActive={activeTab === 'about'}
          onClick={() => setActiveTab('about')}
        >
          About
        </Tab>
      </TabsContainer>

      {/* Tab Content with individual scrolling */}
      <TabContent>
        {renderTabContent()}
      </TabContent>
    </Container>
  );
};

export default SettingsPage; 