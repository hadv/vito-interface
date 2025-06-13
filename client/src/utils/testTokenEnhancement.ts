/**
 * Simple test function to verify token transfer enhancement
 * Can be called from browser console to test the implementation
 */

import { ethers } from 'ethers';
import { TokenService } from '../services/TokenService';
import { TokenTransferParser } from './tokenTransferParser';

// Test function that can be called from browser console
export const testTokenEnhancement = async () => {
  console.log('🧪 Testing Token Transfer Enhancement...');
  
  try {
    // Create a simple provider (using public RPC)
    const provider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const tokenService = new TokenService(provider, 'ethereum');
    const parser = new TokenTransferParser(tokenService);
    
    // Test 1: Native ETH transfer
    console.log('\n📝 Test 1: Native ETH Transfer');
    const ethTx = {
      id: 'test-eth',
      from: '0x1234567890123456789012345678901234567890',
      to: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
      value: '1000000000000000000', // 1 ETH
      data: '0x',
      logs: []
    };
    
    const ethResult = await parser.parseTokenTransfer(ethTx, '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4');
    console.log('ETH Transfer Result:', ethResult);
    
    // Test 2: Token service formatting
    console.log('\n📝 Test 2: Token Amount Formatting');
    const formatted1 = tokenService.formatTokenAmount('1000000000000000000', 18); // 1 ETH
    const formatted2 = tokenService.formatTokenAmount('500000000', 6); // 500 USDC
    console.log('1 ETH formatted:', formatted1);
    console.log('500 USDC formatted:', formatted2);
    
    // Test 3: Native token info
    console.log('\n📝 Test 3: Native Token Info');
    const nativeToken = tokenService.getNativeTokenInfo();
    console.log('Native token:', nativeToken);
    
    console.log('\n✅ Token enhancement test completed!');
    return {
      success: true,
      ethTransfer: ethResult,
      formatting: { eth: formatted1, usdc: formatted2 },
      nativeToken
    };
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

// Make it available globally for browser console testing
(window as any).testTokenEnhancement = testTokenEnhancement;
