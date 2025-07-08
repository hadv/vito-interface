import { ethers } from 'ethers';
import { SafeWalletService } from './SafeWalletService';
import { SafeTxPoolService, SafeTxPoolTransaction } from './SafeTxPoolService';
import { SAFE_ABI, getRpcUrl } from '../contracts/abis';
import { walletConnectionService } from './WalletConnectionService';

export interface CancellationResult {
  type: 'simple_deletion' | 'secure_cancellation';
  success: boolean;
  txHash?: string;
  gasUsed?: string;
  error?: string;
}

export interface CancellationEstimate {
  canCancel: boolean;
  isExecutable: boolean;
  simpleDeletion: {
    available: boolean;
    reason?: string;
    securityWarning?: string;
  };
  secureCancellation: {
    available: boolean;
    gasEstimate?: string;
    gasPrice?: string;
    totalCost?: string;
    reason?: string;
  };
}

/**
 * Service for securely cancelling Safe wallet transactions
 * Handles both simple deletion (for non-executable transactions) and 
 * secure on-chain cancellation (for executable transactions)
 */
export class SafeTransactionCancellationService {
  private safeWalletService: SafeWalletService;
  private safeTxPoolService: SafeTxPoolService;
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;

  constructor(network: string) {
    this.safeWalletService = new SafeWalletService();
    this.safeTxPoolService = new SafeTxPoolService(network);
    
    // Initialize provider
    const rpcUrl = getRpcUrl(network);
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Set the signer for executing on-chain cancellations
   */
  setSigner(signer: ethers.Signer | null): void {
    this.signer = signer || undefined;
    this.safeTxPoolService.setSigner(signer);
  }

  /**
   * Get the current signer from wallet connection service if not set
   */
  private getCurrentSigner(): ethers.Signer | undefined {
    if (this.signer) {
      return this.signer;
    }

    // Try to get signer from wallet connection service
    const connectionState = walletConnectionService.getState();
    if (connectionState.signerConnected) {
      return walletConnectionService.getSigner() || undefined;
    }

    return undefined;
  }

  /**
   * Initialize the service with Safe configuration
   */
  async initialize(safeAddress: string, network: string): Promise<void> {
    const currentSigner = this.getCurrentSigner();
    await this.safeWalletService.initialize({
      safeAddress,
      network
    }, currentSigner);

    // Also set signer for SafeTxPoolService
    this.safeTxPoolService.setSigner(currentSigner || null);
  }

  /**
   * Determine if a transaction is executable (has enough signatures)
   */
  private async isTransactionExecutable(transaction: SafeTxPoolTransaction): Promise<boolean> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      const safeOwnerSignatures = await this.countSafeOwnerSignatures(transaction, safeInfo.owners);
      return safeOwnerSignatures >= safeInfo.threshold;
    } catch (error) {
      console.error('Error checking if transaction is executable:', error);
      // Default to secure cancellation if we can't determine
      return true;
    }
  }

  /**
   * Count signatures from actual Safe owners (excluding proposer if not a Safe owner)
   */
  private async countSafeOwnerSignatures(transaction: SafeTxPoolTransaction, safeOwners: string[]): Promise<number> {
    const ownerAddresses = safeOwners.map(addr => addr.toLowerCase());

    return transaction.signatures.filter(sig =>
      ownerAddresses.includes(sig.signer.toLowerCase())
    ).length;
  }

  /**
   * Estimate the cost and feasibility of both cancellation methods
   */
  async estimateCancellation(transaction: SafeTxPoolTransaction): Promise<CancellationEstimate> {
    try {
      const isExecutable = await this.isTransactionExecutable(transaction);
      const currentSigner = this.getCurrentSigner();

      // Check simple deletion availability
      const simpleDeletion = await this.checkSimpleDeletionAvailability(transaction, currentSigner);

      // Check secure cancellation availability
      const secureCancellation = await this.checkSecureCancellationAvailability(transaction, currentSigner);

      return {
        canCancel: simpleDeletion.available || secureCancellation.available,
        isExecutable,
        simpleDeletion,
        secureCancellation
      };
    } catch (error) {
      console.error('Error estimating cancellation:', error);
      return {
        canCancel: false,
        isExecutable: false,
        simpleDeletion: {
          available: false,
          reason: `Estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        secureCancellation: {
          available: false,
          reason: `Estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Check if simple deletion is available for the current user
   */
  private async checkSimpleDeletionAvailability(
    transaction: SafeTxPoolTransaction,
    currentSigner?: ethers.Signer
  ): Promise<{ available: boolean; reason?: string; securityWarning?: string }> {
    if (!currentSigner) {
      return {
        available: false,
        reason: 'Wallet not connected'
      };
    }

    try {
      const signerAddress = await currentSigner.getAddress();
      const isProposer = transaction.proposer.toLowerCase() === signerAddress.toLowerCase();
      const isOwner = await this.safeWalletService.isOwner(signerAddress);

      // Check if user has permission to delete
      if (!isProposer && !isOwner) {
        return {
          available: false,
          reason: 'Only the transaction proposer or Safe owners can delete transactions'
        };
      }

      // Check security implications based on existing Safe owner signatures
      const safeInfo = await this.safeWalletService.getSafeInfo();
      const safeOwnerSignatures = await this.countSafeOwnerSignatures(transaction, safeInfo.owners);
      const signatureGap = safeInfo.threshold - safeOwnerSignatures;

      let securityWarning: string | undefined;

      if (safeOwnerSignatures === 0) {
        // No Safe owner signatures - completely safe to delete
        securityWarning = undefined;
      } else if (signatureGap === 1) {
        securityWarning = `⚠️ HIGH RISK: This transaction needs only 1 more Safe owner signature to be executable. Any Safe owner can collect the existing ${safeOwnerSignatures} signatures and execute it.`;
      } else if (signatureGap <= 2) {
        securityWarning = `⚠️ MEDIUM RISK: This transaction needs ${signatureGap} more Safe owner signatures. Other Safe owners could potentially collect existing signatures and execute it.`;
      } else {
        securityWarning = `⚠️ LOW RISK: This transaction needs ${signatureGap} more Safe owner signatures, but existing signatures could still be reused by others.`;
      }

      return {
        available: true,
        securityWarning
      };
    } catch (error) {
      return {
        available: false,
        reason: 'Error checking permissions'
      };
    }
  }

  /**
   * Check if secure cancellation is available and estimate costs
   */
  private async checkSecureCancellationAvailability(
    transaction: SafeTxPoolTransaction,
    currentSigner?: ethers.Signer
  ): Promise<{ available: boolean; gasEstimate?: string; gasPrice?: string; totalCost?: string; reason?: string }> {
    if (!currentSigner) {
      return {
        available: false,
        reason: 'Wallet not connected. Secure cancellation requires a connected wallet to execute the cancellation transaction.'
      };
    }

    try {
      // Check if current user is a Safe owner
      const signerAddress = await currentSigner.getAddress();
      const isOwner = await this.safeWalletService.isOwner(signerAddress);

      if (!isOwner) {
        return {
          available: false,
          reason: 'Only Safe owners can execute secure cancellation transactions.'
        };
      }

      // Create cancellation transaction for gas estimation
      const cancellationTx = await this.createCancellationTransaction(transaction);

      // Estimate gas for the cancellation transaction
      try {
        const safeContract = new ethers.Contract(
          transaction.safe,
          SAFE_ABI,
          this.provider
        );

        // Build signature bytes (we'll need at least threshold signatures)
        const safeInfo = await this.safeWalletService.getSafeInfo();
        const mockSignatures = '0x' + '00'.repeat(65 * safeInfo.threshold);

        const gasEstimate = await safeContract.estimateGas.execTransaction(
          cancellationTx.to,
          cancellationTx.value,
          cancellationTx.data,
          cancellationTx.operation,
          0, // safeTxGas
          0, // baseGas
          0, // gasPrice
          ethers.constants.AddressZero, // gasToken
          ethers.constants.AddressZero, // refundReceiver
          mockSignatures
        );

        const gasPrice = await this.provider.getGasPrice();
        const totalCost = gasEstimate.mul(gasPrice);

        return {
          available: true,
          gasEstimate: gasEstimate.toString(),
          gasPrice: gasPrice.toString(),
          totalCost: ethers.utils.formatEther(totalCost)
        };
      } catch (gasError) {
        console.error('Gas estimation failed:', gasError);
        return {
          available: false,
          reason: `Gas estimation failed: ${gasError instanceof Error ? gasError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('Error checking secure cancellation availability:', error);
      return {
        available: false,
        reason: `Error checking availability: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a cancellation transaction that consumes the same nonce
   */
  private async createCancellationTransaction(transaction: SafeTxPoolTransaction) {
    // Create a minimal transaction that consumes the nonce
    // We'll send 0 ETH to the Safe itself - this is safe and minimal cost
    return {
      to: transaction.safe, // Send to the Safe itself
      value: '0', // 0 ETH transfer
      data: '0x', // No data
      operation: 0, // CALL operation
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: transaction.nonce // Same nonce as the transaction being cancelled
    };
  }

  /**
   * Cancel a transaction using the specified method
   */
  async cancelTransaction(
    transaction: SafeTxPoolTransaction,
    method: 'simple_deletion' | 'secure_cancellation'
  ): Promise<CancellationResult> {
    try {
      // Validate transaction
      if (!transaction || !transaction.txHash) {
        return {
          type: method,
          success: false,
          error: 'Invalid transaction data'
        };
      }

      // Check if transaction still exists in the pool
      const currentTx = await this.safeTxPoolService.getTxDetails(transaction.txHash);
      if (!currentTx) {
        return {
          type: method,
          success: false,
          error: 'Transaction no longer exists in the pool'
        };
      }

      // Verify the chosen method is available
      const estimate = await this.estimateCancellation(currentTx);

      if (method === 'simple_deletion') {
        if (!estimate.simpleDeletion.available) {
          return {
            type: method,
            success: false,
            error: estimate.simpleDeletion.reason || 'Simple deletion not available'
          };
        }
        return await this.performSimpleDeletion(currentTx);
      } else {
        if (!estimate.secureCancellation.available) {
          return {
            type: method,
            success: false,
            error: estimate.secureCancellation.reason || 'Secure cancellation not available'
          };
        }
        return await this.performSecureCancellation(currentTx);
      }
    } catch (error) {
      console.error('Error cancelling transaction:', error);
      return {
        type: method,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Perform simple deletion from the transaction pool
   */
  private async performSimpleDeletion(transaction: SafeTxPoolTransaction): Promise<CancellationResult> {
    try {
      await this.safeTxPoolService.deleteTx(transaction.txHash);
      
      return {
        type: 'simple_deletion',
        success: true
      };
    } catch (error) {
      console.error('Simple deletion failed:', error);
      return {
        type: 'simple_deletion',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete transaction'
      };
    }
  }

  /**
   * Perform secure on-chain cancellation by executing a nonce-consuming transaction
   */
  private async performSecureCancellation(transaction: SafeTxPoolTransaction): Promise<CancellationResult> {
    const currentSigner = this.getCurrentSigner();
    if (!currentSigner) {
      return {
        type: 'secure_cancellation',
        success: false,
        error: 'No signer available for secure cancellation'
      };
    }

    try {
      // Create the cancellation transaction
      const cancellationTx = await this.createCancellationTransaction(transaction);
      
      // Create and sign the cancellation transaction using SafeWalletService
      const result = await this.safeWalletService.createTransaction({
        to: cancellationTx.to,
        value: cancellationTx.value,
        data: cancellationTx.data,
        operation: cancellationTx.operation
      });

      // The transaction is now in the pool and needs to be executed
      // For now, we'll return success - the user will need to execute it
      // In a future enhancement, we could auto-execute if we have enough signatures
      
      return {
        type: 'secure_cancellation',
        success: true,
        txHash: result.txHash
      };
    } catch (error) {
      console.error('Secure cancellation failed:', error);
      return {
        type: 'secure_cancellation',
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create cancellation transaction'
      };
    }
  }

  /**
   * Check if a transaction can be cancelled by the current user (either method)
   */
  async canUserCancelTransaction(transaction: SafeTxPoolTransaction): Promise<{
    canCancel: boolean;
    canSimpleDelete: boolean;
    canSecureCancel: boolean;
    reason?: string;
  }> {
    try {
      const currentSigner = this.getCurrentSigner();
      if (!currentSigner) {
        return {
          canCancel: false,
          canSimpleDelete: false,
          canSecureCancel: false,
          reason: 'Wallet not connected'
        };
      }

      const estimate = await this.estimateCancellation(transaction);

      return {
        canCancel: estimate.canCancel,
        canSimpleDelete: estimate.simpleDeletion.available,
        canSecureCancel: estimate.secureCancellation.available,
        reason: !estimate.canCancel ? 'No cancellation methods available' : undefined
      };
    } catch (error) {
      console.error('Error checking cancellation permissions:', error);
      return {
        canCancel: false,
        canSimpleDelete: false,
        canSecureCancel: false,
        reason: 'Error checking permissions'
      };
    }
  }
}
