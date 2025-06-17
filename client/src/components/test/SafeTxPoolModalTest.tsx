import React, { useState } from 'react';
import SafeTxPoolEIP712Modal from '../wallet/components/SafeTxPoolEIP712Modal';
import { ProposeTxData, SignTxData, SafeTxPoolDomain } from '../../utils/eip712';

const SafeTxPoolModalTest: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [operationType, setOperationType] = useState<'propose' | 'sign'>('propose');

  // Test data
  const testDomain: SafeTxPoolDomain = {
    name: 'SafeTxPool',
    version: '1.0.0',
    chainId: 1,
    verifyingContract: '0x1234567890123456789012345678901234567890'
  };

  const testProposeTxData: ProposeTxData = {
    safe: '0x1111111111111111111111111111111111111111',
    to: '0x2222222222222222222222222222222222222222',
    value: '1000000000000000000', // 1 ETH
    data: '0xa9059cbb0000000000000000000000002222222222222222222222222222222222222222000000000000000000000000000000000000000000000000de0b6b3a7640000',
    operation: 0,
    nonce: 42,
    proposer: '0x3333333333333333333333333333333333333333',
    deadline: Math.floor(Date.now() / 1000) + 3600
  };

  const testSignTxData: SignTxData = {
    txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    signer: '0x3333333333333333333333333333333333333333',
    deadline: Math.floor(Date.now() / 1000) + 3600
  };

  const handleSign = async () => {
    console.log('🔐 Test: Sign button clicked!', { operationType });
    alert(`Sign button clicked for ${operationType} operation!`);
    // Simulate signing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setShowModal(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>SafeTxPool EIP-712 Modal Test</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="radio"
            value="propose"
            checked={operationType === 'propose'}
            onChange={(e) => setOperationType(e.target.value as 'propose')}
          />
          Propose Transaction
        </label>
        <br />
        <label>
          <input
            type="radio"
            value="sign"
            checked={operationType === 'sign'}
            onChange={(e) => setOperationType(e.target.value as 'sign')}
          />
          Sign Transaction
        </label>
      </div>

      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '12px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        Test {operationType === 'propose' ? 'Propose' : 'Sign'} Modal
      </button>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p><strong>Test Data:</strong></p>
        <p>Safe: {testProposeTxData.safe}</p>
        <p>To: {testProposeTxData.to}</p>
        <p>Value: {testProposeTxData.value} wei (1 ETH)</p>
        <p>Operation: {testProposeTxData.operation === 0 ? 'Call' : 'DelegateCall'}</p>
        <p>Nonce: {testProposeTxData.nonce}</p>
        <p>Chain ID: {testDomain.chainId}</p>
      </div>

      <SafeTxPoolEIP712Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSign={handleSign}
        operationType={operationType}
        data={operationType === 'propose' ? testProposeTxData : testSignTxData}
        domain={testDomain}
      />
    </div>
  );
};

export default SafeTxPoolModalTest;
