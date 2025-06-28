import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { Button, Input, Card } from '../../ui';
import { isValidEthereumAddress } from '../../../utils';

// Types
interface AddSafeAccountPageProps {
  onConnect: (data: SafeAccountData) => void;
  onBack?: () => void;
}

interface SafeAccountData {
  name: string;
  network: string;
  address: string;
}

// Styled Components
const Container = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: ${theme.spacing[8]} ${theme.spacing[8]} ${theme.spacing[12]};
  background: #030712;
`;

const FormCard = styled(Card)`
  max-width: 1000px;
  width: 100%;
  background: transparent;
  border: none;
  box-shadow: none;
`;

const Header = styled.div`
  margin-bottom: ${theme.spacing[16]};
  text-align: left;
`;

const Title = styled.h1`
  font-size: 3.5rem;
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[6]};
  line-height: 1.1;
`;

const StepText = styled.div`
  color: ${theme.colors.text.primary};
  font-size: 1.5rem;
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: ${theme.spacing[4]};
`;

const StepDescription = styled.div`
  color: ${theme.colors.text.muted};
  font-size: 1.25rem;
  line-height: 1.6;
  max-width: 48rem;
`;

const FormSection = styled.div`
  margin-bottom: ${theme.spacing[12]};
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
`;



const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: ${theme.spacing[6]};
  align-items: end;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: ${theme.spacing[4]};
  }
`;

const NetworkSelector = styled.div`
  position: relative;
`;

const NetworkButton = styled.button<{ isOpen: boolean }>`
  width: 100%;
  height: 64px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 16px;
  padding: 0 ${theme.spacing[6]};
  color: ${theme.colors.text.primary};
  font-size: ${theme.typography.fontSize.xl};
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);

  &:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
  }

  &:focus {
    outline: none;
    border-color: #12D66F;
    box-shadow: 0 0 0 4px rgba(18, 214, 111, 0.3);
  }

  ${props => props.isOpen && `
    border-color: #12D66F;
    background: rgba(18, 214, 111, 0.1);
    box-shadow: 0 0 0 4px rgba(18, 214, 111, 0.3);
  `}
`;

const NetworkDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: ${theme.colors.background.card};
  border: 1px solid ${theme.colors.border.secondary};
  border-radius: 8px;
  margin-top: 4px;
  z-index: 1000;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

const NetworkOption = styled.div`
  padding: ${theme.spacing[3]} ${theme.spacing[4]};
  color: ${theme.colors.text.primary};
  cursor: pointer;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
  
  &:hover {
    background: ${theme.colors.background.secondary};
  }
  
  &:not(:last-child) {
    border-bottom: 1px solid ${theme.colors.border.tertiary};
  }
`;

const NetworkBadge = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #12D66F;
`;

const ExistingSafeIndicator = styled.div`
  background: ${theme.colors.background.secondary};
  border: 1px solid ${theme.colors.status.warning};
  border-radius: 8px;
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[3]};
`;

const SafeIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, #12D66F 0%, #0EA5E9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 14px;
`;

const SafeInfo = styled.div`
  flex: 1;
`;

const SafeName = styled.div`
  color: ${theme.colors.text.primary};
  font-weight: ${theme.typography.fontWeight.medium};
  margin-bottom: 2px;
`;

const SafeAddress = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
`;

const Footer = styled.div`
  margin-top: ${theme.spacing[12]};
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
`;

const TermsText = styled.div`
  color: ${theme.colors.text.secondary};
  font-size: 1.125rem;
  text-align: center;
  margin-bottom: ${theme.spacing[8]};

  a {
    color: ${theme.colors.primary[400]};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing[6]};
  justify-content: space-between;
  align-items: center;
`;

// Network options - consistent with header
const NETWORKS = [
  { id: 'ethereum', name: 'Ethereum', color: '#627EEA' },
  { id: 'sepolia', name: 'Sepolia', color: '#12D66F' },
  { id: 'arbitrum', name: 'Arbitrum', color: '#28A0F0' },
];

const AddSafeAccountPage: React.FC<AddSafeAccountPageProps> = ({ onConnect, onBack }) => {
  const [formData, setFormData] = useState<SafeAccountData>({
    name: '',
    network: 'sepolia',
    address: ''
  });
  const [isNetworkDropdownOpen, setIsNetworkDropdownOpen] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [existingSafe, setExistingSafe] = useState<any>(null);

  // Validate address when it changes
  useEffect(() => {
    if (!formData.address) {
      setIsValidAddress(true);
      setExistingSafe(null);
      return;
    }

    const isValid = isValidEthereumAddress(formData.address);
    setIsValidAddress(isValid);

    // Don't show existing Safe indicator automatically
    setExistingSafe(null);
  }, [formData.address]);

  // Close network dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isNetworkDropdownOpen && !(event.target as Element).closest('.network-selector')) {
        setIsNetworkDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNetworkDropdownOpen]);

  const handleInputChange = (field: keyof SafeAccountData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNetworkSelect = (networkId: string) => {
    handleInputChange('network', networkId);
    setIsNetworkDropdownOpen(false);
  };

  const handleSubmit = () => {
    if (formData.address && isValidAddress) {
      onConnect(formData);
    }
  };

  const isFormValid = formData.address.trim() && isValidAddress;
  const selectedNetwork = NETWORKS.find(n => n.id === formData.network) || NETWORKS[1];

  return (
    <Container>
      <FormCard variant="elevated" padding="xl">
        <Header>
          <Title>Add existing Safe Account</Title>
          <div style={{ width: '8rem', height: '4px', backgroundColor: '#12D66F', marginBottom: '2rem' }}></div>
          <StepText>Choose address and network</StepText>
          <StepDescription>
            Paste the address of the Safe Account you want to add and select the network.
          </StepDescription>
        </Header>

        <FormSection>
          <FormRow>
            <Input
              label="Safe Address"
              placeholder="0x..."
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              error={!isValidAddress ? 'Please enter a valid Ethereum address' : undefined}
              variant="outlined"
              inputSize="xl"
              fullWidth
            />

            <div>
              <label className="text-sm font-medium text-gray-300 mb-1 block">Network</label>
              <NetworkSelector className="network-selector">
                <NetworkButton
                  type="button"
                  isOpen={isNetworkDropdownOpen}
                  onClick={() => setIsNetworkDropdownOpen(!isNetworkDropdownOpen)}
                >
                  <div className="flex items-center gap-2">
                    <NetworkBadge />
                    {selectedNetwork.name}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </NetworkButton>

                {isNetworkDropdownOpen && (
                  <NetworkDropdown>
                    {NETWORKS.map((network) => (
                      <NetworkOption
                        key={network.id}
                        onClick={() => handleNetworkSelect(network.id)}
                      >
                        <NetworkBadge style={{ background: network.color }} />
                        {network.name}
                      </NetworkOption>
                    ))}
                  </NetworkDropdown>
                )}
              </NetworkSelector>
            </div>
          </FormRow>

          {existingSafe && (
            <ExistingSafeIndicator>
              <SafeIcon>
                {existingSafe.name.charAt(0)}
              </SafeIcon>
              <SafeInfo>
                <SafeName>{existingSafe.name}</SafeName>
                <SafeAddress>sep:{formData.address}</SafeAddress>
              </SafeInfo>
              <div style={{ color: theme.colors.status.warning, fontSize: '12px' }}>
                Safe Account is already added
              </div>
            </ExistingSafeIndicator>
          )}
        </FormSection>

        <Footer>
          <TermsText>
            By continuing you consent to the{' '}
            <button
              type="button"
              onClick={() => console.log('Terms of use clicked')}
              style={{
                background: 'none',
                border: 'none',
                color: '#12D66F',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              terms of use
            </button> and{' '}
            <button
              type="button"
              onClick={() => console.log('Privacy policy clicked')}
              style={{
                background: 'none',
                border: 'none',
                color: '#12D66F',
                textDecoration: 'underline',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit'
              }}
            >
              privacy policy
            </button>.
          </TermsText>

          <ButtonRow>
            <Button
              variant="outline"
              size="lg"
              onClick={onBack}
              leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 19L5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              Back
            </Button>
            
            <Button
              variant="primary"
              size="lg"
              disabled={!isFormValid}
              onClick={handleSubmit}
              className={isFormValid ? 'bg-green-500 border-green-500 hover:bg-green-600 hover:border-green-600' : ''}
            >
              Next
            </Button>
          </ButtonRow>
        </Footer>
      </FormCard>
    </Container>
  );
};

export default AddSafeAccountPage;
