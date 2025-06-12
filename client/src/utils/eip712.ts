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
 * Create Safe transaction hash for EIP-712 signing
 */
export function createSafeTransactionHash(
  domain: SafeDomain,
  txData: SafeTransactionData
): string {
  const domainSeparator = createDomainSeparator(domain);
  
  const safeTxHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'address', 'uint256', 'bytes32', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
      [
        SAFE_TX_TYPEHASH,
        txData.to,
        txData.value,
        ethers.utils.keccak256(txData.data),
        txData.operation,
        txData.safeTxGas,
        txData.baseGas,
        txData.gasPrice,
        txData.gasToken,
        txData.refundReceiver,
        txData.nonce
      ]
    )
  );

  return ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      ['0x19', '0x01', domainSeparator, safeTxHash]
    )
  );
}

/**
 * Create EIP-712 typed data structure for Safe transaction
 */
export function createSafeTransactionTypedData(
  domain: SafeDomain,
  txData: SafeTransactionData
) {
  return {
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
    domain: {
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract
    },
    message: {
      to: txData.to,
      value: txData.value,
      data: txData.data,
      operation: txData.operation,
      safeTxGas: txData.safeTxGas,
      baseGas: txData.baseGas,
      gasPrice: txData.gasPrice,
      gasToken: txData.gasToken,
      refundReceiver: txData.refundReceiver,
      nonce: txData.nonce
    }
  };
}

/**
 * Sign Safe transaction using EIP-712
 */
export async function signSafeTransaction(
  signer: ethers.Signer,
  domain: SafeDomain,
  txData: SafeTransactionData
): Promise<string> {
  const typedData = createSafeTransactionTypedData(domain, txData);
  
  try {
    // Try to use _signTypedData if available (MetaMask, etc.)
    if ('_signTypedData' in signer) {
      return await (signer as any)._signTypedData(
        typedData.domain,
        { SafeTx: typedData.types.SafeTx },
        typedData.message
      );
    }
    
    // Fallback to manual hash signing
    const hash = createSafeTransactionHash(domain, txData);
    return await signer.signMessage(ethers.utils.arrayify(hash));
  } catch (error) {
    console.error('Error signing Safe transaction:', error);
    throw new Error(`Failed to sign Safe transaction: ${error}`);
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
