import React from 'react';

interface WalletIconProps {
  size?: number;
  className?: string;
}

export const MetaMaskIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 318 318" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="318" height="318" rx="159" fill="#F6851B"/>
    <path d="M274.1 35.5L174.6 109.4L193 65.8L274.1 35.5Z" fill="#E2761B" stroke="#E2761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M44.4 35.5L143.1 110.1L125.6 65.8L44.4 35.5Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M238.3 206.8L211.8 247.4L268.5 262.1L283.7 207.7L238.3 206.8Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M35.1 207.7L50.1 262.1L106.8 247.4L80.3 206.8L35.1 207.7Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M103.6 138.2L87.8 162.1L144.1 164.6L142.1 104.1L103.6 138.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M214.9 138.2L175.9 103.4L174.6 164.6L230.8 162.1L214.9 138.2Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M106.8 247.4L140.6 230.9L111.4 208.1L106.8 247.4Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M177.9 230.9L211.8 247.4L207.1 208.1L177.9 230.9Z" fill="#E4761B" stroke="#E4761B" strokeWidth="5.94955" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const WalletConnectIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 300 185" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="300" height="185" rx="40" fill="#3B99FC"/>
    <path d="M61.4385 36.2562C99.7847 -1.4251 160.215 -1.4251 198.561 36.2562L202.985 40.5787C204.949 42.5097 204.949 45.6843 202.985 47.6152L187.116 63.0815C186.134 64.0469 184.523 64.0469 183.541 63.0815L177.595 57.2252C148.895 28.9702 101.105 28.9702 72.4052 57.2252L66.1404 63.3658C65.1582 64.3312 63.5473 64.3312 62.5651 63.3658L46.6963 47.8995C44.7322 45.9686 44.7322 42.794 46.6963 40.863L61.4385 36.2562Z" fill="white"/>
    <path d="M230.514 69.0957L244.978 83.1652C246.942 85.0961 246.942 88.2707 244.978 90.2016L180.968 153.325C179.003 155.256 175.834 155.256 173.869 153.325C173.869 153.325 173.869 153.325 173.869 153.325L125.971 106.147C125.48 105.664 124.52 105.664 124.029 106.147C124.029 106.147 124.029 106.147 124.029 106.147L76.1312 153.325C74.1671 155.256 70.9977 155.256 69.0336 153.325C69.0336 153.325 69.0336 153.325 69.0336 153.325L5.02226 90.2016C3.05815 88.2707 3.05815 85.0961 5.02226 83.1652L19.4865 69.0957C21.4506 67.1648 24.62 67.1648 26.5841 69.0957L74.4818 116.274C74.9729 116.756 75.9331 116.756 76.4242 116.274L124.322 69.0957C126.286 67.1648 129.455 67.1648 131.419 69.0957C131.419 69.0957 131.419 69.0957 131.419 69.0957L179.317 116.274C179.808 116.756 180.768 116.756 181.259 116.274L229.157 69.0957C231.121 67.1648 234.29 67.1648 236.254 69.0957H230.514Z" fill="white"/>
  </svg>
);

export const CoinbaseWalletIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 1024 1024" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="1024" height="1024" rx="512" fill="#0052FF"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M152 512C152 710.823 313.177 872 512 872C710.823 872 872 710.823 872 512C872 313.177 710.823 152 512 152C313.177 152 152 313.177 152 512ZM420 396C406.745 396 396 406.745 396 420V604C396 617.255 406.745 628 420 628H604C617.255 628 628 617.255 628 604V420C628 406.745 617.255 396 604 396H420Z" fill="white"/>
  </svg>
);

export const RainbowIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 120 120" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="120" height="120" rx="60" fill="url(#rainbow-gradient)"/>
    <path d="M20 60C20 37.909 37.909 20 60 20C82.091 20 100 37.909 100 60" stroke="white" strokeWidth="8" strokeLinecap="round"/>
    <path d="M30 60C30 43.431 43.431 30 60 30C76.569 30 90 43.431 90 60" stroke="white" strokeWidth="6" strokeLinecap="round"/>
    <path d="M40 60C40 48.954 48.954 40 60 40C71.046 40 80 48.954 80 60" stroke="white" strokeWidth="4" strokeLinecap="round"/>
    <circle cx="60" cy="60" r="8" fill="white"/>
    <defs>
      <linearGradient id="rainbow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF6B6B"/>
        <stop offset="16.66%" stopColor="#FFE66D"/>
        <stop offset="33.33%" stopColor="#4ECDC4"/>
        <stop offset="50%" stopColor="#45B7D1"/>
        <stop offset="66.66%" stopColor="#96CEB4"/>
        <stop offset="83.33%" stopColor="#FFEAA7"/>
        <stop offset="100%" stopColor="#DDA0DD"/>
      </linearGradient>
    </defs>
  </svg>
);

export const TrustWalletIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 336 336" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="336" height="336" rx="168" fill="#3375BB"/>
    <path d="M168 48L280 112V168C280 224 224 280 168 288C112 280 56 224 56 168V112L168 48Z" fill="white"/>
    <path d="M168 80L248 128V168C248 208 208 248 168 256C128 248 88 208 88 168V128L168 80Z" fill="#3375BB"/>
    <path d="M168 112L216 144V168C216 192 192 216 168 224C144 216 120 192 120 168V144L168 112Z" fill="white"/>
  </svg>
);

// Generic wallet icon for unknown wallets
export const GenericWalletIcon: React.FC<WalletIconProps> = ({ size = 40, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="24" height="24" rx="12" fill="#6B7280"/>
    <path d="M21 12V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V16" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 10H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 15H7.01" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
