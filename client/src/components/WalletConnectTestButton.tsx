import React from 'react';

/**
 * Test button component to trigger WalletConnect patching tests
 */
export const WalletConnectTestButton: React.FC = () => {
  const runTest = async () => {
    console.log('🧪 Running WalletConnect Patching Test...');
    
    // Call the test function that was attached to window
    if ((window as any).testWalletConnectPatching) {
      await (window as any).testWalletConnectPatching();
    } else {
      console.error('❌ Test function not available. Make sure WalletConnectPatchingTest is loaded.');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      zIndex: 9999,
      background: '#f0f0f0',
      padding: '10px',
      border: '1px solid #ccc',
      borderRadius: '5px'
    }}>
      <button 
        onClick={runTest}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🧪 Test WalletConnect Patching
      </button>
      <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
        Check console for results
      </div>
    </div>
  );
};
