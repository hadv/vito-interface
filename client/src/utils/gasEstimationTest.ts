import { ethers } from 'ethers';
import { GasEstimationService } from '../services/GasEstimationService';

/**
 * Test script to verify gas estimation improvements
 * This helps debug and validate our gas estimation fixes
 */

// Test configuration
const SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_PROJECT_ID';
const TEST_SAFE_ADDRESS = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19'; // From the failed transaction
const TEST_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789'; // LINK token from failed tx
const TEST_RECIPIENT = '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe'; // Recipient from failed tx

export class GasEstimationTester {
  private provider: ethers.providers.JsonRpcProvider;
  private gasService: GasEstimationService;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
    this.gasService = new GasEstimationService(this.provider, 'sepolia');
  }

  /**
   * Test gas estimation for ERC-20 token transfer (like the failed transaction)
   */
  async testERC20Transfer(): Promise<void> {
    console.log('\n🧪 Testing ERC-20 Token Transfer Gas Estimation');
    console.log('='.repeat(60));

    try {
      // Create ERC-20 transfer data (transfer 6 LINK tokens)
      const erc20Interface = new ethers.utils.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ]);

      const transferAmount = ethers.utils.parseUnits('6', 18); // 6 LINK tokens
      const transferData = erc20Interface.encodeFunctionData('transfer', [
        TEST_RECIPIENT,
        transferAmount
      ]);

      console.log(`📋 Transfer Details:`);
      console.log(`   Token: ${TEST_TOKEN_ADDRESS} (LINK)`);
      console.log(`   To: ${TEST_RECIPIENT}`);
      console.log(`   Amount: 6 LINK`);
      console.log(`   Data: ${transferData}`);

      // Test gas estimation
      const gasResult = await this.gasService.estimateTransactionGas({
        to: TEST_TOKEN_ADDRESS,
        value: '0',
        data: transferData,
        from: TEST_SAFE_ADDRESS
      });

      console.log(`\n📊 Gas Estimation Results:`);
      console.log(`   Gas Limit: ${gasResult.gasLimit}`);
      console.log(`   Gas Price: ${ethers.utils.formatUnits(gasResult.gasPrice, 'gwei')} gwei`);
      console.log(`   Total Cost: ${gasResult.totalCost} ETH`);
      console.log(`   Confidence: ${gasResult.confidence}`);

      // Compare with the failed transaction
      const failedTxGasUsed = 222463;
      const difference = gasResult.gasLimit - failedTxGasUsed;
      const percentDiff = ((difference / failedTxGasUsed) * 100).toFixed(2);

      console.log(`\n🔍 Comparison with Failed Transaction:`);
      console.log(`   Failed TX Gas Used: ${failedTxGasUsed}`);
      console.log(`   Our Estimate: ${gasResult.gasLimit}`);
      console.log(`   Difference: ${difference} (${percentDiff}%)`);

      if (gasResult.gasLimit > failedTxGasUsed) {
        console.log(`   ✅ Our estimate is higher - should prevent out of gas`);
      } else {
        console.log(`   ⚠️ Our estimate is lower - may still cause out of gas`);
      }

    } catch (error) {
      console.error('❌ ERC-20 transfer test failed:', error);
    }
  }

  /**
   * Test gas estimation for Safe execTransaction
   */
  async testSafeExecution(): Promise<void> {
    console.log('\n🧪 Testing Safe execTransaction Gas Estimation');
    console.log('='.repeat(60));

    try {
      // Create the same transaction data as the failed transaction
      const erc20Interface = new ethers.utils.Interface([
        'function transfer(address to, uint256 amount) returns (bool)'
      ]);

      const transferAmount = ethers.utils.parseUnits('6', 18);
      const transferData = erc20Interface.encodeFunctionData('transfer', [
        TEST_RECIPIENT,
        transferAmount
      ]);

      // Mock signature (65 bytes)
      const mockSignature = '0x' + '00'.repeat(65);

      // Test Safe execTransaction gas estimation
      const gasResult = await this.gasService.estimateSafeExecutionGas(
        TEST_SAFE_ADDRESS,
        TEST_TOKEN_ADDRESS,
        '0',
        transferData,
        0, // operation
        '0', // safeTxGas
        '0', // baseGas
        '0', // gasPrice
        ethers.constants.AddressZero, // gasToken
        ethers.constants.AddressZero, // refundReceiver
        mockSignature
      );

      console.log(`📊 Safe Execution Gas Estimation:`);
      console.log(`   Gas Limit: ${gasResult.gasLimit}`);
      console.log(`   Gas Price: ${ethers.utils.formatUnits(gasResult.gasPrice, 'gwei')} gwei`);
      console.log(`   Total Cost: ${gasResult.totalCost} ETH`);
      console.log(`   Confidence: ${gasResult.confidence}`);

      // Compare with actual transaction
      const actualTxGasLimit = 228261;
      const actualTxGasUsed = 222463;

      console.log(`\n🔍 Comparison with Actual Transaction:`);
      console.log(`   Actual TX Gas Limit: ${actualTxGasLimit}`);
      console.log(`   Actual TX Gas Used: ${actualTxGasUsed}`);
      console.log(`   Our Estimate: ${gasResult.gasLimit}`);

      if (gasResult.gasLimit >= actualTxGasUsed && gasResult.gasLimit <= actualTxGasLimit * 1.2) {
        console.log(`   ✅ Our estimate is in a good range`);
      } else if (gasResult.gasLimit < actualTxGasUsed) {
        console.log(`   ⚠️ Our estimate is too low`);
      } else {
        console.log(`   ⚠️ Our estimate might be too high (but safe)`);
      }

    } catch (error) {
      console.error('❌ Safe execution test failed:', error);
    }
  }

  /**
   * Test different gas estimation methods
   */
  async testGasEstimationMethods(): Promise<void> {
    console.log('\n🧪 Testing Different Gas Estimation Methods');
    console.log('='.repeat(60));

    const testParams = {
      to: TEST_TOKEN_ADDRESS,
      value: '0',
      data: '0xa9059cbb' + 
            TEST_RECIPIENT.slice(2).padStart(64, '0') + 
            ethers.utils.parseUnits('6', 18).toHexString().slice(2).padStart(64, '0'),
      from: TEST_SAFE_ADDRESS
    };

    try {
      // Method 1: Direct estimation
      console.log('📋 Method 1: Direct Provider Estimation');
      try {
        const directGas = await this.provider.estimateGas(testParams);
        console.log(`   Result: ${directGas.toNumber()} gas`);
      } catch (error) {
        console.log(`   Failed: ${error}`);
      }

      // Method 2: Call simulation
      console.log('\n📋 Method 2: Call Simulation');
      try {
        await this.provider.call(testParams);
        console.log(`   Call successful - transaction should work`);
      } catch (error) {
        console.log(`   Call failed: ${error}`);
      }

      // Method 3: Our service estimation
      console.log('\n📋 Method 3: Our Gas Estimation Service');
      const serviceResult = await this.gasService.estimateTransactionGas(testParams);
      console.log(`   Result: ${serviceResult.gasLimit} gas (${serviceResult.confidence} confidence)`);

    } catch (error) {
      console.error('❌ Gas estimation methods test failed:', error);
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Gas Estimation Tests');
    console.log('='.repeat(60));
    console.log(`Network: Sepolia`);
    console.log(`Provider: ${SEPOLIA_RPC_URL}`);
    console.log(`Test Safe: ${TEST_SAFE_ADDRESS}`);

    await this.testERC20Transfer();
    await this.testSafeExecution();
    await this.testGasEstimationMethods();

    console.log('\n✅ All tests completed');
  }
}

// Export for use in other files
export const gasEstimationTester = new GasEstimationTester();

// Run tests if this file is executed directly
if (require.main === module) {
  gasEstimationTester.runAllTests().catch(console.error);
}
