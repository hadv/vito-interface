const { ethers } = require('ethers');

// Debug signature recovery for the specific transaction
async function debugSignatureRecovery() {
  console.log('🔍 Debugging Signature Recovery for GS026 Error');
  console.log('=================================================');

  // From the logs - the actual signature being processed
  const signature = '0xa23d30bbf07ae388a6627bbe9f1b6d233aa065fef96fae83e4c21eea4b15f3e551bd429bc00e8ce5281cd776a54a2a28a4d23b8b6ba43f1b9b7e1de18d94e5bf1c';
  const expectedSigner = '0x7857d5D130E1309235b29B969B4b6B03e934e9F9';
  const safeAddress = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  const targetAddress = '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe';
  const amount = '0x5af3107a4000'; // From transaction data

  console.log('📋 Transaction Details:');
  console.log('Signature:', signature);
  console.log('Expected Signer:', expectedSigner);
  console.log('Safe Address:', safeAddress);
  console.log('Target Address:', targetAddress);
  console.log('Amount (hex):', amount);
  console.log('Amount (decimal):', parseInt(amount, 16), 'wei');
  console.log('Amount (ETH):', ethers.utils.formatEther(amount));

  // Parse signature components
  const r = signature.slice(2, 66);
  const s = signature.slice(66, 130);
  const v = parseInt(signature.slice(130, 132), 16);

  console.log('\n🔐 Signature Components:');
  console.log('r:', r);
  console.log('s:', s);
  console.log('v:', v);

  // Test signature recovery with different hash methods
  console.log('\n🧪 Testing Different Hash Generation Methods:');

  try {
    // Method 1: Try to reconstruct the exact hash that should have been signed
    const chainId = 11155111; // Sepolia
    
    // Create Safe transaction data structure
    const safeTransactionData = {
      to: targetAddress,
      value: amount,
      data: '0x',
      operation: 0,
      safeTxGas: '0',
      baseGas: '0', 
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: 1 // This might be wrong - we need the actual nonce
    };

    console.log('📋 Safe Transaction Data:', safeTransactionData);

    // Method 1a: EIP-712 hash using Safe domain
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

    const hash1 = ethers.utils._TypedDataEncoder.hash(domain, types, safeTransactionData);
    console.log('🔍 Method 1 - EIP-712 hash (Safe domain):', hash1);

    const recovered1 = ethers.utils.recoverAddress(hash1, signature);
    console.log('🔍 Method 1 - Recovered signer:', recovered1);
    console.log('✅ Method 1 - Match:', recovered1.toLowerCase() === expectedSigner.toLowerCase());

    // Method 1b: Try with different nonce values
    for (let testNonce = 0; testNonce <= 5; testNonce++) {
      const testTxData = { ...safeTransactionData, nonce: testNonce };
      const testHash = ethers.utils._TypedDataEncoder.hash(domain, types, testTxData);
      const testRecovered = ethers.utils.recoverAddress(testHash, signature);
      
      if (testRecovered.toLowerCase() === expectedSigner.toLowerCase()) {
        console.log(`🎯 FOUND CORRECT NONCE: ${testNonce}`);
        console.log('🔍 Correct hash:', testHash);
        break;
      }
    }

    // Method 2: Try SafeTxPool domain (if different)
    const safeTxPoolDomain = {
      chainId: chainId,
      verifyingContract: '0xA96f4195deEE07f3B47106d0C237c71cB7C774De' // SafeTxPool address
    };

    const hash2 = ethers.utils._TypedDataEncoder.hash(safeTxPoolDomain, types, safeTransactionData);
    console.log('\n🔍 Method 2 - EIP-712 hash (SafeTxPool domain):', hash2);

    const recovered2 = ethers.utils.recoverAddress(hash2, signature);
    console.log('🔍 Method 2 - Recovered signer:', recovered2);
    console.log('✅ Method 2 - Match:', recovered2.toLowerCase() === expectedSigner.toLowerCase());

    // Method 3: Check if the signature is actually valid for any common message
    console.log('\n🔍 Method 3 - Testing signature validity:');
    
    // Test with raw message hash
    const rawMessage = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('test'));
    try {
      const recovered3 = ethers.utils.recoverAddress(rawMessage, signature);
      console.log('🔍 Method 3 - Raw message recovery:', recovered3);
    } catch (e) {
      console.log('❌ Method 3 - Raw message recovery failed:', e.message);
    }

    // Method 4: Check the actual Safe owners
    console.log('\n👥 Checking Safe Owners:');
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
    
    const SAFE_ABI = [
      "function getOwners() external view returns (address[] memory)",
      "function getThreshold() external view returns (uint256)",
      "function nonce() external view returns (uint256)"
    ];

    const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
    
    const owners = await safeContract.getOwners();
    const threshold = await safeContract.getThreshold();
    const currentNonce = await safeContract.nonce();

    console.log('Safe Owners:', owners);
    console.log('Safe Threshold:', threshold.toString());
    console.log('Current Nonce:', currentNonce.toString());
    console.log('Expected Signer in Owners:', owners.some(owner => owner.toLowerCase() === expectedSigner.toLowerCase()));

    // Method 5: Test with correct nonce
    console.log('\n🔍 Method 5 - Testing with correct nonce:');
    const correctTxData = { ...safeTransactionData, nonce: currentNonce.toNumber() };
    const correctHash = ethers.utils._TypedDataEncoder.hash(domain, types, correctTxData);
    const correctRecovered = ethers.utils.recoverAddress(correctHash, signature);

    console.log('🔍 Correct nonce hash:', correctHash);
    console.log('🔍 Correct nonce recovered:', correctRecovered);
    console.log('✅ Correct nonce match:', correctRecovered.toLowerCase() === expectedSigner.toLowerCase());

    // Method 6: Test with the exact transaction data from the execution logs
    console.log('\n🔍 Method 6 - Testing with exact execution data:');

    // From the transaction data in the error log, extract the exact parameters
    const executionTxData = {
      to: targetAddress,
      value: amount,
      data: '0x',
      operation: 0,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: currentNonce.toNumber() // Use the actual current nonce
    };

    console.log('📋 Execution transaction data:', executionTxData);

    const executionHash = ethers.utils._TypedDataEncoder.hash(domain, types, executionTxData);
    const executionRecovered = ethers.utils.recoverAddress(executionHash, signature);

    console.log('🔍 Execution hash:', executionHash);
    console.log('🔍 Execution recovered:', executionRecovered);
    console.log('✅ Execution match:', executionRecovered.toLowerCase() === expectedSigner.toLowerCase());

    // Method 7: Check if the signature was created with a different nonce (maybe the nonce when it was signed)
    console.log('\n🔍 Method 7 - Testing with potential signing nonce:');

    // The signature might have been created when the nonce was different
    // Let's test with nonces around the current one
    for (let testNonce = Math.max(0, currentNonce.toNumber() - 5); testNonce <= currentNonce.toNumber() + 5; testNonce++) {
      const testTxData = { ...executionTxData, nonce: testNonce };
      const testHash = ethers.utils._TypedDataEncoder.hash(domain, types, testTxData);
      const testRecovered = ethers.utils.recoverAddress(testHash, signature);

      if (testRecovered.toLowerCase() === expectedSigner.toLowerCase()) {
        console.log(`🎯 FOUND MATCHING NONCE: ${testNonce}`);
        console.log('🔍 Matching hash:', testHash);
        console.log('🔍 Current nonce:', currentNonce.toString());
        console.log('🔍 Nonce difference:', currentNonce.toNumber() - testNonce);
        break;
      }
    }

  } catch (error) {
    console.error('❌ Error during signature recovery testing:', error);
  }

  console.log('\n🎯 Analysis Summary:');
  console.log('1. Check if the recovered signer matches the expected signer');
  console.log('2. Verify the signer is in the Safe owners list');
  console.log('3. Ensure the correct nonce is being used');
  console.log('4. Confirm the EIP-712 domain is correct (Safe vs SafeTxPool)');
}

// Run the debug
debugSignatureRecovery().catch(console.error);
