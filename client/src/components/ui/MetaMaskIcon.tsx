import React from 'react';
import './MetaMaskIcon.css';

interface MetaMaskIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const MetaMaskIcon: React.FC<MetaMaskIconProps> = ({
  size = 32,
  className = '',
  style = {}
}) => {
  // Official MetaMask wallet icon as base64
  const metaMaskIconBase64 = "data:image/png;base64,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";

  return (
    <div
      className={`metamask-icon ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        ...style
      }}
    >
      <img
        src={metaMaskIconBase64}
        alt="MetaMask Wallet"
        width={size}
        height={size}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};

export default MetaMaskIcon;
