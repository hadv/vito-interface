// Debug script to check SafeTxPoolRegistry contract interface
const { ethers } = require('ethers');

// SafeTxPoolRegistry ABI (simplified for testing)
const REGISTRY_ABI = [
  {
    "type": "function",
    "name": "addTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isTrustedContract",
    "inputs": [
      {"name": "safe", "type": "address"},
      {"name": "contractAddress", "type": "address"}
    ],
    "outputs": [
      {"name": "trusted", "type": "bool"}
    ],
    "stateMutability": "view"
  }
];

async function debugContract() {
  // Connect to Sepolia
  const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  
  // Registry contract address (from the failed transaction)
  const registryAddress = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  
  // Create contract instance
  const contract = new ethers.Contract(registryAddress, REGISTRY_ABI, provider);
  
  try {
    console.log('Testing SafeTxPoolRegistry contract at:', registryAddress);
    
    // Test if the contract exists and has the function
    const code = await provider.getCode(registryAddress);
    console.log('Contract code length:', code.length);
    
    if (code === '0x') {
      console.log('ERROR: No contract deployed at this address!');
      return;
    }
    
    // Try to call a view function to test the interface
    const safeAddress = '0x52d8de504bc57f36813cb01d414a4d6d8d956ce3'; // From the failed transaction
    const testContractAddress = '0x779877a7b0d9e8603169ddbd7836e478b4624789'; // From the failed transaction
    
    console.log('Testing isTrustedContract function...');
    const isTrusted = await contract.isTrustedContract(safeAddress, testContractAddress);
    console.log('isTrustedContract result:', isTrusted);
    
    // Try to encode the addTrustedContract function call
    console.log('Testing function encoding...');
    const iface = new ethers.utils.Interface(REGISTRY_ABI);
    const encodedData = iface.encodeFunctionData('addTrustedContract', [safeAddress, testContractAddress]);
    console.log('Encoded function data:', encodedData);
    
    // Compare with the failed transaction data
    const failedTxData = '0x55ae89c80000000000000000000000007a3d07cabd656aec614831b6efabd014697c9e19000000000000000000000000779877a7b0d9e8603169ddbd7836e478b4624789';
    console.log('Failed transaction inner data:', failedTxData);
    console.log('Data matches:', encodedData === failedTxData);
    
  } catch (error) {
    console.error('Error testing contract:', error);
  }
}

debugContract().catch(console.error);
