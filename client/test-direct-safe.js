const { ethers } = require('ethers');

// Test direct Safe execution with minimal processing
async function testDirectSafe() {
  console.log('🔥 TESTING DIRECT SAFE EXECUTION');
  console.log('='.repeat(50));
  
  // The EXACT signature from the failed transaction
  const rawSignature = '0xc380c80e0fd704ef226742c0b99950abfbedc25bde321a5d534b254bb6e3b58272d60859fc415d4214b5cb1432a4d5012eda220d7f57cd0acc9fb0f7987050421f';
  
  console.log('Raw signature from failed tx:', rawSignature);
  console.log('Signature length:', rawSignature.length);
  console.log('Expected length: 132 (0x + 64 + 64 + 2)');
  
  // Parse signature components
  const r = '0x' + rawSignature.slice(2, 66);
  const s = '0x' + rawSignature.slice(66, 130);
  const v = parseInt(rawSignature.slice(130, 132), 16);
  
  console.log('r:', r);
  console.log('s:', s);
  console.log('v:', v, '(should be 31 for Safe format)');
  
  // Test different signature formats
  console.log('\n🧪 Testing Different Signature Formats:');
  
  // Format 1: As-is (what we used)
  console.log('Format 1 (as-is):', rawSignature);
  
  // Format 2: Convert v back to ECDSA format (27/28)
  let ecdsaV = v;
  if (v === 31) ecdsaV = 27;
  if (v === 32) ecdsaV = 28;
  
  const ecdsaSignature = r.slice(2) + s.slice(2) + ecdsaV.toString(16).padStart(2, '0');
  console.log('Format 2 (ECDSA v):', '0x' + ecdsaSignature);
  
  // Format 3: Try with different v values
  const v27Signature = r.slice(2) + s.slice(2) + '1b'; // v=27
  const v28Signature = r.slice(2) + s.slice(2) + '1c'; // v=28
  
  console.log('Format 3 (v=27):', '0x' + v27Signature);
  console.log('Format 4 (v=28):', '0x' + v28Signature);
  
  // Test signature recovery with each format
  const txHash = '0x3896381a1f1d8f301370b54346402625a025dc9e4598b390b4f98d217c73dc17';
  const expectedSigner = '0x7857d5D130E1309235b29B969B4b6B03e934e9F9';
  
  console.log('\n🔍 Testing Recovery:');
  
  const formats = [
    { name: 'Original', sig: rawSignature },
    { name: 'ECDSA', sig: '0x' + ecdsaSignature },
    { name: 'v=27', sig: '0x' + v27Signature },
    { name: 'v=28', sig: '0x' + v28Signature }
  ];
  
  for (const format of formats) {
    try {
      const recovered = ethers.utils.recoverAddress(txHash, format.sig);
      const matches = recovered.toLowerCase() === expectedSigner.toLowerCase();
      console.log(`${format.name}: ${recovered} ${matches ? '✅' : '❌'}`);
    } catch (e) {
      console.log(`${format.name}: Recovery failed ❌`);
    }
  }
  
  console.log('\n💡 Analysis:');
  console.log('The signature that recovers correctly should be used for Safe execution.');
  console.log('If none recover correctly, the issue is in the transaction hash calculation.');
  console.log('If one recovers correctly but Safe still rejects it, the issue is in signature encoding.');
}

testDirectSafe();
