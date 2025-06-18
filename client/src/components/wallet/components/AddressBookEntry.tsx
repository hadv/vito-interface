import React, { useState } from 'react';
import styled from 'styled-components';
import { theme } from '../../../theme';
import { AddressBookEntry as AddressBookEntryType } from '../../../services/AddressBookService';
import Button from '../../ui/Button';
import AddressDisplay from './AddressDisplay';

const EntryContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing[4]};
  border: 1px solid ${theme.colors.border.primary};
  border-radius: ${theme.borderRadius.md};
  background: ${theme.colors.background.secondary};
  margin-bottom: ${theme.spacing[2]};
  transition: all 0.2s ease;

  &:hover {
    border-color: ${theme.colors.border.secondary};
    background: ${theme.colors.background.tertiary};
  }
`;

const EntryInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
`;

const EntryName = styled.div`
  font-size: ${theme.typography.fontSize.base};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
  margin-bottom: ${theme.spacing[1]};
  word-break: break-word;
`;

const EntryAddress = styled.div`
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
`;

const EntryActions = styled.div`
  display: flex;
  gap: ${theme.spacing[2]};
  margin-left: ${theme.spacing[4]};
`;

const ConfirmDialog = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ConfirmContent = styled.div`
  background: ${theme.colors.background.primary};
  border-radius: ${theme.borderRadius.lg};
  padding: ${theme.spacing[6]};
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 ${theme.spacing[4]} 0;
  font-size: ${theme.typography.fontSize.lg};
  font-weight: ${theme.typography.fontWeight.semibold};
  color: ${theme.colors.text.primary};
`;

const ConfirmMessage = styled.p`
  margin: 0 0 ${theme.spacing[6]} 0;
  font-size: ${theme.typography.fontSize.sm};
  color: ${theme.colors.text.secondary};
  line-height: 1.5;
`;

const ConfirmActions = styled.div`
  display: flex;
  gap: ${theme.spacing[3]};
  justify-content: flex-end;
`;

interface AddressBookEntryProps {
  entry: AddressBookEntryType;
  onEdit?: (entry: AddressBookEntryType) => void;
  onRemove?: (walletAddress: string) => void;
  showActions?: boolean;
  isRemoving?: boolean;
}

const AddressBookEntryComponent: React.FC<AddressBookEntryProps> = ({
  entry,
  onEdit,
  onRemove,
  showActions = true,
  isRemoving = false
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entry);
    }
  };

  const handleRemove = () => {
    setShowConfirmDelete(true);
  };

  const confirmRemove = () => {
    if (onRemove) {
      onRemove(entry.walletAddress);
    }
    setShowConfirmDelete(false);
  };

  const cancelRemove = () => {
    setShowConfirmDelete(false);
  };

  return (
    <>
      <EntryContainer>
        <EntryInfo>
          <EntryName>{entry.name}</EntryName>
          <EntryAddress>
            <AddressDisplay 
              address={entry.walletAddress} 
              showCopy={true}
              showQR={false}
            />
          </EntryAddress>
        </EntryInfo>

        {showActions && (
          <EntryActions>
            {onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleEdit}
                disabled={isRemoving}
              >
                Edit
              </Button>
            )}
            {onRemove && (
              <Button
                variant="danger"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving}
                loading={isRemoving}
              >
                Remove
              </Button>
            )}
          </EntryActions>
        )}
      </EntryContainer>

      {showConfirmDelete && (
        <ConfirmDialog onClick={cancelRemove}>
          <ConfirmContent onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>Remove Address Book Entry</ConfirmTitle>
            <ConfirmMessage>
              Are you sure you want to remove "{entry.name}" from your address book?
              This action cannot be undone.
            </ConfirmMessage>
            <ConfirmActions>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelRemove}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmRemove}
              >
                Remove
              </Button>
            </ConfirmActions>
          </ConfirmContent>
        </ConfirmDialog>
      )}
    </>
  );
};

export default AddressBookEntryComponent;
