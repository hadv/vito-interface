import React, { useState } from 'react';
import styled from 'styled-components';
import WalletConnectModal from './WalletConnectModal';
import Web3AuthSetupInstructions from './Web3AuthSetupInstructions';
import PhantomIcon from './PhantomIcon';
import { useToast } from '../../hooks/useToast';
import { WEB3AUTH_CLIENT_ID } from '../../config/web3auth';

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

const ErrorMessage = styled.div`
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #dc2626;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;

  button {
    background: none;
    border: none;
    color: #dc2626;
    cursor: pointer;
    font-size: 16px;
    padding: 0;
    margin-left: 12px;

    &:hover {
      opacity: 0.7;
    }
  }
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

const WalletDescription = styled.span`
  color: #9CA3AF;
  font-size: 12px;
  font-weight: 400;
  text-align: center;
  margin-top: 2px;
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
  const [showWeb3AuthSetup, setShowWeb3AuthSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Reset connection state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setIsConnecting(null);
      setError(null);
    }
  }, [isOpen]);

  // Add timeout mechanism to prevent stuck connecting state
  React.useEffect(() => {
    if (isConnecting) {
      const timeout = setTimeout(() => {
        console.warn(`Connection timeout for ${isConnecting}, resetting state`);
        setIsConnecting(null);
        setError('Connection timeout. Please try again.');
      }, 30000); // 30 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isConnecting]);

  const handleWalletSelect = async (walletType: string) => {
    // Allow switching between wallet types even if currently connecting
    // This fixes the stuck "connecting..." state issue
    if (isConnecting === walletType) {
      // If clicking the same wallet that's connecting, cancel and reset
      setIsConnecting(null);
      setError('Connection cancelled. You can try again.');
      return;
    }

    // Clear any previous errors when selecting a new wallet
    setError(null);

    if (walletType === 'walletconnect') {
      setShowWalletConnectModal(true);
      return;
    }

    // Check Web3Auth configuration
    if (walletType === 'web3auth' && (!WEB3AUTH_CLIENT_ID || WEB3AUTH_CLIENT_ID.trim() === '')) {
      setShowWeb3AuthSetup(true);
      return;
    }

    setIsConnecting(walletType);
    try {
      await onWalletSelect(walletType);
      onClose();
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);

      // Set user-friendly error message
      let errorMessage = 'Failed to connect wallet';
      if (error.code === 4001) {
        errorMessage = 'Connection cancelled by user';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request already pending. Please check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
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
      id: 'web3auth',
      name: 'Web3Auth',
      description: 'Social Login (Google, Twitter, etc.)',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <defs>
            <linearGradient id="web3authGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0364FF"/>
              <stop offset="100%" stopColor="#0052CC"/>
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#web3authGradient)"/>
          <g transform="translate(8, 8)">
            <path d="M8 0L0 4.5v7L8 16l8-4.5v-7L8 0z" fill="white" fillOpacity="0.9"/>
            <path d="M8 3L3 5.5v5L8 13l5-2.5v-5L8 3z" fill="white"/>
            <circle cx="8" cy="8" r="2" fill="url(#web3authGradient)"/>
          </g>
        </svg>
      ),
      bgColor: 'transparent',
      available: true
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
      id: 'rabby',
      name: 'Rabby',
      icon: (
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g clipPath="url(#clip0_741_2751)">
            <mask id="mask0_741_2751" style={{maskType: 'luminance'}} maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
              <path d="M32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32C24.8366 32 32 24.8366 32 16Z" fill="white"/>
            </mask>
            <g mask="url(#mask0_741_2751)">
              <path d="M32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32C24.8366 32 32 24.8366 32 16Z" fill="#7084FF"/>
              <g filter="url(#filter0_d_741_2751)">
                <path d="M27.6019 17.3876C28.5216 15.3261 23.9748 9.56632 19.631 7.16676C16.8929 5.30779 14.0399 5.56318 13.462 6.37938C12.194 8.17069 17.6611 9.68851 21.3174 11.4597C20.5314 11.8022 19.7908 12.4169 19.3552 13.2029C17.9921 11.7098 15.0003 10.4239 11.4897 11.4597C9.12397 12.1577 7.15791 13.8032 6.39804 16.2885C6.21337 16.2062 6.00894 16.1604 5.79387 16.1604C4.97142 16.1604 4.30469 16.8294 4.30469 17.6546C4.30469 18.4799 4.97142 19.1488 5.79387 19.1488C5.94632 19.1488 6.42298 19.0463 6.42298 19.0463L14.0399 19.1016C10.9937 23.9504 8.58635 24.6591 8.58635 25.4992C8.58635 26.3392 10.8898 26.1116 11.7547 25.7984C15.8949 24.2995 20.3417 19.628 21.1048 18.2833C24.3092 18.6844 27.0022 18.7318 27.6019 17.3876Z" fill="url(#paint0_linear_741_2751)"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M21.3029 11.4538C21.3067 11.4555 21.3106 11.4571 21.3144 11.4588C21.4839 11.3918 21.4565 11.1407 21.4099 10.9435C21.303 10.4901 19.4575 8.66165 17.7245 7.84265C15.3629 6.72665 13.624 6.78421 13.3672 7.29865C13.8472 8.28821 16.0779 9.21727 18.4077 10.1876C19.3971 10.5996 20.4043 11.0191 21.3029 11.4538Z" fill="url(#paint1_linear_741_2751)"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M18.3228 21.4167C17.8453 21.2337 17.306 21.0658 16.6929 20.9133C17.3469 19.7393 17.4841 18.0011 16.8665 16.9022C15.9998 15.3599 14.9117 14.5391 12.3834 14.5391C10.9928 14.5391 7.24877 15.009 7.18227 18.145C7.17534 18.4738 7.18209 18.7751 7.20577 19.0521L14.043 19.1019C13.121 20.5694 12.2575 21.6577 11.5016 22.4852C12.4092 22.7186 13.1581 22.9144 13.8457 23.0943C14.4978 23.2648 15.0946 23.4209 15.7193 23.5809C16.662 22.8918 17.5483 22.1404 18.3228 21.4167Z" fill="url(#paint2_linear_741_2751)"/>
                <path d="M6.30874 18.7283C6.58805 21.1105 7.93736 22.0441 10.6946 22.3205C13.4519 22.5968 15.0335 22.4114 17.1391 22.6036C18.8977 22.7641 20.468 23.6633 21.0505 23.3526C21.5747 23.073 21.2814 22.0626 20.5799 21.4144C19.6706 20.5741 18.4121 19.99 16.1977 19.7826C16.639 18.5702 16.5154 16.8703 15.8299 15.9455C14.8389 14.6082 13.0097 14.0036 10.6946 14.2678C8.27586 14.5438 5.95821 15.7386 6.30874 18.7283Z" fill="url(#paint3_linear_741_2751)"/>
              </g>
            </g>
          </g>
          <defs>
            <filter id="filter0_d_741_2751" x="-77.6153" y="-76.1602" width="187.254" height="184.162" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
              <feOffset/>
              <feGaussianBlur stdDeviation="40.96"/>
              <feComposite in2="hardAlpha" operator="out"/>
              <feColorMatrix type="matrix" values="0 0 0 0 0.151933 0 0 0 0 0.239238 0 0 0 0 0.490241 0 0 0 0.54 0"/>
              <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_741_2751"/>
              <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_741_2751" result="shape"/>
            </filter>
            <linearGradient id="paint0_linear_741_2751" x1="11.2142" y1="15.562" x2="27.4119" y2="20.1399" gradientUnits="userSpaceOnUse">
              <stop stopColor="white"/>
              <stop offset="1" stopColor="white"/>
            </linearGradient>
            <linearGradient id="paint1_linear_741_2751" x1="24.6745" y1="15.2518" x2="12.9536" y2="3.54163" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8697FF"/>
              <stop offset="1" stopColor="#8697FF" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="paint2_linear_741_2751" x1="18.6478" y1="21.8261" x2="7.40802" y2="15.3859" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8697FF"/>
              <stop offset="1" stopColor="#8697FF" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="paint3_linear_741_2751" x1="12.1827" y1="15.4394" x2="19.7991" y2="25.0843" gradientUnits="userSpaceOnUse">
              <stop stopColor="white"/>
              <stop offset="0.983895" stopColor="#D1D8FF"/>
            </linearGradient>
            <clipPath id="clip0_741_2751">
              <rect width="32" height="32" fill="white"/>
            </clipPath>
          </defs>
        </svg>
      ),
      bgColor: 'transparent',
      available: typeof window !== 'undefined' && window.ethereum && (window.ethereum.isRabby || (window.ethereum.providers && window.ethereum.providers.some((p: any) => p.isRabby)))
    },
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
      icon: <PhantomIcon size={32} />,
      bgColor: 'transparent',
      available: typeof window !== 'undefined' && (
        (window.phantom?.ethereum) ||
        (window.ethereum?.isPhantom) ||
        (window.ethereum?.providers && window.ethereum.providers.some((p: any) => p.isPhantom))
      )
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
              <ErrorMessage>
                <span>❌ {error}</span>
                <button onClick={() => setError(null)}>×</button>
              </ErrorMessage>
            )}

            <WalletsGrid>
              {wallets.map((wallet) => (
                <WalletOption
                  key={wallet.id}
                  disabled={!wallet.available}
                  onClick={() => wallet.available && handleWalletSelect(wallet.id)}
                  style={{
                    opacity: !wallet.available ? 0.5 : 1,
                    cursor: !wallet.available ? 'not-allowed' : 'pointer'
                  }}
                >
                  <WalletIcon bgColor={wallet.bgColor}>{wallet.icon}</WalletIcon>
                  <WalletName>
                    {isConnecting === wallet.id ? (
                      <>
                        Connecting...
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          Click to cancel
                        </div>
                      </>
                    ) : wallet.name}
                  </WalletName>
                  {(wallet as any).description && (
                    <WalletDescription>
                      {(wallet as any).description}
                    </WalletDescription>
                  )}
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

      {/* Web3Auth Setup Instructions Modal */}
      {showWeb3AuthSetup && (
        <ModalOverlay isOpen={showWeb3AuthSetup} onClick={() => setShowWeb3AuthSetup(false)}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <Web3AuthSetupInstructions onClose={() => setShowWeb3AuthSetup(false)} />
          </ModalContainer>
        </ModalOverlay>
      )}
    </>
  );
};

export default WalletConnectionModal;
