import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { Button, Input } from '../../ui';
import { walletConnectionService } from '../../../services/WalletConnectionService';
import WalletConnectionModal from '../../ui/WalletConnectionModal';
import ModuleService from '../../../services/ModuleService';
import AddressDisplay from './AddressDisplay';
import { useToast } from '../../../hooks/useToast';
import { ethers } from 'ethers';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: ${theme.spacing[8]};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[8]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const SectionDescription = styled.p`
  margin: 0 0 ${theme.spacing[6]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.6;
`;

const WarningBox = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid ${theme.colors.status.warning};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[6]};
`;

const WarningTitle = styled.h4`
  margin: 0 0 ${theme.spacing[2]} 0;
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.status.warning};
`;

const WarningText = styled.p`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.warning};
  line-height: 1.5;
`;

const ModuleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing[4]};
`;

const ModuleItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing[4]};
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[600]};
  border-radius: ${theme.borderRadius.md};
`;

const ModuleInfo = styled.div`
  flex: 1;
`;

const ModuleName = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
`;

const ModuleDescription = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const ModuleActions = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
`;

const AddModuleForm = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  align-items: end;
  margin-top: ${theme.spacing[4]};
`;

const FormGroup = styled.div`
  flex: 1;
`;

const Label = styled.label`
  display: block;
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[2]};
`;

const InfoBox = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid ${theme.colors.primary[600]};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing[4]};
  margin-bottom: ${theme.spacing[4]};
`;

const InfoText = styled.p`
  margin: 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.primary[300]};
  line-height: 1.5;
`;

const LoadingText = styled.div`
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  padding: ${theme.spacing[4]};
`;

const EmptyState = styled.div`
  text-align: center;
  color: ${theme.colors.text.secondary};
  font-size: ${theme.typography.fontSize.sm};
  padding: ${theme.spacing[6]};
`;

interface ModuleManagementSectionProps {
  network: string;
}

interface EnabledModule {
  address: string;
  name: string;
  description: string;
}

const ModuleManagementSection: React.FC<ModuleManagementSectionProps> = ({ network }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [enabledModules, setEnabledModules] = useState<EnabledModule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newModuleAddress, setNewModuleAddress] = useState('');
  const [isEnabling, setIsEnabling] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const checkConnection = () => {
      const connectionState = walletConnectionService.getConnectionState();
      setIsConnected(connectionState.isConnected);
    };

    checkConnection();
    const unsubscribe = walletConnectionService.subscribe(checkConnection);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (isConnected) {
      loadEnabledModules();
    }
  }, [isConnected, loadEnabledModules]);

  const loadEnabledModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const modules = await ModuleService.getEnabledModules();
      setEnabledModules(modules);
    } catch (error) {
      console.error('Error loading enabled modules:', error);
      toast.error('Failed to load modules', {
        message: 'Could not retrieve enabled modules from the Safe'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleDisableModule = async (moduleAddress: string, moduleName: string) => {
    if (!isConnected) {
      setShowWalletModal(true);
      return;
    }

    try {
      await ModuleService.disableModule(moduleAddress);
      toast.success('Module Disabled', {
        message: `${moduleName} has been disabled successfully`
      });
      await loadEnabledModules();
    } catch (error) {
      console.error('Error disabling module:', error);
      toast.error('Failed to disable module', {
        message: `Could not disable ${moduleName}. Please try again.`
      });
    }
  };

  const handleEnableModule = async () => {
    if (!isConnected) {
      setShowWalletModal(true);
      return;
    }

    if (!newModuleAddress) {
      toast.error('Missing Address', {
        message: 'Please enter a module address'
      });
      return;
    }

    if (!ethers.utils.isAddress(newModuleAddress)) {
      toast.error('Invalid Address', {
        message: 'Please enter a valid Ethereum address'
      });
      return;
    }

    // Check if module is already enabled
    if (enabledModules.some(m => m.address.toLowerCase() === newModuleAddress.toLowerCase())) {
      toast.error('Module Already Enabled', {
        message: 'This module is already enabled on your Safe'
      });
      return;
    }

    setIsEnabling(true);
    try {
      await ModuleService.enableModule(newModuleAddress);
      toast.success('Module Enabled', {
        message: 'Module has been successfully enabled on your Safe'
      });
      setNewModuleAddress('');
      await loadEnabledModules();
    } catch (error) {
      console.error('Error enabling module:', error);
      toast.error('Failed to enable module', {
        message: 'Could not enable the module. Please try again.'
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <Container>
      <WarningBox>
        <WarningTitle>⚠️ Important Security Notice</WarningTitle>
        <WarningText>
          Modules are extensions with unlimited access to your Safe that can execute arbitrary transactions. 
          Only enable trusted and audited modules. A malicious module can completely take over your Safe.
        </WarningText>
      </WarningBox>

      {/* Enabled Modules Section */}
      <Section>
        <SectionTitle>Enabled Modules</SectionTitle>
        <SectionDescription>
          These modules are currently enabled on your Safe and have full access to execute transactions.
        </SectionDescription>

        {isLoading ? (
          <LoadingText>Loading enabled modules...</LoadingText>
        ) : enabledModules.length > 0 ? (
          <ModuleList>
            {enabledModules.map((module) => (
              <ModuleItem key={module.address}>
                <ModuleInfo>
                  <ModuleName>{module.name}</ModuleName>
                  <ModuleDescription>{module.description}</ModuleDescription>
                  <div style={{ marginTop: theme.spacing[2] }}>
                    <AddressDisplay
                      address={module.address}
                      network={network}
                      truncate={true}
                      truncateLength={8}
                      showCopy={true}
                      showExplorer={true}
                    />
                  </div>
                </ModuleInfo>
                <ModuleActions>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDisableModule(module.address, module.name)}
                    disabled={!isConnected}
                    allowClickWhenDisabled={!isConnected}
                    className={!isConnected ? 'opacity-50' : ''}
                  >
                    Disable
                  </Button>
                </ModuleActions>
              </ModuleItem>
            ))}
          </ModuleList>
        ) : (
          <EmptyState>
            No modules are currently enabled on this Safe.
          </EmptyState>
        )}
      </Section>

      {/* Enable New Module Section */}
      <Section>
        <SectionTitle>Enable New Module</SectionTitle>
        <SectionDescription>
          Enter the address of a trusted module contract to enable it on your Safe.
        </SectionDescription>

        <InfoBox>
          <InfoText>
            <strong>Popular Module Examples:</strong><br/>
            • <strong>Inheritance Module:</strong> Allows beneficiaries to claim assets after inactivity<br/>
            • <strong>Spending Limit Module:</strong> Set daily/monthly spending limits<br/>
            • <strong>Social Recovery Module:</strong> Recover access through trusted guardians<br/>
            • <strong>Allowance Module:</strong> Give limited spending permissions to other addresses
          </InfoText>
        </InfoBox>

        <AddModuleForm>
          <FormGroup>
            <Label>Module Contract Address</Label>
            <Input
              value={newModuleAddress}
              onChange={(e) => setNewModuleAddress(e.target.value)}
              placeholder="0x..."
              disabled={!isConnected}
            />
          </FormGroup>
          <Button
            variant="primary"
            onClick={handleEnableModule}
            disabled={!isConnected || isEnabling || !newModuleAddress}
            loading={isEnabling}
            allowClickWhenDisabled={!isConnected}
            className={!isConnected ? 'opacity-50' : ''}
          >
            {isEnabling ? 'Enabling...' : 'Enable Module'}
          </Button>
        </AddModuleForm>
      </Section>

      {/* Modals */}
      <WalletConnectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onWalletSelect={(walletType) => {
          console.log('Wallet selected:', walletType);
          setShowWalletModal(false);
        }}
      />
    </Container>
  );
};

export default ModuleManagementSection;
