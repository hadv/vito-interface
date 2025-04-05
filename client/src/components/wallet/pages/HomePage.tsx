import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  padding: 24px;
`;

const Heading = styled.h1`
  font-size: 24px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #fff;
`;

const InfoText = styled.p`
  font-size: 16px;
  color: #9ca3af;
  margin-bottom: 16px;
  line-height: 1.5;
`;

interface HomePageProps {
  walletAddress: string;
  ensName?: string;
  network: string;
}

const HomePage: React.FC<HomePageProps> = ({
  walletAddress,
  ensName,
  network
}) => {
  return (
    <Container>
      <Heading>Welcome to your Safe Wallet</Heading>
      
      <InfoText>
        Your wallet is ready to use. You can navigate using the sidebar menu
        or command prompt to manage your assets and transactions.
      </InfoText>
      
      <InfoText>
        Connected to <strong>{network}</strong> network with address{' '}
        <strong>{ensName || walletAddress}</strong>.
      </InfoText>
      
      <InfoText>
        Use the <code>assets</code> command to view your tokens, or
        the <code>transactions</code> command to see your transaction history.
      </InfoText>
    </Container>
  );
};

export default HomePage; 