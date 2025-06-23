import styled from 'styled-components';
import { Input } from '../../ui';

// Shared styled components matching TransactionModal design
export const ModalDescription = styled.p`
  margin: 0 0 24px 0;
  font-size: 16px;
  color: #94a3b8;
  line-height: 1.5;
`;

export const FormGroup = styled.div`
  margin-bottom: 32px;
`;

export const Label = styled.label`
  display: block;
  color: #4ECDC4;
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
`;

export const StyledInput = styled(Input)`
  background: #334155;
  border: 1px solid #475569;
  border-radius: 8px;
  color: #fff;
  font-size: 16px;
  padding: 12px 16px;
  width: 100%;
  
  &:focus {
    border-color: #4ECDC4;
    box-shadow: 0 0 0 3px rgba(78, 205, 196, 0.1);
    outline: none;
  }
  
  &::placeholder {
    color: #64748b;
  }
  
  &:disabled {
    background: #1e293b;
    color: #64748b;
    cursor: not-allowed;
  }
`;

export const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
`;

export const InputLabel = styled.span`
  font-size: 14px;
  color: #94a3b8;
  white-space: nowrap;
`;

export const TransactionDetails = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin: 24px 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
`;

export const DetailRow = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    gap: 8px;
    text-align: left;
  }
`;

export const DetailLabel = styled.span`
  color: #4ECDC4;
  font-size: 14px;
  font-weight: 600;
  text-shadow: 0 0 8px rgba(78, 205, 196, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const DetailValue = styled.div`
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  word-break: break-word;
  line-height: 1.5;
`;

export const ErrorMessage = styled.div`
  color: #FF6B6B;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
`;

export const WarningMessage = styled.div`
  color: #F59E0B;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
`;

export const InfoMessage = styled.div`
  color: #4ECDC4;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding: 16px;
  background: rgba(78, 205, 196, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 12px;
  text-shadow: 0 0 10px rgba(78, 205, 196, 0.3);
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 20px;
  justify-content: flex-end;
  margin-top: 40px;
  flex-wrap: wrap;
`;

export const SignerToRemove = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 12px;
  margin-bottom: 24px;
`;

export const RemoveIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #FF6B6B;
  color: white;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  flex-shrink: 0;
`;

export const CurrentThreshold = styled.div`
  padding: 20px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 12px;
  margin-bottom: 24px;
`;

export const CurrentLabel = styled.div`
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const CurrentValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
`;

export const ThresholdBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
`;

export const NonceInfo = styled.div`
  display: grid;
  gap: 16px;
  margin-bottom: 24px;
`;

export const NonceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #334155;
  border: 1px solid #475569;
  border-radius: 12px;
`;

export const NonceLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
`;

export const NonceValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
`;

export const RecommendedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(78, 205, 196, 0.2);
  color: #4ECDC4;
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
`;
