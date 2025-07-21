import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { rpcConfigService, RpcValidationResult } from '../../../services/RpcConfigService';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: ${theme.spacing[8]};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[8]};
`;

const SectionTitle = styled.h2`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  margin: 0 0 ${theme.spacing[6]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const NetworkCard = styled.div`
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
  margin-bottom: ${theme.spacing[4]};
`;

const NetworkHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${theme.spacing[4]};
`;

const NetworkName = styled.h3`
  margin: 0;
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const StatusBadge = styled.span<{ status: 'default' | 'custom' | 'validating' | 'error' }>`
  padding: ${theme.spacing[1]} ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.full};
  font-size: ${theme.typography.fontSize.xs};
  font-weight: ${theme.typography.fontWeight.medium};

  ${props => {
    switch (props.status) {
      case 'custom':
        return `
          background: ${theme.colors.secondary[900]};
          color: ${theme.colors.secondary[300]};
        `;
      case 'validating':
        return `
          background: ${theme.colors.status.warning}20;
          color: ${theme.colors.text.warning};
        `;
      case 'error':
        return `
          background: ${theme.colors.status.error}20;
          color: ${theme.colors.text.danger};
        `;
      default:
        return `
          background: ${theme.colors.neutral[700]};
          color: ${theme.colors.text.secondary};
        `;
    }
  }}
`;

const InputGroup = styled.div`
  margin-bottom: ${theme.spacing[4]};
`;

const Label = styled.label`
  display: block;
  margin-bottom: ${theme.spacing[2]};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
`;

const Input = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: ${theme.spacing[3]};
  border: 1px solid ${props => props.hasError ? theme.colors.status.error : theme.colors.neutral[600]};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.neutral[900]};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? theme.colors.status.error : theme.colors.primary[400]};
    box-shadow: 0 0 0 2px ${props => props.hasError ? theme.colors.status.error : theme.colors.primary[400]}40;
  }

  &::placeholder {
    color: ${theme.colors.text.tertiary};
  }
`;

const CurrentUrl = styled.div`
  margin-bottom: ${theme.spacing[3]};
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[900]};
  border-radius: ${theme.borderRadius.md};
  border: 1px solid ${theme.colors.neutral[700]};
`;

const UrlLabel = styled.div`
  font-size: ${theme.typography.fontSize.xs};
  color: ${theme.colors.text.secondary};
  margin-bottom: ${theme.spacing[1]};
`;

const UrlValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  font-family: monospace;
  word-break: break-all;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  margin-top: ${theme.spacing[4]};
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: ${theme.spacing[2]} ${theme.spacing[4]};
  border-radius: ${theme.borderRadius.md};
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: ${theme.colors.primary[600]};
          border-color: ${theme.colors.primary[600]};
          color: white;
          
          &:hover:not(:disabled) {
            background: ${theme.colors.primary[700]};
            border-color: ${theme.colors.primary[700]};
          }
        `;
      case 'danger':
        return `
          background: ${theme.colors.status.error};
          border-color: ${theme.colors.status.error};
          color: white;

          &:hover:not(:disabled) {
            background: ${theme.colors.status.error}dd;
            border-color: ${theme.colors.status.error}dd;
          }
        `;
      default:
        return `
          background: transparent;
          border-color: ${theme.colors.neutral[600]};
          color: ${theme.colors.text.primary};
          
          &:hover:not(:disabled) {
            background: ${theme.colors.neutral[700]};
          }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  margin-top: ${theme.spacing[2]};
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  background: ${theme.colors.status.error}20;
  border: 1px solid ${theme.colors.status.error}40;
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.text.danger};
  font-size: ${theme.typography.fontSize.sm};
`;

const ValidationInfo = styled.div`
  margin-top: ${theme.spacing[2]};
  padding: ${theme.spacing[2]} ${theme.spacing[3]};
  background: ${theme.colors.secondary[900]};
  border: 1px solid ${theme.colors.secondary[700]};
  border-radius: ${theme.borderRadius.md};
  color: ${theme.colors.secondary[300]};
  font-size: ${theme.typography.fontSize.sm};
`;



interface EnvironmentTabProps {
  network: string;
}

interface NetworkState {
  customUrl: string;
  isValidating: boolean;
  validationResult: RpcValidationResult | null;
  hasChanges: boolean;
}

const NETWORK_INFO = {
  ethereum: { name: 'Ethereum Mainnet', chainId: 1 },
  sepolia: { name: 'Sepolia Testnet', chainId: 11155111 },
  arbitrum: { name: 'Arbitrum One', chainId: 42161 },
} as const;

const EnvironmentTab: React.FC<EnvironmentTabProps> = ({ network }) => {
  const [networkState, setNetworkState] = useState<NetworkState>({
    customUrl: '',
    isValidating: false,
    validationResult: null,
    hasChanges: false,
  });

  useEffect(() => {
    // Initialize state for current network only
    const customUrl = rpcConfigService.getCustomRpcUrl(network as any) || '';
    setNetworkState({
      customUrl,
      isValidating: false,
      validationResult: null,
      hasChanges: false,
    });
  }, [network]);

  const handleUrlChange = (url: string) => {
    const originalUrl = rpcConfigService.getCustomRpcUrl(network as any) || '';
    setNetworkState(prev => ({
      ...prev,
      customUrl: url,
      hasChanges: url !== originalUrl,
      validationResult: null,
    }));
  };

  const validateUrl = async () => {
    if (!networkState.customUrl.trim()) return;

    setNetworkState(prev => ({ ...prev, isValidating: true }));

    try {
      const result = await rpcConfigService.validateRpcUrl(networkState.customUrl);
      setNetworkState(prev => ({
        ...prev,
        isValidating: false,
        validationResult: result,
      }));
    } catch (error) {
      setNetworkState(prev => ({
        ...prev,
        isValidating: false,
        validationResult: {
          isValid: false,
          error: 'Validation failed'
        },
      }));
    }
  };

  const saveUrl = () => {
    rpcConfigService.setCustomRpcUrl(network as any, networkState.customUrl);
    setNetworkState(prev => ({ ...prev, hasChanges: false }));
  };

  const resetUrl = () => {
    rpcConfigService.resetToDefault(network as any);
    setNetworkState({
      customUrl: '',
      isValidating: false,
      validationResult: null,
      hasChanges: false,
    });
  };

  const getStatusBadge = () => {
    if (networkState.isValidating) {
      return { status: 'validating' as const, text: 'Validating...' };
    }

    if (networkState.validationResult?.isValid === false) {
      return { status: 'error' as const, text: 'Invalid' };
    }

    if (rpcConfigService.hasCustomRpcUrl(network as any)) {
      return { status: 'custom' as const, text: 'Custom' };
    }

    return { status: 'default' as const, text: 'Default' };
  };

  const currentNetworkInfo = NETWORK_INFO[network as keyof typeof NETWORK_INFO];
  const badge = getStatusBadge();
  const isUsingCustomRpc = rpcConfigService.hasCustomRpcUrl(network as any);

  if (!currentNetworkInfo) {
    return (
      <Container>
        <Section>
          <SectionTitle>RPC Configuration</SectionTitle>
          <ErrorMessage>
            Unsupported network: {network}
          </ErrorMessage>
        </Section>
      </Container>
    );
  }

  return (
    <Container>
      <Section>
        <SectionTitle>RPC Configuration</SectionTitle>
        <SectionDescription>
          Configure a custom RPC endpoint for <strong>{currentNetworkInfo.name}</strong>.
          When set, your custom RPC URL will be used instead of the default endpoint.
          Leave empty to use the default RPC endpoint. Changes are saved automatically and will persist
          across browser sessions.
        </SectionDescription>

        <NetworkCard>
          <NetworkHeader>
            <NetworkName>{currentNetworkInfo.name}</NetworkName>
            <StatusBadge status={badge.status}>{badge.text}</StatusBadge>
          </NetworkHeader>

          {isUsingCustomRpc && (
            <CurrentUrl>
              <UrlLabel>Currently using custom RPC endpoint</UrlLabel>
              <UrlValue>{rpcConfigService.getCustomRpcUrl(network as any)}</UrlValue>
            </CurrentUrl>
          )}

          <InputGroup>
            <Label htmlFor={`rpc-${network}`}>Custom RPC URL</Label>
            <Input
              id={`rpc-${network}`}
              type="url"
              value={networkState.customUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={`Enter custom RPC URL for ${currentNetworkInfo.name}...`}
              hasError={networkState.validationResult?.isValid === false}
            />
          </InputGroup>

          {networkState.validationResult?.isValid === false && (
            <ErrorMessage>
              {networkState.validationResult.error}
            </ErrorMessage>
          )}

          {networkState.validationResult?.isValid === true && (
            <ValidationInfo>
              ✅ RPC endpoint is valid
              {networkState.validationResult.chainId && (
                <>
                  {' • '}Chain ID: {networkState.validationResult.chainId}
                  {networkState.validationResult.chainId !== currentNetworkInfo.chainId && (
                    <span style={{ color: theme.colors.text.warning }}>
                      {' '}(Expected: {currentNetworkInfo.chainId})
                    </span>
                  )}
                </>
              )}
              {networkState.validationResult.blockNumber && (
                <>{' • '}Block: {networkState.validationResult.blockNumber}</>
              )}
            </ValidationInfo>
          )}

          <ButtonGroup>
            <Button
              onClick={validateUrl}
              disabled={!networkState.customUrl.trim() || networkState.isValidating}
            >
              {networkState.isValidating ? 'Validating...' : 'Test Connection'}
            </Button>

            <Button
              variant="primary"
              onClick={saveUrl}
              disabled={!networkState.hasChanges}
            >
              Save
            </Button>

            <Button
              variant="secondary"
              onClick={resetUrl}
              disabled={!isUsingCustomRpc}
            >
              Reset to Default
            </Button>
          </ButtonGroup>
        </NetworkCard>
      </Section>
    </Container>
  );
};

export default EnvironmentTab;
