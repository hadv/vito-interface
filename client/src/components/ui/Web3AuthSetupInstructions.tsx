/**
 * Web3Auth Setup Instructions Component
 * 
 * This component displays setup instructions when Web3Auth Client ID is not configured.
 */

import React from 'react';
import styled from 'styled-components';

const InstructionsContainer = styled.div`
  background: #1a1a1a;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  color: #ffffff;
`;

const Title = styled.h3`
  color: #f59e0b;
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StepList = styled.ol`
  margin: 16px 0;
  padding-left: 20px;
  
  li {
    margin: 8px 0;
    line-height: 1.5;
  }
`;

const CodeBlock = styled.code`
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #0ea5e9;
`;

const LinkButton = styled.a`
  color: #3b82f6;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    text-decoration: underline;
  }
`;

const WarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
  </svg>
);

interface Web3AuthSetupInstructionsProps {
  onClose?: () => void;
}

export const Web3AuthSetupInstructions: React.FC<Web3AuthSetupInstructionsProps> = ({ onClose }) => {
  return (
    <InstructionsContainer>
      <Title>
        <WarningIcon />
        Web3Auth Setup Required
      </Title>
      
      <p>
        Web3Auth Client ID is not configured. Follow these steps to set up Web3Auth social login:
      </p>
      
      <StepList>
        <li>
          Visit <LinkButton href="https://dashboard.web3auth.io/" target="_blank" rel="noopener noreferrer">
            Web3Auth Dashboard
          </LinkButton>
        </li>
        <li>Create a new project or select an existing one</li>
        <li>Copy your <strong>Client ID</strong> from the project dashboard</li>
        <li>
          Create a <CodeBlock>.env.local</CodeBlock> file in the <CodeBlock>client</CodeBlock> directory
        </li>
        <li>
          Add this line to the file:<br/>
          <CodeBlock>REACT_APP_WEB3AUTH_CLIENT_ID=your-client-id-here</CodeBlock>
        </li>
        <li>Restart the development server</li>
        <li>
          Configure your domain in Web3Auth Dashboard:
          <ul style={{ marginTop: '8px' }}>
            <li>Add <CodeBlock>http://localhost:3000</CodeBlock> for development</li>
            <li>Add your production domain when deploying</li>
          </ul>
        </li>
      </StepList>
      
      <p style={{ marginTop: '16px', fontSize: '14px', color: '#9CA3AF' }}>
        <strong>Note:</strong> Web3Auth handles Google OAuth configuration internally. 
        You don't need to set up Google OAuth separately.
      </p>
      
      {onClose && (
        <button
          onClick={onClose}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: '#374151',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      )}
    </InstructionsContainer>
  );
};

export default Web3AuthSetupInstructions;
