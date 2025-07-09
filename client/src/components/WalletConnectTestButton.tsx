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
      bottom: '20px',
      left: '20px',
      zIndex: 9999,
      background: '#1f2937',
      padding: '12px',
      border: '1px solid #374151',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <button
        onClick={runTest}
        style={{
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        🧪 Test WalletConnect
      </button>
      <div style={{ fontSize: '11px', marginTop: '6px', color: '#9ca3af' }}>
        Check console for results
      </div>
    </div>
  );
};
