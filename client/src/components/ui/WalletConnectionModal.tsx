import React, { useState } from 'react';
import styled from 'styled-components';
import WalletConnectModal from './WalletConnectModal';
import { useToast } from '../../hooks/useToast';

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
  z-index: 1040;
  padding: 32px 20px;
  box-sizing: border-box;

  @media (max-height: 700px) {
    padding: 20px;
  }

  @media (max-height: 500px) {
    padding: 16px;
    align-items: flex-start;
  }
`;

const ModalContainer = styled.div`
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 16px;
  width: 100%;
  max-width: 900px;
  max-height: calc(100vh - 64px);
  min-height: 500px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  margin: auto;

  @media (max-width: 768px) {
    flex-direction: column;
    max-width: 100%;
    max-height: calc(100vh - 64px);
    min-height: 450px;
  }

  @media (max-height: 700px) {
    max-height: calc(100vh - 40px);
    min-height: 400px;
  }

  @media (max-height: 500px) {
    max-height: calc(100vh - 32px);
    min-height: 350px;
  }

  @media (max-height: 400px) {
    min-height: calc(100vh - 32px);
  }
`;

const LeftSidebar = styled.div`
  background: #0f172a;
  padding: 40px;
  width: 320px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #334155;
  overflow-y: auto;
  min-height: 0;

  @media (max-width: 768px) {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #334155;
    padding: 32px;
    flex-shrink: 0;
  }
`;

const RightContent = styled.div`
  flex: 1;
  padding: 32px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  min-height: 0;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const ModalTitle = styled.h2`
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  margin: 0;
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

const SidebarIcon = styled.div`
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32px;
  font-size: 28px;
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
`;

const SidebarTitle = styled.h3`
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 20px 0;
`;

const SidebarDescription = styled.p`
  color: #94a3b8;
  font-size: 16px;
  line-height: 1.6;
  margin: 0 0 40px 0;
`;

const NoWalletLink = styled.button`
  background: none;
  border: none;
  color: #3b82f6;
  font-size: 16px;
  cursor: pointer;
  text-align: left;
  padding: 0;
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.2s ease;

  &:hover {
    color: #60a5fa;
    transform: translateX(4px);
  }
`;

const WalletsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 32px;
  flex: 1;
  overflow-y: auto;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const WalletOption = styled.button<{ disabled?: boolean }>`
  background: #334155;
  border: 1px solid #475569;
  border-radius: 16px;
  padding: 24px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  opacity: ${props => props.disabled ? 0.6 : 1};
  min-height: 120px;

  &:hover {
    background: ${props => props.disabled ? '#334155' : '#3b82f6'};
    border-color: ${props => props.disabled ? '#475569' : '#60a5fa'};
    transform: ${props => props.disabled ? 'none' : 'translateY(-2px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 8px 25px rgba(59, 130, 246, 0.3)'};
  }

  &:active {
    transform: ${props => props.disabled ? 'none' : 'translateY(0)'};
  }
`;

const WalletIcon = styled.div<{ bgColor?: string }>`
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: ${props => props.bgColor || 'transparent'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
`;

const WalletName = styled.span`
  color: #ffffff;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
`;



interface WalletConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWalletSelect: (walletType: string) => void;
}

const WalletConnectionModal: React.FC<WalletConnectionModalProps> = ({
  isOpen,
  onClose,
  onWalletSelect
}) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [showWalletConnectModal, setShowWalletConnectModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleWalletSelect = async (walletType: string) => {
    if (isConnecting) return;

    if (walletType === 'walletconnect') {
      setShowWalletConnectModal(true);
      return;
    }

    setIsConnecting(walletType);
    try {
      await onWalletSelect(walletType);
      onClose();
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      // Don't close modal on error, let user try again
    } finally {
      setIsConnecting(null);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleWalletConnectSuccess = async (address: string, provider: any) => {
    console.log('🎯 WalletConnect Success - FORCING MODAL CLOSE');

    // Prevent other wallet extensions from interfering
    try {
      // Disable Phantom wallet popup if it exists
      const phantomWallet = (window as any).phantom?.solana;
      if (phantomWallet) {
        console.log('🚫 Disabling Phantom wallet interference');
        phantomWallet.disconnect?.();
      }

      // Prevent MetaMask from auto-connecting
      if (window.ethereum?.isMetaMask) {
        console.log('🚫 Preventing MetaMask interference');
        // Don't trigger MetaMask connection
      }
    } catch (extensionError) {
      console.log('⚠️ Extension interference prevention failed (non-critical):', extensionError);
    }

    // IMMEDIATELY close both modals - no conditions, no delays
    setShowWalletConnectModal(false);
    onClose();

    // Show success message
    toast.success('Wallet Connected', {
      message: 'Successfully connected via WalletConnect'
    });

    console.log('✅ Modals closed, success toast shown');

    // Now integrate with wallet connection service in background
    try {
      console.log('🔗 Integrating with wallet connection service...');
      const { walletConnectionService } = await import('../../services/WalletConnectionService');

      // Check if Safe wallet is connected
      const currentState = walletConnectionService.getState();
      console.log('Current wallet state:', currentState);

      if (currentState.isConnected && currentState.safeAddress) {
        console.log('✅ Safe wallet found, connecting WalletConnect signer...');
        // Use the new method signature with address and chainId
        const chainId = currentState.chainId || 11155111; // Default to Sepolia
        await walletConnectionService.connectWalletConnectSigner(address, chainId);
        console.log('✅ WalletConnect signer connected to Safe wallet');
      } else {
        console.log('⚠️ No Safe wallet connected - WalletConnect works standalone');
        // For now, just log this - we can enhance later if needed
      }
    } catch (error) {
      console.error('❌ Background integration failed:', error);
      // Don't show error to user since modal is already closed and toast shown
    }
  };

  const handleWalletConnectClose = () => {
    setShowWalletConnectModal(false);
  };

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const wallets = [
    {
      id: 'metamask',
      name: 'MetaMask',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M30.0389 1.51562L17.8555 10.4844L20.2278 4.82812L30.0389 1.51562Z" fill="#E17726" stroke="#E17726" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1.95117 1.51562L14.0278 10.5625L11.7722 4.82812L1.95117 1.51562Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M25.5889 23.0156L22.4445 27.7656L29.4445 29.7656L31.5556 23.1719L25.5889 23.0156Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M0.453125 23.1719L2.55556 29.7656L9.55556 27.7656L6.41112 23.0156L0.453125 23.1719Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.22223 14.0469L7.16668 17.2969L14.1111 17.6406L13.8889 10.0156L9.22223 14.0469Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.7778 14.0469L18.0278 9.9375L17.8889 17.6406L24.8333 17.2969L22.7778 14.0469Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.55556 27.7656L13.6111 25.7969L10.1111 23.2188L9.55556 27.7656Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.3889 25.7969L22.4445 27.7656L21.8889 23.2188L18.3889 25.7969Z" fill="#E27625" stroke="#E27625" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M22.4445 27.7656L18.3889 25.7969L18.7222 28.5781L18.6667 29.6875L22.4445 27.7656Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.55556 27.7656L13.3333 29.6875L13.2889 28.5781L13.6111 25.7969L9.55556 27.7656Z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.3889 21.2969L10.0278 20.3281L12.3889 19.2188L13.3889 21.2969Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.6111 21.2969L19.6111 19.2188L21.9722 20.3281L18.6111 21.2969Z" fill="#233447" stroke="#233447" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.55556 27.7656L10.1389 23.0156L6.41112 23.1719L9.55556 27.7656Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21.8611 23.0156L22.4445 27.7656L25.5889 23.1719L21.8611 23.0156Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M24.8333 17.2969L17.8889 17.6406L18.6111 21.2969L19.6111 19.2188L21.9722 20.3281L24.8333 17.2969Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.0278 20.3281L12.3889 19.2188L13.3889 21.2969L14.1111 17.6406L7.16668 17.2969L10.0278 20.3281Z" fill="#CC6228" stroke="#CC6228" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M7.16668 17.2969L10.1111 23.2188L10.0278 20.3281L7.16668 17.2969Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M21.9722 20.3281L21.8889 23.2188L24.8333 17.2969L21.9722 20.3281Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M14.1111 17.6406L13.3889 21.2969L14.3333 25.2969L14.5556 19.9531L14.1111 17.6406Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17.8889 17.6406L17.4445 19.9375L17.6667 25.2969L18.6111 21.2969L17.8889 17.6406Z" fill="#E27525" stroke="#E27525" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.6111 21.2969L17.6667 25.2969L18.3889 25.7969L21.8889 23.2188L21.9722 20.3281L18.6111 21.2969Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10.0278 20.3281L10.1111 23.2188L13.6111 25.7969L14.3333 25.2969L13.3889 21.2969L10.0278 20.3281Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.6667 29.6875L18.7222 28.5781L18.4167 28.3125H13.5833L13.2889 28.5781L13.3333 29.6875L9.55556 27.7656L10.9722 28.9375L13.5278 30.7656H18.4722L21.0278 28.9375L22.4445 27.7656L18.6667 29.6875Z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M18.3889 25.7969L17.6667 25.2969H14.3333L13.6111 25.7969L13.2889 28.5781L13.5833 28.3125H18.4167L18.7222 28.5781L18.3889 25.7969Z" fill="#161616" stroke="#161616" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M30.5556 11.2188L32 5.20312L30.0389 1.51562L18.3889 10.2969L22.7778 14.0469L29.3333 15.9531L30.6111 14.4531L30.0278 14.0156L31.4167 12.7656L30.6667 12.1719L32.0556 11.1406L30.5556 11.2188Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M0 5.20312L1.44445 11.2188L-0.0555556 11.1406L1.33334 12.1719L0.583334 12.7656L1.97223 14.0156L1.38889 14.4531L2.66667 15.9531L9.22223 14.0469L13.6111 10.2969L1.96112 1.51562L0 5.20312Z" fill="#763E1A" stroke="#763E1A" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M29.3333 15.9531L22.7778 14.0469L24.8333 17.2969L21.8889 23.2188L25.5889 23.1719H31.5556L29.3333 15.9531Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9.22223 14.0469L2.66667 15.9531L0.453125 23.1719H6.41112L10.1111 23.2188L7.16668 17.2969L9.22223 14.0469Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M17.8889 17.6406L18.3889 10.2969L20.2278 4.82812H11.7722L13.6111 10.2969L14.1111 17.6406L14.3333 19.9688L14.3333 25.2969H17.6667L17.6667 19.9688L17.8889 17.6406Z" fill="#F5841F" stroke="#F5841F" strokeWidth="0.25" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      bgColor: 'transparent',
      available: true
    },
    {
      id: 'phantom',
      name: 'Phantom',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="phantomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#AB9FF2"/>
              <stop offset="100%" stopColor="#7C3AED"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#phantomGradient)"/>
          <path d="M9.5 24.5C9.5 24.5 8.5 23.5 8.5 21.5C8.5 19.5 9.5 18.5 11.5 18.5C13.5 18.5 14.5 19.5 14.5 21.5C14.5 23.5 13.5 24.5 11.5 24.5H9.5Z" fill="white"/>
          <path d="M17.5 24.5C17.5 24.5 16.5 23.5 16.5 21.5C16.5 19.5 17.5 18.5 19.5 18.5C21.5 18.5 22.5 19.5 22.5 21.5C22.5 23.5 21.5 24.5 19.5 24.5H17.5Z" fill="white"/>
          <path d="M6 16C6 12.6863 8.68629 10 12 10H20C23.3137 10 26 12.6863 26 16V18C26 19.1046 25.1046 20 24 20H8C6.89543 20 6 19.1046 6 18V16Z" fill="white"/>
          <circle cx="12" cy="15" r="1.5" fill="#AB9FF2"/>
          <circle cx="20" cy="15" r="1.5" fill="#AB9FF2"/>
          <path d="M14 18C14 18 15 19 16 19C17 19 18 18 18 18" stroke="#AB9FF2" strokeWidth="1" strokeLinecap="round"/>
        </svg>
      ),
      bgColor: 'transparent',
      available: false
    },
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      icon: (
        <svg width="32" height="20" viewBox="0 0 40 25" fill="none">
          <path d="m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z" fill="#3b99fc"/>
        </svg>
      ),
      bgColor: 'transparent',
      available: true
    },
    {
      id: 'ledger',
      name: 'Ledger',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <g transform="scale(0.2)">
            <rect width="160" height="160" rx="16" fill="#00000D"/>
            <path d="M93.1482 119.207V125H135V98.8769H128.902V119.207H93.1482ZM93.1482 33V38.792H128.902V59.1231H135V33H93.1482ZM74.0104 59.1231H67.9125V98.8769H95.4153V93.6539H74.0104V59.1231ZM26 98.8769V125H67.8518V119.207H32.0979V98.8769H26ZM26 33V59.1231H32.0979V38.792H67.8518V33H26Z" fill="white"/>
          </g>
        </svg>
      ),
      bgColor: 'transparent',
      available: false
    },
    {
      id: 'privatekey',
      name: 'Private key',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="keyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6B7280"/>
              <stop offset="100%" stopColor="#374151"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#keyGradient)"/>
          <g transform="translate(3.5, 4) scale(0.38)">
            <path fillRule="evenodd" clipRule="evenodd" d="M19.3337 7C18.4255 7 17.6893 7.73621 17.6893 8.64436V11.9999H14.334C13.4258 11.9999 12.6896 12.7361 12.6896 13.6443V16.9999H16.0452C16.9534 16.9999 17.6896 16.2637 17.6896 15.3556V12H47.6893V15.3556C47.6893 16.2637 48.4255 16.9999 49.3337 16.9999H52.689V46.9999H56.0447C56.9528 46.9999 57.689 46.2637 57.689 45.3555V18.6442C57.689 17.7361 56.9528 16.9999 56.0447 16.9999H52.6893V13.6443C52.6893 12.7361 51.9531 11.9999 51.0449 11.9999H47.6894V8.64436C47.6894 7.73621 46.9532 7 46.045 7H19.3337ZM47.6893 48.6444C47.6893 47.7363 48.4255 47.0001 49.3337 47.0001H52.6893V50.3557C52.6893 51.2639 51.9531 52.0001 51.0449 52.0001H47.6894V55.3556C47.6894 56.2638 46.9532 57 46.045 57H19.3337C18.4255 57 17.6893 56.2638 17.6893 55.3556V52.0001H14.334C13.4258 52.0001 12.6896 51.2639 12.6896 50.3557V47.0001H16.0452C16.9534 47.0001 17.6896 47.7363 17.6896 48.6444V52H47.6893V48.6444ZM9.33382 16.9999C8.42566 16.9999 7.68945 17.7361 7.68945 18.6442V45.3555C7.68945 46.2637 8.42566 46.9999 9.33382 46.9999H12.6895V16.9999H9.33382ZM36.8004 27.248C36.8004 28.9337 35.7858 30.3824 34.3339 31.0168V40.403C34.3339 40.857 33.9658 41.2252 33.5117 41.2252H31.8673C31.4133 41.2252 31.0452 40.857 31.0452 40.403V31.0168C29.5932 30.3825 28.5786 28.9337 28.5786 27.248C28.5786 24.9776 30.4191 23.1371 32.6895 23.1371C34.9599 23.1371 36.8004 24.9776 36.8004 27.248Z" fill="white"/>
          </g>
        </svg>
      ),
      bgColor: 'transparent',
      available: false
    },
    {
      id: 'web3auth',
      name: 'Google',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="googleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4285F4"/>
              <stop offset="25%" stopColor="#EA4335"/>
              <stop offset="50%" stopColor="#FBBC05"/>
              <stop offset="75%" stopColor="#34A853"/>
              <stop offset="100%" stopColor="#4285F4"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="white"/>
          <g transform="translate(6, 6)">
            <path d="M19.6 10.23c0-.82-.1-1.42-.25-2.05H10v3.72h5.5c-.15.96-.74 2.31-2.04 3.22v2.45h3.16c1.89-1.73 2.98-4.3 2.98-7.34z" fill="#4285F4"/>
            <path d="M10 20c2.7 0 4.94-.89 6.6-2.53l-3.14-2.45c-.86.58-1.96.92-3.46.92-2.65 0-4.9-1.8-5.71-4.22H1.1v2.52C2.8 17.6 6.2 20 10 20z" fill="#34A853"/>
            <path d="M4.29 11.72c-.22-.58-.35-1.2-.35-1.72 0-.52.13-1.14.35-1.72V5.76H1.1C.4 7.16 0 8.54 0 10s.4 2.84 1.1 4.24l3.19-2.52z" fill="#FBBC05"/>
            <path d="M10 3.98c1.5 0 2.54.64 3.14 1.18l2.36-2.36C14.94.98 12.7 0 10 0 6.2 0 2.8 2.4 1.1 5.76l3.19 2.52C5.1 5.78 7.35 3.98 10 3.98z" fill="#EA4335"/>
          </g>
        </svg>
      ),
      bgColor: 'transparent',
      available: true
    }
  ];

  if (!isOpen) return null;

  return (
    <>
      <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
        <ModalContainer>
          <LeftSidebar>
            <SidebarIcon>🔗</SidebarIcon>
            <SidebarTitle>Connect your wallet</SidebarTitle>
            <SidebarDescription>
              Connecting your wallet is like "logging in" to Web3. Select your wallet from the options to get started.
            </SidebarDescription>
            <NoWalletLink onClick={() => window.open('https://metamask.io/', '_blank')}>
              <span>ℹ️</span>
              I don't have a wallet
            </NoWalletLink>
          </LeftSidebar>

          <RightContent>
            <ModalHeader>
              <ModalTitle>Available Wallets ({wallets.length})</ModalTitle>
              <CloseButton onClick={onClose}>&times;</CloseButton>
            </ModalHeader>

            {error && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '14px'
              }}>
                ❌ {error}
                <button
                  onClick={() => setError(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    cursor: 'pointer',
                    float: 'right',
                    fontSize: '16px',
                    padding: '0'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <WalletsGrid>
              {wallets.map((wallet) => (
                <WalletOption
                  key={wallet.id}
                  disabled={!wallet.available || isConnecting === wallet.id}
                  onClick={() => wallet.available && handleWalletSelect(wallet.id)}
                >
                  <WalletIcon bgColor={wallet.bgColor}>{wallet.icon}</WalletIcon>
                  <WalletName>
                    {isConnecting === wallet.id ? 'Connecting...' : wallet.name}
                  </WalletName>
                </WalletOption>
              ))}
            </WalletsGrid>
          </RightContent>
        </ModalContainer>
      </ModalOverlay>

      {/* WalletConnect Modal - Render outside main modal to avoid z-index conflicts */}
      <WalletConnectModal
        isOpen={showWalletConnectModal}
        onClose={handleWalletConnectClose}
        onConnectionSuccess={handleWalletConnectSuccess}
      />
    </>
  );
};

export default WalletConnectionModal;
