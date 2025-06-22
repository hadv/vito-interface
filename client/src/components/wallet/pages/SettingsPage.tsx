import React from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import NetworkConfigStatus from '../components/NetworkConfigStatus';

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

const Content = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 0 ${theme.spacing[6]};
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

const SettingsPage: React.FC = () => {
  return (
    <Container>
      <Header>
        <Heading>Vito Wallet Settings</Heading>
      </Header>

      <Content>
        <Section>
          <SectionTitle>Network Configuration</SectionTitle>
          <SectionDescription>
            View the configuration status of Safe TX Pool contracts across different networks.
            Properly configured networks enable full transaction functionality including
            transaction proposals and multi-signature workflows.
          </SectionDescription>
          <NetworkConfigStatus />
        </Section>

        <Section>
          <SectionTitle>About</SectionTitle>
          <SectionDescription>
            Vito Safe Wallet Interface provides a modern, user-friendly interface for
            interacting with Safe (formerly Gnosis Safe) multi-signature wallets.
            Features include read-only wallet viewing, transaction creation, and
            multi-network support.
          </SectionDescription>
        </Section>
      </Content>
    </Container>
  );
};

export default SettingsPage; 