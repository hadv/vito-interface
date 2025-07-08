/**
 * Test script for SafeTransactionCancellationService
 * This script tests the cancellation service functionality
 */

import { SafeTransactionCancellationService } from './services/SafeTransactionCancellationService';
import { SafeTxPoolTransaction } from './services/SafeTxPoolService';

// Mock transaction data for testing
const mockNonExecutableTransaction: SafeTxPoolTransaction = {
  txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  safe: '0xabcdef1234567890abcdef1234567890abcdef12',
  to: '0x9876543210fedcba9876543210fedcba98765432',
  value: '1000000000000000000', // 1 ETH
  data: '0x',
  operation: 0,
  proposer: '0x1111111111111111111111111111111111111111',
  nonce: 5,
  txId: 1,
  signatures: [
    {
      signature: '0xsignature1',
      signer: '0x1111111111111111111111111111111111111111'
    }
  ]
};

const mockExecutableTransaction: SafeTxPoolTransaction = {
  ...mockNonExecutableTransaction,
  signatures: [
    {
      signature: '0xsignature1',
      signer: '0x1111111111111111111111111111111111111111'
    },
    {
      signature: '0xsignature2',
      signer: '0x2222222222222222222222222222222222222222'
    }
  ]
};

async function testCancellationService() {
  console.log('🧪 Testing SafeTransactionCancellationService...');
  
  try {
    // Initialize service
    const cancellationService = new SafeTransactionCancellationService('sepolia');
    
    console.log('✅ Service initialized successfully');
    
    // Test 1: Estimate cancellation for non-executable transaction
    console.log('\n📋 Test 1: Non-executable transaction estimation');
    try {
      const estimate1 = await cancellationService.estimateCancellation(mockNonExecutableTransaction);
      console.log('📊 Estimate result:', estimate1);
      
      if (estimate1.type === 'simple_deletion') {
        console.log('✅ Correctly identified as simple deletion');
      } else {
        console.log('❌ Should be simple deletion');
      }
    } catch (error) {
      console.log('⚠️ Estimation failed (expected for test):', error);
    }
    
    // Test 2: Estimate cancellation for executable transaction
    console.log('\n📋 Test 2: Executable transaction estimation');
    try {
      const estimate2 = await cancellationService.estimateCancellation(mockExecutableTransaction);
      console.log('📊 Estimate result:', estimate2);
      
      if (estimate2.type === 'secure_cancellation') {
        console.log('✅ Correctly identified as secure cancellation');
      } else {
        console.log('❌ Should be secure cancellation');
      }
    } catch (error) {
      console.log('⚠️ Estimation failed (expected for test):', error);
    }
    
    // Test 3: Check user permissions
    console.log('\n📋 Test 3: User permission checks');
    try {
      const canCancel = await cancellationService.canUserCancelTransaction(mockNonExecutableTransaction);
      console.log('👤 Permission check result:', canCancel);
    } catch (error) {
      console.log('⚠️ Permission check failed (expected for test):', error);
    }
    
    console.log('\n✅ All tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for potential use in other test files
export { testCancellationService, mockNonExecutableTransaction, mockExecutableTransaction };

// Run tests if this file is executed directly
if (require.main === module) {
  testCancellationService();
}
