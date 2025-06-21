import React, { useState } from 'react';
import styled from 'styled-components';
import AddressBookSelector from './AddressBookSelector';

const TestContainer = styled.div`
  padding: 40px;
  background: #1e293b;
  min-height: 100vh;
  color: white;
`;

const TestSection = styled.div`
  max-width: 600px;
  margin: 0 auto;
  background: #334155;
  padding: 32px;
  border-radius: 16px;
  border: 1px solid #475569;
`;

const Title = styled.h2`
  color: #4ECDC4;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 24px;
  text-align: center;
`;

const FormGroup = styled.div`
  margin-bottom: 24px;
`;

const Label = styled.label`
  display: block;
  color: #4ECDC4;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
`;

const SelectedValue = styled.div`
  margin-top: 16px;
  padding: 16px;
  background: rgba(78, 205, 196, 0.1);
  border: 1px solid rgba(78, 205, 196, 0.3);
  border-radius: 12px;
  font-family: monospace;
  font-size: 14px;
  word-break: break-all;
`;

const TestInstructions = styled.div`
  margin-bottom: 32px;
  padding: 20px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;

  h3 {
    color: #60a5fa;
    margin-bottom: 12px;
    font-size: 16px;
  }

  ul {
    margin: 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 8px;
  }
`;

const AddressBookSelectorTest: React.FC = () => {
  const [selectedAddress, setSelectedAddress] = useState('');

  return (
    <TestContainer>
      <TestSection>
        <Title>Address Book Selector Test</Title>
        
        <TestInstructions>
          <h3>Test Instructions:</h3>
          <ul>
            <li>Click the selector below to open the address book dropdown</li>
            <li>If you have address book entries, they should appear in the dropdown</li>
            <li>Try searching for entries by typing in the search box</li>
            <li>Test manual address input in the "Or enter address manually" section</li>
            <li>Try entering a valid Ethereum address (e.g., 0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b)</li>
            <li>The selected value will be displayed below</li>
          </ul>
        </TestInstructions>

        <FormGroup>
          <Label>Select Recipient Address</Label>
          <AddressBookSelector
            value={selectedAddress}
            onChange={setSelectedAddress}
            placeholder="Select from address book or enter address..."
            network="sepolia"
            safeAddress="0x1234567890123456789012345678901234567890" // Mock safe address for testing
          />
        </FormGroup>

        {selectedAddress && (
          <SelectedValue>
            <strong>Selected Address:</strong><br />
            {selectedAddress}
          </SelectedValue>
        )}
      </TestSection>
    </TestContainer>
  );
};

export default AddressBookSelectorTest;
