import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { walletConnectService, WalletConnectState, WalletConnectService } from '../../services/WalletConnectService';
import { walletConnectionService } from '../../services/WalletConnectionService';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 32px 20px;
  box-sizing: border-box;
`;

const ModalContainer = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: calc(100vh - 64px);
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  position: relative;
  margin: auto;

  @media (max-width: 768px) {
    max-width: 95%;
    max-height: calc(100vh - 40px);
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 1px solid #334155;
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
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  text-align: center;
`;

const QRCodeContainer = styled.div`
  background: #ffffff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const QRCodeCanvas = styled.canvas`
  width: 280px;
  height: 280px;
  border-radius: 8px;
`;

const LoadingSpinner = styled.div`
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  font-size: 18px;
`;

const InstructionText = styled.p`
  color: #94a3b8;
  font-size: 16px;
  line-height: 1.6;
  margin: 0;
  max-width: 400px;
`;

const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const StatusText = styled.div<{ type: 'loading' | 'error' | 'success' }>`
  color: ${props => {
    switch (props.type) {
      case 'loading': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'success': return '#10b981';
      default: return '#94a3b8';
    }
  }};
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RetryButton = styled.button`
  background: #3b82f6;
  border: none;
  color: #ffffff;
  font-size: 16px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;



interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess: (address: string, provider: any) => void;
}

const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess
}) => {
  const [state, setState] = useState<WalletConnectState>({ isConnected: false });
  const [isConnecting] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Subscribe to WalletConnect state changes
    const sessionConnectedHandler = async (data: any) => {
      console.log('WalletConnect session connected:', data);

      if (data.address && data.session) {
        try {
          // Get the chain ID from the session
          const chainId = data.session.namespaces.eip155.chains[0].split(':')[1];
          const numericChainId = parseInt(chainId);

          console.log('Connecting WalletConnect signer with chain ID:', numericChainId);

          // Connect the WalletConnect signer to the wallet connection service
          await walletConnectionService.connectWalletConnectSigner(data.address, numericChainId);

          console.log('WalletConnect signer connected successfully');
          onConnectionSuccess(data.address, null); // Provider not needed with new implementation
          onClose();
        } catch (error) {
          console.error('Failed to connect WalletConnect signer:', error);
          setState(prev => ({ ...prev, error: 'Failed to connect signer' }));
        }
      }
    };

    // Also listen for QR code generation
    const qrGeneratedHandler = async (data: any) => {
      console.log('QR code generated:', data);
      if (data.uri) {
        setState(prev => ({ ...prev, uri: data.uri }));

        // Wait a bit for the canvas to be rendered, then generate QR code
        setTimeout(async () => {
          if (qrCanvasRef.current) {
            try {
              console.log('Generating QR code on canvas for URI:', data.uri);
              await WalletConnectService.generateQrCode(qrCanvasRef.current, data.uri);
              console.log('QR code generated successfully');
            } catch (error) {
              console.error('Failed to generate QR code:', error);
              setState(prev => ({ ...prev, error: 'Failed to generate QR code' }));
            }
          } else {
            console.error('Canvas ref not available for QR code generation');
          }
        }, 100);
      }
    };

    walletConnectService.addEventListener('session_connected', sessionConnectedHandler);
    walletConnectService.addEventListener('qr_generated', qrGeneratedHandler);

    // Initialize connection when modal opens
    initializeConnection();

    return () => {
      walletConnectService.removeEventListener('session_connected', sessionConnectedHandler);
      walletConnectService.removeEventListener('qr_generated', qrGeneratedHandler);
    };
  }, [isOpen, onConnectionSuccess, onClose]);

  const initializeConnection = async () => {
    try {
      // Initialize WalletConnect with Sepolia chain ID (default)
      await walletConnectService.initialize(11155111);
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      setState(prev => ({ ...prev, error: 'Failed to initialize WalletConnect' }));
    }
  };



  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleRetry = () => {
    initializeConnection();
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            <svg width="24" height="24" viewBox="0 0 40 25" fill="none">
              <path d="m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z" fill="#3b99fc"/>
            </svg>
            Connect with WalletConnect
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalBody>
          <QRCodeContainer>
            {state.uri ? (
              <QRCodeCanvas ref={qrCanvasRef} />
            ) : (
              <LoadingSpinner>Generating QR Code...</LoadingSpinner>
            )}
          </QRCodeContainer>

          {state.error ? (
            <StatusContainer>
              <StatusText type="error">
                ⚠️ {state.error}
              </StatusText>
              {state.error.includes('Project ID') && (
                <div style={{
                  marginTop: '15px',
                  padding: '15px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#475569',
                  textAlign: 'left'
                }}>
                  <strong style={{ color: '#1e293b' }}>How to fix:</strong>
                  <ol style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    <li>Visit <a href="https://cloud.walletconnect.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>WalletConnect Cloud</a></li>
                    <li>Create a free account and project</li>
                    <li>Copy your Project ID</li>
                    <li>Add <code style={{ backgroundColor: '#e2e8f0', padding: '2px 4px', borderRadius: '4px' }}>REACT_APP_WALLETCONNECT_PROJECT_ID=your-id</code> to .env.local</li>
                    <li>Restart the development server</li>
                  </ol>
                </div>
              )}
              <RetryButton onClick={handleRetry}>
                Try Again
              </RetryButton>
            </StatusContainer>
          ) : state.isInitializing ? (
            <StatusContainer>
              <StatusText type="loading">
                🔄 Initializing WalletConnect...
              </StatusText>
            </StatusContainer>
          ) : state.isPairing ? (
            <StatusContainer>
              <StatusText type="loading">
                🔄 Waiting for wallet connection...
              </StatusText>
            </StatusContainer>
          ) : isConnecting ? (
            <StatusContainer>
              <StatusText type="loading">
                🔄 Opening WalletConnect modal...
              </StatusText>
            </StatusContainer>
          ) : state.isConnected ? (
            <StatusContainer>
              <StatusText type="success">
                ✅ Wallet connected successfully!
              </StatusText>
            </StatusContainer>
          ) : (
            <>
              <InstructionText>
                {state.uri
                  ? "Scan this QR code with your WalletConnect-compatible mobile wallet to connect securely."
                  : "Generating QR code for wallet connection..."
                }
              </InstructionText>


            </>
          )}
        </ModalBody>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default WalletConnectModal;
