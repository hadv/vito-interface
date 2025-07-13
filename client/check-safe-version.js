const { ethers } = require('ethers');

async function checkSafeVersion() {
  const provider = new ethers.providers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const safeAddress = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19';
  
  const SAFE_ABI = [
    "function VERSION() external view returns (string memory)",
    "function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) public view returns (bytes32)",
    "function getGuard() external view returns (address)"
  ];

  const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
  
  try {
    const version = await safeContract.VERSION();
    console.log('Safe Version:', version);
    
    // Test the actual hash calculation the Safe contract would use
    const txHash = await safeContract.getTransactionHash(
      '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe', // to
      '0x3ff2e795f50000', // value (0.018 ETH)
      '0x', // data
      0, // operation
      0, // safeTxGas
      0, // baseGas
      0, // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      35 // nonce
    );
    
    console.log('Safe Contract Hash:', txHash);
    
    // Compare with our EIP-712 hash
    const domain = {
      chainId: 11155111,
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

    const txData = {
      to: '0x97A479Abb46A9fF92b2Bf26D8c110C89c83916Fe',
      value: '0x3ff2e795f50000',
      data: '0x',
      operation: 0,
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: '0x0000000000000000000000000000000000000000',
      refundReceiver: '0x0000000000000000000000000000000000000000',
      nonce: 35
    };

    const ourHash = ethers.utils._TypedDataEncoder.hash(domain, types, txData);
    console.log('Our EIP-712 Hash:', ourHash);
    
    console.log('Hashes Match:', txHash.toLowerCase() === ourHash.toLowerCase());

    // Check if SafeTxPool guard is enabled
    const guard = await safeContract.getGuard();
    console.log('Safe Guard Address:', guard);
    console.log('SafeTxPool Guard Enabled:', guard.toLowerCase() === '0xA96f4195deEE07f3B47106d0C237c71cB7C774De'.toLowerCase());

  } catch (error) {
    console.error('Error:', error);
  }
}

checkSafeVersion();
