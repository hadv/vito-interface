import { ethers } from 'ethers';
import { SafeTxPoolService } from './SafeTxPoolService';
import { SAFE_ABI } from '../contracts/abis';
import { getProviderForNetwork } from '../utils/ens';

export interface SafeWalletConfig {
  safeAddress: string;
  network: string;
  rpcUrl?: string;
}

export interface TransactionRequest {
  to: string;
  value: string;
  data?: string;
  operation?: number;
}

export interface SafeTransactionResult {
  safeTxHash: string;
  transaction: SafeTransactionData;
  isExecuted: boolean;
  confirmations: number;
  threshold: number;
}

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

export class SafeWalletService {
  private safeContract: ethers.Contract | null = null;
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private config: SafeWalletConfig | null = null;
  private safeTxPoolService: SafeTxPoolService | null = null;

  /**
   * Initialize the Safe Wallet Service
   */
  async initialize(config: SafeWalletConfig, signer?: ethers.Signer): Promise<void> {
    this.config = config;

    // Set up provider based on network
    this.provider = config.rpcUrl
      ? new ethers.providers.JsonRpcProvider(config.rpcUrl)
      : getProviderForNetwork(config.network);

    // Use provided signer or create a read-only provider
    if (signer) {
      this.signer = signer;
    }

    // Initialize Safe contract
    this.safeContract = new ethers.Contract(
      config.safeAddress,
      SAFE_ABI,
      this.signer || this.provider
    );

    // Initialize SafeTxPool service
    this.safeTxPoolService = new SafeTxPoolService(config.network);
    if (this.signer) {
      this.safeTxPoolService.setSigner(this.signer);
    }
  }

  /**
   * Check if the service is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.safeContract || !this.safeTxPoolService) {
      throw new Error('SafeWalletService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get Safe information
   */
  async getSafeInfo() {
    this.ensureInitialized();

    if (!this.safeContract || !this.provider) {
      throw new Error('Safe contract or provider not available');
    }

    try {
      const [owners, threshold, balance, network] = await Promise.all([
        this.safeContract.getOwners(),
        this.safeContract.getThreshold(),
        this.provider.getBalance(this.config!.safeAddress),
        this.provider.getNetwork()
      ]);

      return {
        address: this.config!.safeAddress,
        owners,
        threshold: threshold.toNumber(),
        balance: ethers.utils.formatEther(balance),
        chainId: network.chainId
      };
    } catch (error) {
      console.error('Error getting Safe info:', error);
      throw new Error(`Failed to get Safe information: ${error}`);
    }
  }

  /**
   * Create a Safe transaction and propose it to the SafeTxPool
   */
  async createTransaction(transactionRequest: TransactionRequest): Promise<SafeTransactionData & { txHash: string }> {
    this.ensureInitialized();

    if (!this.safeTxPoolService || !this.safeContract) {
      throw new Error('SafeTxPool service or Safe contract not initialized');
    }

    try {
      // Get current nonce for the Safe
      const nonce = await this.getNonce();

      // Create Safe transaction data with default gas parameters
      const safeTransactionData: SafeTransactionData = {
        to: transactionRequest.to,
        value: transactionRequest.value,
        data: transactionRequest.data || '0x',
        operation: transactionRequest.operation || 0,
        safeTxGas: '0', // Let Safe estimate
        baseGas: '0',   // Let Safe estimate
        gasPrice: '0',  // Use network gas price
        gasToken: ethers.constants.AddressZero, // Pay in ETH
        refundReceiver: ethers.constants.AddressZero,
        nonce
      };

      // Propose transaction to SafeTxPool contract
      const txHash = await this.safeTxPoolService.proposeTx({
        safe: this.config!.safeAddress,
        to: safeTransactionData.to,
        value: safeTransactionData.value,
        data: safeTransactionData.data,
        operation: safeTransactionData.operation,
        nonce: safeTransactionData.nonce
      });

      return {
        ...safeTransactionData,
        txHash
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  /**
   * Sign a Safe transaction and submit signature to SafeTxPool
   */
  async signTransaction(safeTransaction: SafeTransactionData & { txHash: string }): Promise<SafeTransactionData & { txHash: string; signature: string }> {
    this.ensureInitialized();

    if (!this.signer || !this.safeTxPoolService || !this.safeContract) {
      throw new Error('No signer available or services not initialized.');
    }

    try {
      // Get the Safe transaction hash using the Safe contract
      const safeTxHash = await this.safeContract.getTransactionHash(
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation,
        safeTransaction.safeTxGas,
        safeTransaction.baseGas,
        safeTransaction.gasPrice,
        safeTransaction.gasToken,
        safeTransaction.refundReceiver,
        safeTransaction.nonce
      );

      // Sign the Safe transaction hash
      const signature = await this.signer.signMessage(ethers.utils.arrayify(safeTxHash));

      // Submit signature to SafeTxPool contract
      await this.safeTxPoolService.signTx(safeTransaction.txHash, signature);

      // Return signed transaction with signature
      return {
        ...safeTransaction,
        signature
      };
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Execute a Safe transaction when threshold is met
   */
  async executeTransaction(safeTransaction: SafeTransactionData, signatures: string[]): Promise<ethers.ContractTransaction> {
    this.ensureInitialized();

    if (!this.signer || !this.safeContract) {
      throw new Error('No signer available or Safe contract not initialized.');
    }

    try {
      // Combine signatures into the format expected by Safe
      const combinedSignatures = this.combineSignatures(signatures);

      // Execute the transaction on the Safe contract
      const tx = await this.safeContract.execTransaction(
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation,
        safeTransaction.safeTxGas,
        safeTransaction.baseGas,
        safeTransaction.gasPrice,
        safeTransaction.gasToken,
        safeTransaction.refundReceiver,
        combinedSignatures
      );

      return tx;
    } catch (error) {
      console.error('Error executing transaction:', error);
      throw error;
    }
  }

  /**
   * Combine multiple signatures into the format expected by Safe
   */
  private combineSignatures(signatures: string[]): string {
    // Sort signatures by signer address (Safe requirement)
    // For now, just concatenate them - in production, proper sorting is needed
    return signatures.join('');
  }

  /**
   * Get pending transactions for the Safe from SafeTxPool
   */
  async getPendingTransactions(): Promise<any[]> {
    this.ensureInitialized();

    if (!this.safeTxPoolService) {
      throw new Error('SafeTxPool service not initialized');
    }

    try {
      const pendingTxs = await this.safeTxPoolService.getPendingTransactions(this.config!.safeAddress);

      return pendingTxs.map(tx => ({
        safeTxHash: tx.txHash,
        to: tx.to,
        value: tx.value,
        data: tx.data,
        operation: tx.operation,
        isExecuted: false,
        confirmations: tx.signatures,
        submissionDate: new Date().toISOString(), // SafeTxPool doesn't store submission date
        proposer: tx.proposer,
        nonce: tx.nonce,
        txId: tx.txId
      }));
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  }

  /**
   * Get transaction history for the Safe
   * Note: SafeTxPool only stores pending transactions, executed ones are removed
   */
  async getTransactionHistory(): Promise<any[]> {
    this.ensureInitialized();

    // For now, return empty array since SafeTxPool removes executed transactions
    // In a full implementation, you might want to query blockchain events
    // or maintain a separate history service
    return [];
  }

  /**
   * Check if an address is an owner of the Safe
   */
  async isOwner(address: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.safeContract) {
      throw new Error('Safe contract not initialized');
    }

    try {
      return await this.safeContract.isOwner(address);
    } catch (error) {
      console.error('Error checking owner status:', error);
      return false;
    }
  }

  /**
   * Get the current nonce for the Safe
   */
  async getNonce(): Promise<number> {
    this.ensureInitialized();

    if (!this.safeContract) {
      throw new Error('Safe contract not initialized');
    }

    try {
      const nonce = await this.safeContract.nonce();
      return nonce.toNumber();
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw new Error(`Failed to get Safe nonce: ${error}`);
    }
  }

  /**
   * Get transaction hash for a transaction
   */
  getTransactionHash(safeTransaction: SafeTransactionData & { txHash: string }): string {
    return safeTransaction.txHash;
  }
}

// Singleton instance
export const safeWalletService = new SafeWalletService();
