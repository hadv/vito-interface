import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import NetworkConfigStatus from '../components/NetworkConfigStatus';
import SafeSetupTab from '../components/SafeSetupTab';

const Container = styled.div`
  display: flex;
  height: 100%;
  overflow: hidden;
`;

const LeftSidebar = styled.div`
  width: 280px;
  background: ${theme.colors.background.secondary};
  border-right: 1px solid ${theme.colors.border.primary};
  display: flex;
  flex-direction: column;
  overflow-y: auto;
`;

const MainContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${theme.spacing[6]};
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

const SidebarHeader = styled.div`
  padding: ${theme.spacing[6]} ${theme.spacing[4]} ${theme.spacing[4]};
  border-bottom: 1px solid ${theme.colors.border.primary};
`;

const SidebarTitle = styled.h2`
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin: 0;
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

// Left sidebar navigation
const TabsContainer = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${theme.spacing[2]} 0;
`;

const Tab = styled.button<{ isActive: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${props => props.isActive ? '600' : '500'};
  font-family: ${theme.typography.fontFamily.sans.join(', ')};
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  background: ${props => props.isActive
    ? theme.colors.primary[400] + '20'
    : 'transparent'
  };
  color: ${props => props.isActive
    ? theme.colors.primary[400]
    : theme.colors.text.secondary
  };
  border-left: 3px solid ${props => props.isActive
    ? theme.colors.primary[400]
    : 'transparent'
  };

  /* Hover effects */
  &:hover {
    background: ${props => props.isActive
      ? theme.colors.primary[400] + '30'
      : theme.colors.neutral[800]
    };
    color: ${props => props.isActive
      ? theme.colors.primary[300]
      : theme.colors.text.primary
    };
  }

  /* Focus states for accessibility */
  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px ${theme.colors.primary[400]}40;
  }

  /* Active press state */
  &:active {
    transform: translateX(2px);
  }
`;

const TabContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
`;

interface SettingsPageProps {
  network?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ network = 'ethereum' }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'network' | 'about'>('setup');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'setup':
        return <SafeSetupTab network={network} />;
      case 'network':
        return (
          <Section>
            <SectionTitle>Network Configuration</SectionTitle>
            <SectionDescription>
              View the configuration status of Safe TX Pool contracts across different networks.
              Properly configured networks enable full transaction functionality including
              transaction proposals and multi-signature workflows.
            </SectionDescription>
            <NetworkConfigStatus />
          </Section>
        );
      case 'about':
        return (
          <Section>
            <SectionTitle>About</SectionTitle>
            <SectionDescription>
              Vito Safe Wallet Interface provides a modern, user-friendly interface for
              interacting with Safe (formerly Gnosis Safe) multi-signature wallets.
              Features include read-only wallet viewing, transaction creation, and
              multi-network support.
            </SectionDescription>
          </Section>
        );
      default:
        return null;
    }
  };

  return (
    <Container>
      {/* Left Sidebar with Tabs */}
      <LeftSidebar>
        <SidebarHeader>
          <SidebarTitle>Settings</SidebarTitle>
        </SidebarHeader>

        <TabsContainer>
          <Tab
            isActive={activeTab === 'setup'}
            onClick={() => setActiveTab('setup')}
          >
            Setup
          </Tab>
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
      </LeftSidebar>

      {/* Main Content */}
      <MainContent>
        <Header>
          <Heading>
            {activeTab === 'setup' && 'Safe Wallet Setup'}
            {activeTab === 'network' && 'Network Configuration'}
            {activeTab === 'about' && 'About Vito Wallet'}
          </Heading>
        </Header>

        <TabContent>
          {renderTabContent()}
        </TabContent>
      </MainContent>
    </Container>
  );
};

export default SettingsPage; 