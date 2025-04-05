import React from 'react';
import styled from 'styled-components';

interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onCancel: () => void;
  isVisible: boolean;
}

const InputContainer = styled.div<{ isVisible: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #252526;
  padding: 0.5rem;
  display: ${props => (props.isVisible ? 'flex' : 'none')};
  align-items: center;
  border-top: 1px solid #333;
  z-index: 1000;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.2);
  height: 2.5rem;
  box-sizing: border-box;
`;

const Prefix = styled.span`
  color: #d4d4d4;
  font-weight: bold;
  margin-right: 0.5rem;
`;

const Input = styled.input`
  flex: 1;
  background-color: transparent;
  border: none;
  color: #d4d4d4;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  outline: none;
  
  &:focus {
    outline: none;
  }
`;

const CommandInput: React.FC<CommandInputProps> = ({
  value,
  onChange,
  onExecute,
  onCancel,
  isVisible,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onExecute();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <InputContainer isVisible={isVisible} className="command-input">
      <Prefix>:</Prefix>
      <Input
        type="text"
        value={value.startsWith(':') ? value.slice(1) : value}
        onChange={e => onChange(`:${e.target.value}`)}
        onKeyDown={handleKeyDown}
        autoFocus={isVisible}
      />
    </InputContainer>
  );
};

export default CommandInput; 