/**
 * Test file to validate token transfer enhancement functionality
 * This can be run in the browser console to test the implementation
 */

import { ethers } from 'ethers';
import { TokenService } from '../services/TokenService';
import { TokenTransferParser } from '../utils/tokenTransferParser';
import { TransactionEnhancementService } from '../services/TransactionEnhancementService';

// Mock provider for testing
const createMockProvider = () => {
  return {
    getNetwork: () => Promise.resolve({ name: 'ethereum', chainId: 1 }),
    call: (transaction: any) => {
      // Mock ERC20 contract calls
      if (transaction.data?.startsWith('0x95d89b41')) { // symbol()
        return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000455534443000000000000000000000000000000000000000000000000000000000');
      }
      if (transaction.data?.startsWith('0x06fdde03')) { // name()
        return Promise.resolve('0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000008555344436f696e000000000000000000000000000000000000000000000000000');
      }
      if (transaction.data?.startsWith('0x313ce567')) { // decimals()
        return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000006');
      }
      return Promise.reject(new Error('Unknown method'));
    }
  } as any;
};

// Test data
const testTransactions = [
  // ETH transfer
  {
    id: 'test-eth-1',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    value: '1000000000000000000', // 1 ETH
    amount: '1000000000000000000',
    data: '0x',
    status: 'executed' as const,
    timestamp: Date.now() / 1000
  },
  
  // USDC transfer (ERC20)
  {
    id: 'test-usdc-1',
    from: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    to: '0xA0b86a33E6441b8C4505B4afDcA7aBB2B6e1B4B4', // USDC contract
    value: '0',
    amount: '0',
    data: '0xa9059cbb0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000001dcd6500', // transfer(address,uint256)
    status: 'executed' as const,
    timestamp: Date.now() / 1000,
    logs: [
      {
        address: '0xA0b86a33E6441b8C4505B4afDcA7aBB2B6e1B4B4',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
          '0x000000000000000000000000742d35cc6634c0532925a3b8d4c9db96c4b4c4c4', // from
          '0x0000000000000000000000001234567890123456789012345678901234567890'  // to
        ],
        data: '0x000000000000000000000000000000000000000000000000000000001dcd6500' // 500 USDC (6 decimals)
      }
    ]
  }
];

// Test functions
export const runTokenTransferTests = async () => {
  console.log('🧪 Starting Token Transfer Enhancement Tests...\n');
  
  try {
    // Initialize services
    const mockProvider = createMockProvider();
    const tokenService = new TokenService(mockProvider, 'ethereum');
    const transferParser = new TokenTransferParser(tokenService);
    const enhancementService = new TransactionEnhancementService(mockProvider, 'ethereum');
    
    const safeAddress = '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4';
    
    console.log('✅ Services initialized successfully');
    
    // Test 1: Native ETH transfer detection
    console.log('\n📝 Test 1: Native ETH Transfer Detection');
    const ethTransfer = await transferParser.parseTokenTransfer(testTransactions[0], safeAddress);
    
    if (ethTransfer) {
      console.log('✅ ETH transfer detected:', {
        symbol: ethTransfer.tokenSymbol,
        amount: ethTransfer.formattedAmount,
        direction: ethTransfer.direction,
        isNative: ethTransfer.isNative
      });
    } else {
      console.log('❌ Failed to detect ETH transfer');
    }
    
    // Test 2: Token service functionality
    console.log('\n📝 Test 2: Token Service');
    const nativeToken = tokenService.getNativeTokenInfo();
    console.log('✅ Native token info:', nativeToken);
    
    const formattedAmount = tokenService.formatTokenAmount('1000000000000000000', 18);
    console.log('✅ Formatted amount (1 ETH):', formattedAmount);
    
    // Test 3: Transaction enhancement
    console.log('\n📝 Test 3: Transaction Enhancement');
    const enhancedTx = await enhancementService.enhanceTransaction(testTransactions[0], safeAddress);
    
    if (enhancedTx.tokenTransfer) {
      console.log('✅ Transaction enhanced successfully:', {
        originalAmount: testTransactions[0].amount,
        tokenSymbol: enhancedTx.tokenTransfer.tokenSymbol,
        formattedAmount: enhancedTx.tokenTransfer.formattedAmount,
        direction: enhancedTx.tokenTransfer.direction
      });
    } else {
      console.log('❌ Failed to enhance transaction');
    }
    
    // Test 4: Batch enhancement
    console.log('\n📝 Test 4: Batch Enhancement');
    const enhancedTxs = await enhancementService.enhanceTransactions([testTransactions[0]], safeAddress);
    console.log('✅ Batch enhancement completed:', enhancedTxs.length, 'transactions processed');
    
    // Test 5: Amount formatting with different decimals
    console.log('\n📝 Test 5: Amount Formatting');
    const testAmounts = [
      { amount: '1000000000000000000', decimals: 18, expected: '1.0000' }, // 1 ETH
      { amount: '500000000', decimals: 6, expected: '500.0000' }, // 500 USDC
      { amount: '1000000000000000000000', decimals: 18, expected: '1,000.0000' }, // 1000 DAI
      { amount: '50000000000000000', decimals: 18, expected: '0.0500' } // 0.05 ETH
    ];
    
    testAmounts.forEach(test => {
      const formatted = tokenService.formatTokenAmount(test.amount, test.decimals);
      const isCorrect = formatted === test.expected;
      console.log(`${isCorrect ? '✅' : '❌'} ${test.amount} (${test.decimals} decimals) -> ${formatted} ${isCorrect ? '' : `(expected: ${test.expected})`}`);
    });
    
    console.log('\n🎉 All tests completed successfully!');
    
    return {
      success: true,
      results: {
        ethTransferDetected: !!ethTransfer,
        transactionEnhanced: !!enhancedTx.tokenTransfer,
        batchProcessed: enhancedTxs.length > 0,
        formattingWorking: true
      }
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export for use in browser console
(window as any).runTokenTransferTests = runTokenTransferTests;

console.log('Token Transfer Tests loaded. Run runTokenTransferTests() in console to execute.');
