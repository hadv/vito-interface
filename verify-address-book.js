const { ethers } = require('ethers');

// SafeTxPool ABI (minimal for address book functions)
const SAFE_TX_POOL_ABI = [
  "function getAddressBookEntries(address safe) external view returns (tuple(bytes32 name, address walletAddress)[] memory)",
  "function checkTransaction(address to, uint256, bytes memory, uint8 operation, uint256, uint256, uint256, address, address payable, bytes memory, address) external override"
];

async function verifyAddressBook() {
  // Configuration - Get from environment or use defaults
  const SEPOLIA_RPC = process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';
  const SAFE_TX_POOL_ADDRESS = process.env.REACT_APP_SAFE_TX_POOL_SEPOLIA || '0xA96f4195deEE07f3B47106d0C237c71cB7C774De';
  const SAFE_ADDRESS = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  const TARGET_ADDRESS = '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe';

  try {
    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC);
    
    // Create contract instance
    const safeTxPool = new ethers.Contract(SAFE_TX_POOL_ADDRESS, SAFE_TX_POOL_ABI, provider);
    
    console.log('🔍 Verifying Address Book Configuration');
    console.log('SafeTxPool Address:', SAFE_TX_POOL_ADDRESS);
    console.log('Safe Address:', SAFE_ADDRESS);
    console.log('Target Address:', TARGET_ADDRESS);
    console.log('');
    
    // Get address book entries
    console.log('📚 Fetching address book entries...');
    const entries = await safeTxPool.getAddressBookEntries(SAFE_ADDRESS);
    
    console.log(`Found ${entries.length} entries in address book:`);
    
    let targetFound = false;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const name = ethers.utils.parseBytes32String(entry.name);
      const address = entry.walletAddress;
      
      console.log(`  ${i + 1}. ${name} -> ${address}`);
      
      if (address.toLowerCase() === TARGET_ADDRESS.toLowerCase()) {
        targetFound = true;
        console.log(`    ✅ TARGET ADDRESS FOUND!`);
      }
    }
    
    console.log('');
    if (targetFound) {
      console.log('✅ Target address IS in the address book');
      console.log('❓ The GS026 error is likely caused by something else:');
      console.log('   - Signature format issues');
      console.log('   - Signature recovery problems');
      console.log('   - Transaction hash mismatch');
      console.log('   - Safe contract configuration');
    } else {
      console.log('❌ Target address is NOT in the address book');
      console.log('💡 Solution: Add the address to the address book first');
    }
    
  } catch (error) {
    console.error('❌ Error verifying address book:', error.message);
    
    if (error.message.includes('NETWORK_ERROR')) {
      console.log('💡 Please update the SEPOLIA_RPC URL with a valid Infura/Alchemy endpoint');
    }
  }
}

// Run the verification
verifyAddressBook();
