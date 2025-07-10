import React, { Component, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  margin: 1rem;
`;

const ErrorIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 1rem;
  color: #ef4444;
`;

const ErrorTitle = styled.h2`
  color: #ef4444;
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  text-align: center;
`;

const ErrorMessage = styled.p`
  color: #fca5a5;
  font-size: 1rem;
  margin-bottom: 1.5rem;
  text-align: center;
  max-width: 500px;
  line-height: 1.5;
`;

const ErrorDetails = styled.details`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  max-width: 600px;
  width: 100%;
  
  summary {
    color: #fca5a5;
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.5rem;
    
    &:hover {
      color: #ef4444;
    }
  }
`;

const ErrorStack = styled.pre`
  color: #d1d5db;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  max-height: 200px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
`;

const Button = styled.button`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.primary {
    background: #3b82f6;
    color: white;
    
    &:hover {
      background: #2563eb;
    }
  }
  
  &.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: #d1d5db;
    border: 1px solid rgba(255, 255, 255, 0.2);
    
    &:hover {
      background: rgba(255, 255, 255, 0.2);
    }
  }
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a WalletConnect internal error that should be suppressed
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';

    if (errorMessage.includes('No matching key') &&
        (errorStack.includes('bundle.js') || errorStack.includes('isValidSessionOrPairingTopic'))) {
      console.log('🔇 Suppressed WalletConnect error in error boundary:', errorMessage);
      return { hasError: false }; // Don't show error boundary
    }

    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Check if this is a WalletConnect internal error
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';

    if (errorMessage.includes('No matching key') &&
        (errorStack.includes('bundle.js') || errorStack.includes('isValidSessionOrPairingTopic'))) {
      console.log('🔇 Suppressed WalletConnect error in componentDidCatch:', errorMessage);
      // Reset error boundary state
      this.setState({ hasError: false });
      return;
    }

    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external error reporting service if available
    if ((window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorContainer>
          <ErrorIcon>⚠️</ErrorIcon>
          <ErrorTitle>Something went wrong</ErrorTitle>
          <ErrorMessage>
            An unexpected error occurred while rendering this component. 
            This might be due to a network issue, invalid data, or a temporary glitch.
          </ErrorMessage>
          
          <ActionButtons>
            <Button className="primary" onClick={this.handleReset}>
              Try Again
            </Button>
            <Button className="secondary" onClick={this.handleReload}>
              Reload Page
            </Button>
          </ActionButtons>

          {this.state.error && (
            <ErrorDetails>
              <summary>Technical Details</summary>
              <ErrorStack>
                <strong>Error:</strong> {this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    <br /><br />
                    <strong>Component Stack:</strong>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </ErrorStack>
            </ErrorDetails>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
