import React from 'react';
import './RabbyIcon.css';

interface RabbyIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const RabbyIcon: React.FC<RabbyIconProps> = ({
  size = 32,
  className = '',
  style = {}
}) => {
  // Official Rabby wallet icon as base64
  const rabbyIconBase64 = "data:image/png;base64,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";

  return (
    <div
      className={`rabby-icon ${className}`}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        ...style
      }}
    >
      <img
        src={rabbyIconBase64}
        alt="Rabby Wallet"
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

export default RabbyIcon;
