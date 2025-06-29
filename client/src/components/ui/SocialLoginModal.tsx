import React, { useState } from 'react';
import styled from 'styled-components';
import { web3AuthService, SocialProvider } from '../../services/Web3AuthService';
import { useToast } from '../../hooks/useToast';
import Portal from './Portal';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  box-sizing: border-box;
  overflow-y: auto;
`;

const ModalContainer = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 40px);
  min-height: auto;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  margin: auto;

  /* Ensure modal is always visible on small screens */
  @media (max-height: 600px) {
    max-height: calc(100vh - 20px);
    margin: 10px auto;
  }

  @media (max-height: 500px) {
    max-height: calc(100vh - 10px);
    margin: 5px auto;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 32px;
  border-bottom: 1px solid #334155;
  flex-shrink: 0; /* Prevent header from shrinking */

  /* Adjust padding for smaller screens */
  @media (max-height: 600px) {
    padding: 24px;
  }

  @media (max-height: 500px) {
    padding: 20px;
  }
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #cbd5e1;
  font-size: 28px;
  cursor: pointer;
  padding: 8px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: #334155;
    color: #fff;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const ModalBody = styled.div`
  padding: 24px 32px 32px 32px;
  flex: 1;
  overflow-y: auto;
  min-height: 0; /* Allow flex child to shrink */

  /* Adjust padding for smaller screens */
  @media (max-height: 600px) {
    padding: 20px 24px 24px 24px;
  }

  @media (max-height: 500px) {
    padding: 16px 20px 20px 20px;
  }
`;

const Description = styled.p`
  color: #94a3b8;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 32px 0;
  text-align: center;

  /* Adjust spacing for smaller screens */
  @media (max-height: 600px) {
    margin: 0 0 24px 0;
    font-size: 15px;
  }

  @media (max-height: 500px) {
    margin: 0 0 20px 0;
    font-size: 14px;
  }
`;

const ProvidersGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  /* Adjust gap for smaller screens */
  @media (max-height: 600px) {
    gap: 12px;
  }

  @media (max-height: 500px) {
    gap: 10px;
  }
`;

const ProviderButton = styled.button<{ disabled?: boolean }>`
  background: #334155;
  border: 1px solid #475569;
  border-radius: 12px;
  padding: 20px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 16px;
  opacity: ${props => props.disabled ? 0.6 : 1};
  width: 100%;

  &:hover {
    background: ${props => props.disabled ? '#334155' : '#3b82f6'};
    border-color: ${props => props.disabled ? '#475569' : '#60a5fa'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 8px 25px rgba(59, 130, 246, 0.3)'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(0)'};
  }

  /* Adjust padding for smaller screens */
  @media (max-height: 600px) {
    padding: 16px;
    gap: 14px;
  }

  @media (max-height: 500px) {
    padding: 14px;
    gap: 12px;
  }
`;

const ProviderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;

  /* Adjust size for smaller screens */
  @media (max-height: 600px) {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  @media (max-height: 500px) {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
`;

const ProviderInfo = styled.div`
  flex: 1;
  text-align: left;
`;

const ProviderName = styled.div`
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const ProviderDescription = styled.div`
  color: #94a3b8;
  font-size: 14px;
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid #475569;
  border-radius: 50%;
  border-top-color: #3b82f6;
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

interface SocialLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (address: string, provider: string) => void;
}

const SocialLoginModal: React.FC<SocialLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const toast = useToast();

  const socialProviders: SocialProvider[] = [
    {
      id: 'google',
      name: 'Google',
      loginProvider: 'google',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
      )
    },
    {
      id: 'github',
      name: 'GitHub',
      loginProvider: 'github',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      )
    },
    {
      id: 'discord',
      name: 'Discord',
      loginProvider: 'discord',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#5865F2">
          <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0189 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z"/>
        </svg>
      )
    },
    {
      id: 'twitter',
      name: 'Twitter / X',
      loginProvider: 'twitter',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      )
    }
  ];

  const handleProviderSelect = async (provider: SocialProvider) => {
    if (connectingProvider) return;

    setConnectingProvider(provider.id);
    try {
      console.log(`🔗 Connecting with ${provider.name}...`);

      // Show specific loading message for Web3Auth social login
      toast.info('Web3Auth Social Login', {
        message: `Connecting with ${provider.name}...`
      });

      const result = await web3AuthService.connectWithSocial(provider.loginProvider);

      if (result.isConnected && result.address) {
        console.log(`✅ Successfully connected with ${provider.name}`);
        onSuccess(result.address, provider.id);
        onClose();

        toast.success('Social Login Successful', {
          message: `Successfully connected with ${provider.name}`
        });
      } else {
        throw new Error('Failed to get wallet address');
      }
    } catch (error: any) {
      console.error(`❌ Failed to connect with ${provider.name}:`, error);

      let errorMessage = error.message || `Failed to connect with ${provider.name}`;

      // Provide specific error messages for common Web3Auth issues
      if (errorMessage.includes('not initialized')) {
        errorMessage = 'Web3Auth is not configured. Please check your environment variables.';
      } else if (errorMessage.includes('User closed the modal')) {
        errorMessage = 'Authentication was cancelled. Please try again.';
      } else if (errorMessage.includes('popup')) {
        errorMessage = 'Authentication popup was blocked. Please allow popups and try again.';
      }

      toast.error('Connection Failed', {
        message: errorMessage
      });
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Social Login
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalBody>
          <Description>
            Connect using your social media accounts. Your wallet will be created automatically and secured by Web3Auth.
          </Description>

          <ProvidersGrid>
            {socialProviders.map((provider) => (
              <ProviderButton
                key={provider.id}
                disabled={connectingProvider !== null}
                onClick={() => handleProviderSelect(provider)}
              >
                <ProviderIcon>{provider.icon}</ProviderIcon>
                <ProviderInfo>
                  <ProviderName>
                    {connectingProvider === provider.id ? (
                      <>
                        <LoadingSpinner /> Connecting...
                      </>
                    ) : (
                      `Continue with ${provider.name}`
                    )}
                  </ProviderName>
                  <ProviderDescription>
                    Sign in with your {provider.name} account
                  </ProviderDescription>
                </ProviderInfo>
              </ProviderButton>
            ))}
          </ProvidersGrid>
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
    </Portal>
  );
};

export default SocialLoginModal;
