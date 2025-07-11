import { ethers } from 'ethers';

// EIP-712 Domain for Safe transactions
export interface SafeDomain {
  chainId: number;
  verifyingContract: string;
}

// Safe transaction structure for EIP-712
export interface SafeTransactionData {
  to: string;
  value: string;
  data: string;
  operation: number;
  safeTxGas: string;
  baseGas: string;
  gasPrice: string;
  gasToken: string;
  refundReceiver: string;
  nonce: number;
}

// EIP-712 type definitions for Safe transactions
export const SAFE_TX_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes(
    'SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)'
  )
);

export const EIP712_DOMAIN_TYPEHASH = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes('EIP712Domain(uint256 chainId,address verifyingContract)')
);

/**
 * Create EIP-712 domain separator for Safe
 */
export function createDomainSeparator(domain: SafeDomain): string {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'uint256', 'address'],
      [EIP712_DOMAIN_TYPEHASH, domain.chainId, domain.verifyingContract]
    )
  );
}

/**
 * Validate and normalize address with proper checksum
 */
function normalizeAddress(address: string): string {
  try {
    return ethers.utils.getAddress(address);
  } catch (error) {
    throw new Error(`Invalid address format: ${address}`);
  }
}

/**
 * Create Safe transaction hash for EIP-712 signing with address validation
 */
export function createSafeTransactionHash(
  domain: SafeDomain,
  txData: SafeTransactionData
): string {
  try {
    // Validate and normalize addresses
    const normalizedDomain = {
      chainId: domain.chainId,
      verifyingContract: normalizeAddress(domain.verifyingContract)
    };

    const normalizedTxData = {
      ...txData,
      to: normalizeAddress(txData.to),
      gasToken: normalizeAddress(txData.gasToken),
      refundReceiver: normalizeAddress(txData.refundReceiver)
    };

    const domainSeparator = createDomainSeparator(normalizedDomain);

    const safeTxHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
        [
          SAFE_TX_TYPEHASH,
          normalizedTxData.to,
          normalizedTxData.value,
          ethers.utils.keccak256(normalizedTxData.data),
          normalizedTxData.operation,
          normalizedTxData.safeTxGas,
          normalizedTxData.baseGas,
          normalizedTxData.gasPrice,
          normalizedTxData.gasToken,
          normalizedTxData.refundReceiver,
          normalizedTxData.nonce
        ]
      )
    );

    return ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
        ['0x19', '0x01', domainSeparator, safeTxHash]
      )
    );
  } catch (error: any) {
    console.error('❌ Error creating Safe transaction hash:', error);
    throw new Error(`Failed to create Safe transaction hash: ${error.message}`);
  }
}

/**
 * Create EIP-712 typed data structure for Safe transaction with address validation
 */
export function createSafeTransactionTypedData(
  domain: SafeDomain,
  txData: SafeTransactionData
) {
  try {
    // Validate and normalize addresses
    const normalizedDomain = {
      chainId: domain.chainId,
      verifyingContract: normalizeAddress(domain.verifyingContract)
    };

    const normalizedTxData = {
      ...txData,
      to: normalizeAddress(txData.to),
      gasToken: normalizeAddress(txData.gasToken),
      refundReceiver: normalizeAddress(txData.refundReceiver)
    };

    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
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
      },
      primaryType: 'SafeTx',
      domain: normalizedDomain,
      message: normalizedTxData
    };

    // Debug: Check if this might be causing mobile wallet issues
    const isERC20 = normalizedTxData.data && normalizedTxData.data !== '0x' && normalizedTxData.data.startsWith('0xa9059cbb');

    if (isERC20) {
      console.log('🔍 EIP-712 TYPED DATA DEBUG (ERC20):');
      console.log('  - Message data length:', normalizedTxData.data.length);
      console.log('  - Types structure:', JSON.stringify(typedData.types, null, 2));
      console.log('  - Domain:', JSON.stringify(typedData.domain, null, 2));
      console.log('  - Message preview:', JSON.stringify({
        ...normalizedTxData,
        data: normalizedTxData.data.substring(0, 50) + '...'
      }, null, 2));

      // Check for potential mobile wallet compatibility issues
      if (normalizedTxData.data.length > 200) {
        console.log('⚠️  WARNING: Long data field may cause mobile wallet display issues');
      }
    }

    return typedData;
  } catch (error: any) {
    console.error('❌ Error creating EIP-712 typed data:', error);
    throw new Error(`Failed to create EIP-712 typed data: ${error.message}`);
  }
}

/**
 * Sign Safe transaction using EIP-712 with enhanced error handling
 */
export async function signSafeTransaction(
  signer: ethers.Signer,
  domain: SafeDomain,
  txData: SafeTransactionData
): Promise<string> {
  console.log('🔐 Starting EIP-712 Safe transaction signing...');
  console.log('📋 Domain:', domain);
  console.log('📋 Transaction data:', txData);

  try {
    const typedData = createSafeTransactionTypedData(domain, txData);
    console.log('📋 Typed data created:', typedData);
    console.log('🔐 REAL SAFE TRANSACTION SIGNING STARTED');
    console.log('📱 This should trigger your mobile wallet now!');

    // Method 1: Try to use _signTypedData if available (MetaMask, etc.) with timeout
    if ('_signTypedData' in signer) {
      console.log('🔐 Method 1: Using _signTypedData (MetaMask style)...');
      try {
        // Add timeout to prevent hanging
        const signPromise = (signer as any)._signTypedData(
          typedData.domain,
          { SafeTx: typedData.types.SafeTx },
          typedData.message
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Method 1 timeout')), 5000) // 5 second timeout
        );

        const signature = await Promise.race([signPromise, timeoutPromise]);
        console.log('✅ EIP-712 signing successful (method 1)');
        return signature;
      } catch (method1Error: any) {
        console.log('❌ Method 1 failed:', method1Error.message || method1Error);
        // Continue to method 2
      }
    }

    // Method 2: Try eth_signTypedData_v4 if available (bypass getAddress to avoid hanging)
    if (signer.provider && 'send' in signer.provider) {
      console.log('🔐 Method 2: Using eth_signTypedData_v4...');
      console.log('📱 MOBILE WALLET: You should see an EIP-712 signing request now!');

      try {
        // Get address using eth_accounts (which works) instead of getAddress() (which hangs)
        console.log('🔐 Method 2: Getting address via eth_accounts...');
        const accounts = await (signer.provider as any).send('eth_accounts', []);

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts available');
        }

        const signerAddress = accounts[0];
        console.log('📋 Using address from eth_accounts:', signerAddress);

        console.log('📋 EIP-712 data being sent:', {
          address: signerAddress,
          typedData: JSON.stringify(typedData, null, 2)
        });

        console.log('🔐 Method 2: Sending eth_signTypedData_v4 request...');
        const signature = await (signer.provider as any).send('eth_signTypedData_v4', [
          signerAddress,
          JSON.stringify(typedData)
        ]);
        console.log('✅ EIP-712 signing successful (method 2)');
        console.log('📋 Signature received:', signature);
        return signature;
      } catch (method2Error: any) {
        console.log('❌ Method 2 failed:', method2Error.message || method2Error);
        console.log('📱 Mobile wallet may have rejected the EIP-712 signing request');
        // Continue to method 3
      }
    }

    // Method 3: Fallback to manual hash signing
    console.log('🔐 Method 3: Using manual hash signing...');
    try {
      const hash = createSafeTransactionHash(domain, txData);
      console.log('📋 Transaction hash:', hash);

      const signature = await signer.signMessage(ethers.utils.arrayify(hash));
      console.log('✅ EIP-712 signing successful (method 3)');
      return signature;
    } catch (method3Error: any) {
      console.log('❌ Method 3 failed:', method3Error.message || method3Error);
      throw method3Error;
    }

  } catch (error: any) {
    console.error('❌ All EIP-712 signing methods failed:', error);

    // Provide detailed error information
    const errorMessage = error?.message || error?.reason || error?.data?.message || 'Unknown signing error';
    const errorCode = error?.code || 'UNKNOWN_ERROR';

    console.error('Error details:', {
      message: errorMessage,
      code: errorCode,
      error: error
    });

    // User-friendly error messages based on common error types
    if (errorCode === 'ACTION_REJECTED' || errorMessage.includes('rejected') || errorMessage.includes('denied')) {
      throw new Error('Transaction signing was rejected by user');
    }

    if (errorCode === 'UNSUPPORTED_OPERATION' || errorMessage.includes('unsupported')) {
      throw new Error('EIP-712 signing not supported by wallet. Please try a different wallet.');
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      throw new Error('Network error during signing. Please check your connection and try again.');
    }

    throw new Error(`Failed to sign Safe transaction: ${errorMessage}`);
  }
}

/**
 * Verify Safe transaction signature
 */
export function verifySafeTransactionSignature(
  signature: string,
  signerAddress: string,
  domain: SafeDomain,
  txData: SafeTransactionData
): boolean {
  try {
    const hash = createSafeTransactionHash(domain, txData);
    const recoveredAddress = ethers.utils.verifyMessage(ethers.utils.arrayify(hash), signature);
    return recoveredAddress.toLowerCase() === signerAddress.toLowerCase();
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

/**
 * Parse signature into v, r, s components
 */
export function parseSignature(signature: string): { v: number; r: string; s: string } {
  const sig = ethers.utils.splitSignature(signature);
  return {
    v: sig.v,
    r: sig.r,
    s: sig.s
  };
}

/**
 * Combine multiple signatures for Safe execution
 * Signatures must be sorted by signer address (ascending)
 */
export function combineSignatures(signatures: Array<{ signature: string; signer: string }>): string {
  // Sort signatures by signer address (required by Safe)
  const sortedSignatures = signatures.sort((a, b) =>
    a.signer.toLowerCase().localeCompare(b.signer.toLowerCase())
  );

  let combinedSignatures = '0x';

  for (const { signature } of sortedSignatures) {
    // Remove 0x prefix and append
    combinedSignatures += signature.slice(2);
  }

  return combinedSignatures;
}

/**
 * Create Safe transaction hash compatible with Safe contracts
 */
export function createSafeContractTransactionHash(
  safeAddress: string,
  chainId: number,
  txData: SafeTransactionData
): string {
  const domain: SafeDomain = {
    chainId,
    verifyingContract: safeAddress
  };
  
  return createSafeTransactionHash(domain, txData);
}
