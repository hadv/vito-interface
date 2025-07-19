#!/usr/bin/env node

/**
 * Test script to validate gas estimation improvements
 * Run with: node client/src/scripts/testGasEstimation.js
 */

const { ethers } = require('ethers');

// Configuration
const SEPOLIA_RPC_URL = process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://rpc.sepolia.org';
const TEST_SAFE_ADDRESS = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
const TEST_TOKEN_ADDRESS = '0x779877A7B0D9E8603169DdbD7836e478b4624789'; // LINK token
const TEST_RECIPIENT = '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe';

async function testGasEstimation() {
  console.log('🚀 Testing Gas Estimation Improvements');
  console.log('='.repeat(60));
  
  try {
    // Initialize provider
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
    console.log('✅ Connected to Sepolia testnet');

    // Test 1: ERC-20 Transfer Gas Estimation
    console.log('\n📋 Test 1: ERC-20 Transfer Gas Estimation');
    console.log('-'.repeat(40));

    const erc20Interface = new ethers.utils.Interface([
      'function transfer(address to, uint256 amount) returns (bool)'
    ]);

    const transferAmount = ethers.utils.parseUnits('6', 18); // 6 LINK tokens
    const transferData = erc20Interface.encodeFunctionData('transfer', [
      TEST_RECIPIENT,
      transferAmount
    ]);

    console.log(`Token: ${TEST_TOKEN_ADDRESS}`);
    console.log(`To: ${TEST_RECIPIENT}`);
    console.log(`Amount: 6 LINK`);

    try {
      const gasEstimate = await provider.estimateGas({
        to: TEST_TOKEN_ADDRESS,
        value: '0',
        data: transferData,
        from: TEST_SAFE_ADDRESS
      });

      console.log(`✅ Gas estimate: ${gasEstimate.toNumber()}`);
      
      // Compare with failed transaction
      const failedTxGasUsed = 222463;
      const difference = gasEstimate.toNumber() - failedTxGasUsed;
      const percentDiff = ((difference / failedTxGasUsed) * 100).toFixed(2);
      
      console.log(`Failed TX used: ${failedTxGasUsed} gas`);
      console.log(`Our estimate: ${gasEstimate.toNumber()} gas`);
      console.log(`Difference: ${difference} gas (${percentDiff}%)`);
      
      if (gasEstimate.toNumber() > failedTxGasUsed) {
        console.log('✅ Our estimate should prevent out of gas errors');
      } else {
        console.log('⚠️ Our estimate might still cause out of gas errors');
      }
      
    } catch (error) {
      console.log(`❌ Gas estimation failed: ${error.message}`);
    }

    // Test 2: Safe execTransaction Gas Estimation
    console.log('\n📋 Test 2: Safe execTransaction Gas Estimation');
    console.log('-'.repeat(40));

    const safeInterface = new ethers.utils.Interface([
      'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool success)'
    ]);

    // Mock signature (65 bytes)
    const mockSignature = '0x' + '00'.repeat(65);

    const execData = safeInterface.encodeFunctionData('execTransaction', [
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
    ]);

    try {
      const safeGasEstimate = await provider.estimateGas({
        to: TEST_SAFE_ADDRESS,
        value: '0',
        data: execData
      });

      console.log(`✅ Safe execution gas estimate: ${safeGasEstimate.toNumber()}`);
      
      // Compare with actual transaction
      const actualTxGasLimit = 228261;
      const actualTxGasUsed = 222463;
      
      console.log(`Actual TX gas limit: ${actualTxGasLimit}`);
      console.log(`Actual TX gas used: ${actualTxGasUsed}`);
      console.log(`Our estimate: ${safeGasEstimate.toNumber()}`);
      
      if (safeGasEstimate.toNumber() >= actualTxGasUsed && safeGasEstimate.toNumber() <= actualTxGasLimit * 1.2) {
        console.log('✅ Our estimate is in a good range');
      } else if (safeGasEstimate.toNumber() < actualTxGasUsed) {
        console.log('⚠️ Our estimate is too low');
      } else {
        console.log('⚠️ Our estimate might be too high (but safe)');
      }
      
    } catch (error) {
      console.log(`❌ Safe gas estimation failed: ${error.message}`);
    }

    // Test 3: Gas Price Analysis
    console.log('\n📋 Test 3: Gas Price Analysis');
    console.log('-'.repeat(40));

    try {
      const feeData = await provider.getFeeData();
      
      console.log('Current gas pricing:');
      if (feeData.gasPrice) {
        console.log(`  Gas Price: ${ethers.utils.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
      }
      if (feeData.maxFeePerGas) {
        console.log(`  Max Fee Per Gas: ${ethers.utils.formatUnits(feeData.maxFeePerGas, 'gwei')} gwei`);
      }
      if (feeData.maxPriorityFeePerGas) {
        console.log(`  Max Priority Fee: ${ethers.utils.formatUnits(feeData.maxPriorityFeePerGas, 'gwei')} gwei`);
      }

      // Calculate transaction cost
      const gasLimit = 250000; // Conservative estimate
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas;
      if (gasPrice) {
        const txCost = ethers.BigNumber.from(gasLimit).mul(gasPrice);
        console.log(`  Estimated TX cost: ${ethers.utils.formatEther(txCost)} ETH`);
      }
      
    } catch (error) {
      console.log(`❌ Gas price analysis failed: ${error.message}`);
    }

    // Test 4: Network Status
    console.log('\n📋 Test 4: Network Status');
    console.log('-'.repeat(40));

    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      
      console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
      console.log(`Current block: ${blockNumber}`);
      console.log(`Block gas limit: ${block.gasLimit.toNumber()}`);
      console.log(`Block gas used: ${block.gasUsed.toNumber()} (${((block.gasUsed.toNumber() / block.gasLimit.toNumber()) * 100).toFixed(2)}%)`);
      
    } catch (error) {
      console.log(`❌ Network status check failed: ${error.message}`);
    }

    console.log('\n✅ Gas estimation tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGasEstimation().catch(console.error);
}

module.exports = { testGasEstimation };
