import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 1rem;
`;

const Heading = styled.h1`
  margin-top: 0;
  color: #d4d4d4;
`;

const SettingsText = styled.p`
  color: #d4d4d4;
`;

const SettingsPage: React.FC = () => {
  return (
    <Container>
      <Heading>Safe Wallet Settings</Heading>
      <SettingsText>Settings options will be available here.</SettingsText>
    </Container>
  );
};

export default SettingsPage; 