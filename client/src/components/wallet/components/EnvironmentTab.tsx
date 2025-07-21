import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { rpcConfigService, RpcValidationResult } from '../../../services/RpcConfigService';
import { getRpcUrl as getDefaultRpcUrl } from '../../../contracts/abis';

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

const ResetAllButton = styled(Button)`
  margin-top: ${theme.spacing[6]};
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

const NETWORKS = [
  { key: 'ethereum', name: 'Ethereum Mainnet', chainId: 1 },
  { key: 'sepolia', name: 'Sepolia Testnet', chainId: 11155111 },
  { key: 'arbitrum', name: 'Arbitrum One', chainId: 42161 },
] as const;

const EnvironmentTab: React.FC<EnvironmentTabProps> = ({ network }) => {
  const [networkStates, setNetworkStates] = useState<Record<string, NetworkState>>({});

  useEffect(() => {
    // Initialize network states
    const initialStates: Record<string, NetworkState> = {};
    NETWORKS.forEach(net => {
      const customUrl = rpcConfigService.getCustomRpcUrl(net.key as any) || '';
      initialStates[net.key] = {
        customUrl,
        isValidating: false,
        validationResult: null,
        hasChanges: false,
      };
    });
    setNetworkStates(initialStates);
  }, []);

  const updateNetworkState = (networkKey: string, updates: Partial<NetworkState>) => {
    setNetworkStates(prev => ({
      ...prev,
      [networkKey]: { ...prev[networkKey], ...updates }
    }));
  };

  const handleUrlChange = (networkKey: string, url: string) => {
    const originalUrl = rpcConfigService.getCustomRpcUrl(networkKey as any) || '';
    updateNetworkState(networkKey, {
      customUrl: url,
      hasChanges: url !== originalUrl,
      validationResult: null,
    });
  };

  const validateUrl = async (networkKey: string) => {
    const state = networkStates[networkKey];
    if (!state?.customUrl.trim()) return;

    updateNetworkState(networkKey, { isValidating: true });

    try {
      const result = await rpcConfigService.validateRpcUrl(state.customUrl);
      updateNetworkState(networkKey, {
        isValidating: false,
        validationResult: result,
      });
    } catch (error) {
      updateNetworkState(networkKey, {
        isValidating: false,
        validationResult: {
          isValid: false,
          error: 'Validation failed'
        },
      });
    }
  };

  const saveUrl = (networkKey: string) => {
    const state = networkStates[networkKey];
    if (!state) return;

    rpcConfigService.setCustomRpcUrl(networkKey as any, state.customUrl);
    updateNetworkState(networkKey, { hasChanges: false });
  };

  const resetUrl = (networkKey: string) => {
    rpcConfigService.resetToDefault(networkKey as any);
    updateNetworkState(networkKey, {
      customUrl: '',
      hasChanges: false,
      validationResult: null,
    });
  };

  const resetAllUrls = () => {
    rpcConfigService.resetAllToDefaults();
    const resetStates: Record<string, NetworkState> = {};
    NETWORKS.forEach(net => {
      resetStates[net.key] = {
        customUrl: '',
        isValidating: false,
        validationResult: null,
        hasChanges: false,
      };
    });
    setNetworkStates(resetStates);
  };

  const getStatusBadge = (networkKey: string) => {
    const state = networkStates[networkKey];
    if (!state) return { status: 'default' as const, text: 'Default' };

    if (state.isValidating) {
      return { status: 'validating' as const, text: 'Validating...' };
    }

    if (state.validationResult?.isValid === false) {
      return { status: 'error' as const, text: 'Invalid' };
    }

    if (rpcConfigService.hasCustomRpcUrl(networkKey as any)) {
      return { status: 'custom' as const, text: 'Custom' };
    }

    return { status: 'default' as const, text: 'Default' };
  };

  return (
    <Container>
      <Section>
        <SectionTitle>RPC Configuration</SectionTitle>
        <SectionDescription>
          Configure custom RPC endpoints for each network. Custom URLs will be used instead of the default 
          endpoints. Leave empty to use default RPC URLs. Changes are saved automatically and will persist 
          across browser sessions.
        </SectionDescription>

        {NETWORKS.map(net => {
          const state = networkStates[net.key];
          const currentUrl = rpcConfigService.getRpcUrl(net.key);
          const defaultUrl = getDefaultRpcUrl(net.key);
          const badge = getStatusBadge(net.key);

          if (!state) return null;

          return (
            <NetworkCard key={net.key}>
              <NetworkHeader>
                <NetworkName>{net.name}</NetworkName>
                <StatusBadge status={badge.status}>{badge.text}</StatusBadge>
              </NetworkHeader>

              <CurrentUrl>
                <UrlLabel>Current RPC URL:</UrlLabel>
                <UrlValue>{currentUrl}</UrlValue>
              </CurrentUrl>

              {currentUrl !== defaultUrl && (
                <CurrentUrl>
                  <UrlLabel>Default RPC URL:</UrlLabel>
                  <UrlValue>{defaultUrl}</UrlValue>
                </CurrentUrl>
              )}

              <InputGroup>
                <Label htmlFor={`rpc-${net.key}`}>Custom RPC URL</Label>
                <Input
                  id={`rpc-${net.key}`}
                  type="url"
                  value={state.customUrl}
                  onChange={(e) => handleUrlChange(net.key, e.target.value)}
                  placeholder={`Enter custom RPC URL for ${net.name}...`}
                  hasError={state.validationResult?.isValid === false}
                />
              </InputGroup>

              {state.validationResult?.isValid === false && (
                <ErrorMessage>
                  {state.validationResult.error}
                </ErrorMessage>
              )}

              {state.validationResult?.isValid === true && (
                <ValidationInfo>
                  ✅ RPC endpoint is valid
                  {state.validationResult.chainId && (
                    <>
                      {' • '}Chain ID: {state.validationResult.chainId}
                      {state.validationResult.chainId !== net.chainId && (
                        <span style={{ color: theme.colors.text.warning }}>
                          {' '}(Expected: {net.chainId})
                        </span>
                      )}
                    </>
                  )}
                  {state.validationResult.blockNumber && (
                    <>{' • '}Block: {state.validationResult.blockNumber}</>
                  )}
                </ValidationInfo>
              )}

              <ButtonGroup>
                <Button
                  onClick={() => validateUrl(net.key)}
                  disabled={!state.customUrl.trim() || state.isValidating}
                >
                  {state.isValidating ? 'Validating...' : 'Test Connection'}
                </Button>
                
                <Button
                  variant="primary"
                  onClick={() => saveUrl(net.key)}
                  disabled={!state.hasChanges}
                >
                  Save
                </Button>
                
                <Button
                  variant="secondary"
                  onClick={() => resetUrl(net.key)}
                  disabled={!rpcConfigService.hasCustomRpcUrl(net.key as any)}
                >
                  Reset to Default
                </Button>
              </ButtonGroup>
            </NetworkCard>
          );
        })}

        <ResetAllButton
          variant="danger"
          onClick={resetAllUrls}
          disabled={!NETWORKS.some(net => rpcConfigService.hasCustomRpcUrl(net.key as any))}
        >
          Reset All to Defaults
        </ResetAllButton>
      </Section>
    </Container>
  );
};

export default EnvironmentTab;
