import React, { useEffect, useState, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const slideIn = keyframes`
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
`;

const slideOut = keyframes`
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
`;

const ToastContainer = styled.div<{ type: ToastType; isExiting: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  min-width: 300px;
  position: relative;
  animation: ${props => props.isExiting 
    ? css`${slideOut} 0.3s ease-in-out forwards`
    : css`${slideIn} 0.3s ease-in-out`
  };

  ${props => {
    switch (props.type) {
      case 'success':
        return css`
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        `;
      case 'error':
        return css`
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        `;
      case 'warning':
        return css`
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: #f59e0b;
        `;
      case 'info':
        return css`
          background: rgba(59, 130, 246, 0.15);
          border-color: rgba(59, 130, 246, 0.4);
          color: #60a5fa;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.2);
        `;
      default:
        return css`
          background: rgba(107, 114, 128, 0.1);
          border-color: rgba(107, 114, 128, 0.3);
          color: #6b7280;
        `;
    }
  }}
`;

const IconContainer = styled.div`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-top: 2px;
`;

const ContentContainer = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.4;
`;

const Message = styled.div`
  font-size: 13px;
  opacity: 0.9;
  line-height: 1.4;
  word-wrap: break-word;
`;

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const ActionButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  font-size: 16px;
  line-height: 1;

  &:hover {
    opacity: 1;
  }
`;

const ProgressBar = styled.div<{ duration: number }>`
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: currentColor;
  opacity: 0.3;
  animation: progress ${props => props.duration}ms linear;

  @keyframes progress {
    from {
      width: 100%;
    }
    to {
      width: 0%;
    }
  }
`;

const getIcon = (type: ToastType): string => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✗';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ℹ';
    default:
      return '•';
  }
};

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  action
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Match animation duration
  }, [id, onClose]);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, handleClose]);

  const handleActionClick = () => {
    if (action) {
      action.onClick();
      handleClose();
    }
  };

  return (
    <ToastContainer type={type} isExiting={isExiting}>
      <IconContainer>
        {getIcon(type)}
      </IconContainer>
      
      <ContentContainer>
        <Title>{title}</Title>
        {message && <Message>{message}</Message>}
        
        {action && (
          <ActionContainer>
            <ActionButton onClick={handleActionClick}>
              {action.label}
            </ActionButton>
          </ActionContainer>
        )}
      </ContentContainer>

      <CloseButton onClick={handleClose}>
        ×
      </CloseButton>

      {duration > 0 && <ProgressBar duration={duration} />}
    </ToastContainer>
  );
};

// Toast Container Component
const ToastContainerWrapper = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;

  > * {
    pointer-events: auto;
  }
`;

interface ToastContainerProps {
  toasts: Array<{
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  onClose: (id: string) => void;
  style?: React.CSSProperties;
}

export const ToastNotificationContainer: React.FC<ToastContainerProps> = ({ toasts, onClose, style }) => {
  return (
    <ToastContainerWrapper style={style}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          action={toast.action}
          onClose={onClose}
        />
      ))}
    </ToastContainerWrapper>
  );
};

export default Toast;
