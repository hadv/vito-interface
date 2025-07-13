#!/usr/bin/env node

// Debug script to verify SafeTxPool configuration and address book
// Run with: node debug-safetxpool.js

const { ethers } = require('ethers');

// SafeTxPool ABI (minimal for debugging)
const SAFE_TX_POOL_ABI = [
  "function getAddressBookEntries(address safe) external view returns (tuple(bytes32 name, address walletAddress)[] memory)",
  "function checkTransaction(address to, uint256, bytes memory, uint8 operation, uint256, uint256, uint256, address, address payable, bytes memory, address) external override"
];

async function debugSafeTxPool() {
  console.log('🔍 SafeTxPool Configuration Debug');
  console.log('================================');
  
  // Configuration - using the known correct address
  const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
  const SAFE_TX_POOL_ADDRESS = '0xA96f4195deEE07f3B47106d0C237c71cB7C774De';
  const SAFE_ADDRESS = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  const TARGET_ADDRESS = '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe';

  console.log('\n🌐 Network Configuration:');
  console.log('RPC URL:', SEPOLIA_RPC);
  console.log('SafeTxPool Address:', SAFE_TX_POOL_ADDRESS);
  console.log('Safe Address:', SAFE_ADDRESS);
  console.log('Target Address:', TARGET_ADDRESS);

  try {
    // Connect to Sepolia
    console.log('\n🔗 Connecting to Sepolia...');
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    
    // Test connection
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, 'Chain ID:', network.chainId);
    
    // Create contract instance
    const safeTxPool = new ethers.Contract(SAFE_TX_POOL_ADDRESS, SAFE_TX_POOL_ABI, provider);
    
    // Test contract connection
    console.log('\n📋 Testing SafeTxPool contract...');
    try {
      const code = await provider.getCode(SAFE_TX_POOL_ADDRESS);
      if (code === '0x') {
        console.log('❌ No contract found at SafeTxPool address!');
        console.log('💡 Please verify the contract address is correct and deployed');
        return;
      }
      console.log('✅ Contract found at SafeTxPool address');
    } catch (error) {
      console.log('❌ Error checking contract:', error.message);
      return;
    }
    
    // Get address book entries
    console.log('\n📚 Fetching address book entries...');
    const entries = await safeTxPool.getAddressBookEntries(SAFE_ADDRESS);
    
    console.log(`Found ${entries.length} entries in address book:`);
    
    let targetFound = false;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const name = ethers.utils.parseBytes32String(entry.name);
      const address = entry.walletAddress;
      
      console.log(`  ${i + 1}. "${name}" -> ${address}`);
      
      if (address.toLowerCase() === TARGET_ADDRESS.toLowerCase()) {
        targetFound = true;
        console.log(`    ✅ TARGET ADDRESS FOUND!`);
      }
    }
    
    console.log('\n🎯 Analysis:');
    if (targetFound) {
      console.log('✅ Target address IS in the address book');
      console.log('❓ If you\'re still getting GS026 errors, the issue is likely:');
      console.log('   - Signature format/recovery problems');
      console.log('   - Transaction hash mismatch');
      console.log('   - Safe contract configuration issues');
      console.log('   - Wrong SafeTxPool contract being used by the client');
    } else {
      console.log('❌ Target address is NOT in the address book');
      console.log('💡 Solution: Add the address to the address book first');
      console.log('   1. Go to Address Book page in the wallet');
      console.log('   2. Click "Add Address"');
      console.log('   3. Enter the address and a name');
      console.log('   4. Submit the transaction');
    }
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Verify the client is using the correct SafeTxPool address');
    console.log('2. Check browser console for SafeTxPool service logs');
    console.log('3. Verify the Safe has the SafeTxPool set as guard');
    console.log('4. Test with a simple address book addition first');
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    
    if (error.message.includes('NETWORK_ERROR') || error.message.includes('could not detect network')) {
      console.log('💡 Network connection issue. Please check your internet connection.');
    } else if (error.message.includes('call revert exception')) {
      console.log('💡 Contract call failed. Please verify the contract address and ABI.');
    }
  }
}

// Run the debug
debugSafeTxPool().catch(console.error);
