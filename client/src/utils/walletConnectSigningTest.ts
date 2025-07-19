/**
 * WalletConnect Signing Test Utilities
 * Helps test and validate the WalletConnect signing flow for Safe guard transactions
 */

import { ethers } from 'ethers';
import { SafeTransactionData, SafeDomain } from './eip712';
import { diagnoseWalletConnectSession, logWalletConnectDiagnostics } from './walletConnectDebug';

export interface SigningTestResult {
  success: boolean;
  error?: string;
  signature?: string;
  duration?: number;
  diagnostics?: any;
}

/**
 * Test WalletConnect signing with a sample Safe guard transaction
 */
export async function testWalletConnectGuardSigning(
  walletConnectSigner: any,
  safeAddress: string,
  guardAddress: string,
  chainId: number
): Promise<SigningTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🧪 Starting WalletConnect Guard Signing Test');
    console.log('📋 Safe Address:', safeAddress);
    console.log('📋 Guard Address:', guardAddress);
    console.log('📋 Chain ID:', chainId);

    // Step 1: Diagnose WalletConnect session
    const walletConnectService = walletConnectSigner.walletConnectService;
    const diagnostics = diagnoseWalletConnectSession(walletConnectService, chainId);
    logWalletConnectDiagnostics(diagnostics, 'Signing Test');

    if (diagnostics.errors.length > 0) {
      return {
        success: false,
        error: `Session diagnostics failed: ${diagnostics.errors.join('; ')}`,
        diagnostics
      };
    }

    // Step 2: Create test Safe transaction data for setGuard
    const safeInterface = new ethers.utils.Interface([
      'function setGuard(address guard)'
    ]);
    
    const data = safeInterface.encodeFunctionData('setGuard', [guardAddress]);
    
    const safeTransactionData: SafeTransactionData = {
      to: safeAddress,
      value: '0',
      data,
      operation: 0,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: 1 // Test nonce
    };

    // Step 3: Create EIP-712 domain
    const domain: SafeDomain = {
      chainId,
      verifyingContract: safeAddress
    };

    // Step 4: Create typed data structure
    const types = {
      SafeTx: [
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'data', type: 'bytes' },
        { name: 'operation', type: 'uint8' },
        { name: 'safeTxGas', type: 'uint256' },
        { name: 'baseGas', type: 'uint256' },
        { name: 'gasPrice', type: 'uint256' },
        { name: 'gasToken', type: 'address' },
        { name: 'refundReceiver', type: 'address' },
        { name: 'nonce', type: 'uint256' }
      ]
    };

    console.log('🔐 Attempting to sign test Safe guard transaction...');
    console.log('📱 Check your mobile wallet for the signing request');

    // Step 5: Attempt signing
    const signature = await walletConnectSigner._signTypedData(
      domain,
      types,
      safeTransactionData
    );

    const duration = Date.now() - startTime;

    console.log('✅ WalletConnect Guard Signing Test PASSED');
    console.log('📋 Signature:', signature);
    console.log('⏱️ Duration:', `${duration}ms`);

    return {
      success: true,
      signature,
      duration,
      diagnostics
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('❌ WalletConnect Guard Signing Test FAILED');
    console.error('📋 Error:', error);
    console.error('⏱️ Duration:', `${duration}ms`);

    return {
      success: false,
      error: error?.message || 'Unknown signing error',
      duration,
      diagnostics: diagnoseWalletConnectSession(walletConnectSigner.walletConnectService, chainId)
    };
  }
}

/**
 * Test basic WalletConnect message signing (simpler test)
 */
export async function testWalletConnectMessageSigning(
  walletConnectSigner: any
): Promise<SigningTestResult> {
  const startTime = Date.now();
  
  try {
    console.log('🧪 Starting WalletConnect Message Signing Test');

    const testMessage = 'WalletConnect signing test message';
    console.log('📋 Test message:', testMessage);
    console.log('📱 Check your mobile wallet for the signing request');

    const signature = await walletConnectSigner.signMessage(testMessage);
    const duration = Date.now() - startTime;

    console.log('✅ WalletConnect Message Signing Test PASSED');
    console.log('📋 Signature:', signature);
    console.log('⏱️ Duration:', `${duration}ms`);

    return {
      success: true,
      signature,
      duration
    };

  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('❌ WalletConnect Message Signing Test FAILED');
    console.error('📋 Error:', error);
    console.error('⏱️ Duration:', `${duration}ms`);

    return {
      success: false,
      error: error?.message || 'Unknown signing error',
      duration
    };
  }
}

/**
 * Run comprehensive WalletConnect signing tests
 */
export async function runWalletConnectSigningTests(
  walletConnectSigner: any,
  safeAddress: string,
  guardAddress: string,
  chainId: number
): Promise<{
  messageTest: SigningTestResult;
  guardTest: SigningTestResult;
  overall: boolean;
}> {
  console.group('🧪 WalletConnect Signing Test Suite');
  
  // Test 1: Basic message signing
  console.log('📝 Test 1: Basic message signing...');
  const messageTest = await testWalletConnectMessageSigning(walletConnectSigner);
  
  // Test 2: Safe guard transaction signing
  console.log('🛡️ Test 2: Safe guard transaction signing...');
  const guardTest = await testWalletConnectGuardSigning(
    walletConnectSigner,
    safeAddress,
    guardAddress,
    chainId
  );
  
  const overall = messageTest.success && guardTest.success;
  
  console.log('📊 Test Results Summary:');
  console.log('  Message Signing:', messageTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('  Guard Transaction:', guardTest.success ? '✅ PASS' : '❌ FAIL');
  console.log('  Overall:', overall ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
  
  if (!overall) {
    console.log('🔧 Troubleshooting Tips:');
    if (!messageTest.success) {
      console.log('  - Basic message signing failed - check WalletConnect connection');
    }
    if (!guardTest.success) {
      console.log('  - EIP-712 signing failed - check typed data format and mobile wallet compatibility');
    }
  }
  
  console.groupEnd();
  
  return {
    messageTest,
    guardTest,
    overall
  };
}
