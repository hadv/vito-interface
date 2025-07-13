const { ethers } = require('ethers');

// Debug the EXACT transaction that failed
async function debugFailedTransaction() {
  console.log('🔍 Debugging Failed Transaction: 0xc2785249556cdaae319f809adf2abb3b7fe63f17ebabb195a4489d1181945ca9');
  console.log('='.repeat(80));

  // From Etherscan transaction data
  const failedTxData = {
    to: '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe',
    value: '0x3ff2e795f50000', // 0.018 ETH
    data: '0x',
    operation: 0,
    safeTxGas: '0',
    baseGas: '0',
    gasPrice: '0',
    gasToken: '0x0000000000000000000000000000000000000000',
    refundReceiver: '0x0000000000000000000000000000000000000000',
    // nonce: ??? - we need to find this
  };

  const signature = '0xc380c80e0fd704ef226742c0b99950abfbedc25bde321a5d534b254bb6e3b58272d60859fc415d4214b5cb1432a4d5012eda220d7f57cd0acc9fb0f7987050421f';
  const safeAddress = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  const expectedSigner = '0x7857d5D130E1309235b29B969B4b6B03e934e9F9';

  console.log('📋 Failed Transaction Data:');
  console.log('To:', failedTxData.to);
  console.log('Value:', failedTxData.value, '=', parseInt(failedTxData.value, 16), 'wei =', ethers.utils.formatEther(failedTxData.value), 'ETH');
  console.log('Signature:', signature);
  console.log('Safe Address:', safeAddress);
  console.log('Expected Signer:', expectedSigner);

  try {
    // Connect to Sepolia
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    // Get current Safe nonce
    const SAFE_ABI = [
      "function nonce() external view returns (uint256)",
      "function getOwners() external view returns (address[] memory)"
    ];

    const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
    const currentNonce = await safeContract.nonce();
    const owners = await safeContract.getOwners();

    console.log('\n🏦 Safe Contract Info:');
    console.log('Current Nonce:', currentNonce.toString());
    console.log('Owners:', owners);

    // Test different nonces around the current one
    console.log('\n🧪 Testing Different Nonces:');
    
    const chainId = 11155111; // Sepolia
    const domain = {
      chainId: chainId,
      verifyingContract: safeAddress
    };

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

    // Test nonces from current-10 to current+5
    for (let testNonce = Math.max(0, currentNonce.toNumber() - 10); testNonce <= currentNonce.toNumber() + 5; testNonce++) {
      const testTxData = {
        ...failedTxData,
        nonce: testNonce
      };

      const hash = ethers.utils._TypedDataEncoder.hash(domain, types, testTxData);
      
      try {
        const recovered = ethers.utils.recoverAddress(hash, signature);
        
        if (recovered.toLowerCase() === expectedSigner.toLowerCase()) {
          console.log(`🎯 FOUND CORRECT NONCE: ${testNonce}`);
          console.log('🔍 Hash:', hash);
          console.log('🔍 Recovered:', recovered);
          console.log('🔍 Current nonce:', currentNonce.toString());
          console.log('🔍 Nonce difference:', currentNonce.toNumber() - testNonce);
          
          if (testNonce !== currentNonce.toNumber()) {
            console.log('❌ PROBLEM: Signature was created with nonce', testNonce, 'but current nonce is', currentNonce.toString());
            console.log('💡 SOLUTION: The transaction was signed when the nonce was different!');
          }
          break;
        }
      } catch (e) {
        // Ignore recovery errors
      }
    }

    // Also test if the signature was created with a different Safe address (domain)
    console.log('\n🧪 Testing Different Domains:');
    
    const safeTxPoolAddress = '0xA96f4195deEE07f3B47106d0C237c71cB7C774De';
    const altDomain = {
      chainId: chainId,
      verifyingContract: safeTxPoolAddress
    };

    const testTxDataWithCurrentNonce = {
      ...failedTxData,
      nonce: currentNonce.toNumber()
    };

    const altHash = ethers.utils._TypedDataEncoder.hash(altDomain, types, testTxDataWithCurrentNonce);
    try {
      const altRecovered = ethers.utils.recoverAddress(altHash, signature);
      console.log('🔍 SafeTxPool domain hash:', altHash);
      console.log('🔍 SafeTxPool domain recovered:', altRecovered);
      
      if (altRecovered.toLowerCase() === expectedSigner.toLowerCase()) {
        console.log('🎯 FOUND: Signature was created with SafeTxPool domain!');
      }
    } catch (e) {
      console.log('❌ SafeTxPool domain recovery failed');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }

  console.log('\n🎯 Summary:');
  console.log('The signature validation is failing because:');
  console.log('1. The signature was created with a different nonce than current');
  console.log('2. OR the signature was created with a different EIP-712 domain');
  console.log('3. OR the transaction parameters changed between signing and execution');
  console.log('\n💡 Solution: We need to either:');
  console.log('1. Use the EXACT same transaction data that was signed');
  console.log('2. OR re-sign the transaction with current parameters');
}

// Run the debug
debugFailedTransaction().catch(console.error);
