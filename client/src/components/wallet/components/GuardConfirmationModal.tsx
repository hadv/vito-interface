import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { SafeGuardService } from '../../../services/SafeGuardService';
import Button from '../../ui/Button';
import AddressDisplay from './AddressDisplay';

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1050;
  padding: 20px;
`;

const ModalContainer = styled.div`
  background: ${theme.colors.neutral[800]};
  border: 1px solid ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.lg};
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  padding: ${theme.spacing[6]};
  border-bottom: 1px solid ${theme.colors.neutral[700]};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: ${theme.typography.fontSize.xl};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.text.primary};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${theme.colors.text.secondary};
  font-size: 24px;
  cursor: pointer;
  padding: ${theme.spacing[1]};
  border-radius: ${theme.borderRadius.sm};
  transition: all 0.2s ease;

  &:hover {
    color: ${theme.colors.text.primary};
    background: ${theme.colors.neutral[700]};
  }
`;

const ModalContent = styled.div`
  padding: ${theme.spacing[6]};
`;

const Section = styled.div`
  margin-bottom: ${theme.spacing[6]};
`;

const SectionTitle = styled.h3`
  margin: 0 0 ${theme.spacing[3]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const InfoGrid = styled.div`
  display: grid;
  gap: ${theme.spacing[3]};
  margin-bottom: ${theme.spacing[4]};
`;

const InfoItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const InfoLabel = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  font-weight: ${theme.typography.fontWeight.medium};
  color: ${theme.colors.text.secondary};
  min-width: 120px;
`;

const InfoValue = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  text-align: right;
  flex: 1;
  word-break: break-all;
`;

const WarningBox = styled.div`
  padding: ${theme.spacing[4]};
  background: ${theme.colors.status.warning}20;
  border: 1px solid ${theme.colors.status.warning}30;
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[4]};
`;

const WarningTitle = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.bold};
  color: ${theme.colors.status.warning};
  margin-bottom: ${theme.spacing[2]};
  display: flex;
  align-items: center;
  gap: ${theme.spacing[2]};
`;

const WarningList = styled.ul`
  margin: 0;
  padding-left: ${theme.spacing[4]};
  color: ${theme.colors.status.warning};
  font-size: ${theme.typography.fontSize.sm};
  line-height: 1.5;
`;

const WarningItem = styled.li`
  margin-bottom: ${theme.spacing[1]};
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing[3]};
  margin-bottom: ${theme.spacing[4]};
  padding: ${theme.spacing[3]};
  background: ${theme.colors.neutral[700]};
  border-radius: ${theme.borderRadius.md};
`;

const Checkbox = styled.input`
  margin: 0;
  transform: scale(1.2);
`;

const CheckboxLabel = styled.label`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.primary};
  line-height: 1.5;
  cursor: pointer;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
  margin-top: ${theme.spacing[6]};
`;

const ValidationStatus = styled.div<{ isValid: boolean }>`
  padding: ${theme.spacing[3]};
  border-radius: ${theme.borderRadius.md};
  margin-bottom: ${theme.spacing[4]};
  
  ${props => props.isValid ? `
    background: ${theme.colors.status.success}20;
    border: 1px solid ${theme.colors.status.success}30;
    color: ${theme.colors.status.success};
  ` : `
    background: ${theme.colors.status.error}20;
    border: 1px solid ${theme.colors.status.error}30;
    color: ${theme.colors.status.error};
  `}
`;

interface GuardConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  guardAddress: string;
  safeAddress: string;
  network: string;
  isRemoving?: boolean;
}

const GuardConfirmationModal: React.FC<GuardConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  guardAddress,
  safeAddress,
  network,
  isRemoving = false
}) => {
  const [hasReadWarnings, setHasReadWarnings] = useState(false);
  const [hasConfirmedRisks, setHasConfirmedRisks] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
  } | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setHasReadWarnings(false);
      setHasConfirmedRisks(false);
      setValidationResult(null);
    }
  }, [isOpen]);

  const validateGuard = useCallback(async () => {
    try {
      // Basic validation
      const basicValidation = SafeGuardService.validateGuardAddress(guardAddress);
      if (!basicValidation.isValid) {
        setValidationResult(basicValidation);
        return;
      }

      // Security validation
      const securityValidation = SafeGuardService.validateGuardSecurity(guardAddress, safeAddress);
      if (!securityValidation.isValid) {
        setValidationResult({
          isValid: false,
          error: 'Security validation failed',
          warnings: securityValidation.warnings
        });
        return;
      }

      setValidationResult({
        isValid: true,
        warnings: securityValidation.warnings
      });
    } catch (error) {
      setValidationResult({
        isValid: false,
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  }, [guardAddress, safeAddress]);

  // Validate guard when modal opens (only for setting, not removing)
  useEffect(() => {
    if (isOpen && !isRemoving && guardAddress) {
      validateGuard();
    }
  }, [isOpen, isRemoving, guardAddress, validateGuard]);

  const canConfirm = isRemoving || (
    hasReadWarnings && 
    hasConfirmedRisks && 
    validationResult?.isValid
  );

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalOverlay isOpen={isOpen} onClick={handleOverlayClick}>
      <ModalContainer>
        <ModalHeader>
          <ModalTitle>
            {isRemoving ? '🛡️ Remove Guard' : '🛡️ Set Guard'}
          </ModalTitle>
          <CloseButton onClick={onClose}>&times;</CloseButton>
        </ModalHeader>

        <ModalContent>
          {/* Guard Information */}
          <Section>
            <SectionTitle>Guard Details</SectionTitle>
            <InfoGrid>
              <InfoItem>
                <InfoLabel>Action</InfoLabel>
                <InfoValue>
                  {isRemoving ? 'Remove current guard' : 'Set new guard'}
                </InfoValue>
              </InfoItem>
              
              {!isRemoving && (
                <InfoItem>
                  <InfoLabel>Guard Address</InfoLabel>
                  <InfoValue>
                    <AddressDisplay
                      address={guardAddress}
                      network={network}
                      truncate={true}
                      truncateLength={6}
                      showCopy={true}
                      showExplorer={true}
                    />
                  </InfoValue>
                </InfoItem>
              )}

              <InfoItem>
                <InfoLabel>Safe Address</InfoLabel>
                <InfoValue>
                  <AddressDisplay
                    address={safeAddress}
                    network={network}
                    truncate={true}
                    truncateLength={6}
                    showCopy={true}
                    showExplorer={true}
                  />
                </InfoValue>
              </InfoItem>
            </InfoGrid>
          </Section>

          {/* Validation Results */}
          {!isRemoving && validationResult && (
            <Section>
              <ValidationStatus isValid={validationResult.isValid}>
                {validationResult.isValid ? '✅ Basic validation passed' : `❌ ${validationResult.error}`}
              </ValidationStatus>
            </Section>
          )}

          {/* Security Warnings */}
          <Section>
            <WarningBox>
              <WarningTitle>
                ⚠️ {isRemoving ? 'Removal Confirmation' : 'Security Warning'}
              </WarningTitle>
              <WarningList>
                {isRemoving ? (
                  <>
                    <WarningItem>Removing the guard will disable transaction validation</WarningItem>
                    <WarningItem>All future transactions will execute without guard checks</WarningItem>
                    <WarningItem>This action requires the same threshold as other Safe transactions</WarningItem>
                  </>
                ) : (
                  <>
                    <WarningItem>Guards have full power to block Safe transaction execution</WarningItem>
                    <WarningItem>A malicious or buggy guard can permanently lock your Safe</WarningItem>
                    <WarningItem>Always verify guard contract code before setting</WarningItem>
                    <WarningItem>Test guards on testnets first</WarningItem>
                    <WarningItem>Ensure you have recovery mechanisms in place</WarningItem>
                    {validationResult?.warnings?.map((warning, index) => (
                      <WarningItem key={index}>{warning}</WarningItem>
                    ))}
                  </>
                )}
              </WarningList>
            </WarningBox>
          </Section>

          {/* Confirmation Checkboxes */}
          <Section>
            <CheckboxContainer>
              <Checkbox
                type="checkbox"
                id="readWarnings"
                checked={hasReadWarnings}
                onChange={(e) => setHasReadWarnings(e.target.checked)}
              />
              <CheckboxLabel htmlFor="readWarnings">
                I have read and understand the {isRemoving ? 'implications of removing the guard' : 'security warnings above'}
              </CheckboxLabel>
            </CheckboxContainer>

            {!isRemoving && (
              <CheckboxContainer>
                <Checkbox
                  type="checkbox"
                  id="confirmRisks"
                  checked={hasConfirmedRisks}
                  onChange={(e) => setHasConfirmedRisks(e.target.checked)}
                />
                <CheckboxLabel htmlFor="confirmRisks">
                  I confirm that I have verified the guard contract code and understand the risks of setting this guard
                </CheckboxLabel>
              </CheckboxContainer>
            )}
          </Section>

          {/* Action Buttons */}
          <ButtonRow>
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              variant={isRemoving ? "danger" : "primary"}
              onClick={onConfirm}
              disabled={!canConfirm}
            >
              {isRemoving ? 'Remove Guard' : 'Set Guard'}
            </Button>
          </ButtonRow>
        </ModalContent>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default GuardConfirmationModal;
