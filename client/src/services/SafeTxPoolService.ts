import { ethers } from 'ethers';
import { SAFE_TX_POOL_ABI, NETWORK_CONFIGS, isSafeTxPoolConfigured, getSafeTxPoolAddress } from '../contracts/abis';
import { getProviderForNetwork } from '../utils/ens';
import { createSafeContractTransactionHash, SafeTransactionData } from '../utils/eip712';

export interface SafeTxPoolTransaction {
  txHash: string;
  safe: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  proposer: string;
  nonce: number;
  txId: number;
  signatures: string[];
}

export interface ProposeTransactionParams {
  safe: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
}

export class SafeTxPoolService {
  private contract: ethers.Contract | null = null;
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private network: string = 'ethereum';

  constructor(network: string = 'ethereum') {
    this.network = network;
    try {
      this.provider = getProviderForNetwork(network);
      this.initializeContract();
    } catch (error) {
      console.error(`Failed to initialize provider for network ${network}:`, error);
      this.provider = null;
    }
  }

  /**
   * Initialize the SafeTxPool contract
   */
  private initializeContract(): void {
    const networkConfig = NETWORK_CONFIGS[this.network as keyof typeof NETWORK_CONFIGS];
    if (!networkConfig) {
      console.warn(`Network configuration not found for: ${this.network}`);
      return;
    }

    if (!isSafeTxPoolConfigured(this.network)) {
      console.warn(`SafeTxPool contract address not configured for network: ${this.network}. Please set the contract address in environment variables or abis.ts`);
      return;
    }

    if (!this.provider) {
      console.warn(`Provider not available for network: ${this.network}`);
      return;
    }

    const contractAddress = getSafeTxPoolAddress(this.network);
    if (!contractAddress) {
      console.error(`Failed to get SafeTxPool address for network: ${this.network}`);
      return;
    }

    this.contract = new ethers.Contract(
      contractAddress,
      SAFE_TX_POOL_ABI,
      this.provider
    );
  }

  /**
   * Set the signer for write operations
   */
  setSigner(signer: ethers.Signer | null): void {
    this.signer = signer;
    if (this.contract) {
      if (signer) {
        this.contract = this.contract.connect(signer);
      } else {
        // Reconnect to provider for read-only operations
        this.contract = this.contract.connect(this.provider!);
      }
    }
  }

  /**
   * Check if the contract is properly initialized
   */
  isInitialized(): boolean {
    return this.contract !== null;
  }

  /**
   * Get the contract address for the current network
   */
  getContractAddress(): string | null {
    return getSafeTxPoolAddress(this.network);
  }

  /**
   * Check if SafeTxPool is configured for the current network
   */
  isConfigured(): boolean {
    return isSafeTxPoolConfigured(this.network);
  }

  /**
   * Generate EIP-712 transaction hash for Safe transaction
   * This should match the hash used by Safe contracts
   */
  generateTxHash(params: ProposeTransactionParams, chainId: number): string {
    // Create Safe transaction data structure
    const safeTransactionData: SafeTransactionData = {
      to: params.to,
      value: params.value,
      data: params.data,
      operation: params.operation,
      safeTxGas: '0', // Default values for gas parameters
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce: params.nonce
    };

    // Generate EIP-712 domain transaction hash
    return createSafeContractTransactionHash(
      params.safe,
      chainId,
      safeTransactionData
    );
  }

  /**
   * Propose a new Safe transaction to the pool using EIP-712 transaction hash
   */
  async proposeTx(params: ProposeTransactionParams, chainId?: number): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error(`SafeTxPool contract not configured for network: ${this.network}. Please configure the contract address.`);
    }
    if (!this.contract) {
      throw new Error('SafeTxPool contract not initialized. Check network configuration and contract address.');
    }
    if (!this.signer) {
      throw new Error('Signer not set. Call setSigner() first.');
    }

    try {
      // Get chainId if not provided
      let networkChainId = chainId;
      if (!networkChainId && this.provider) {
        const network = await this.provider.getNetwork();
        networkChainId = network.chainId;
      }
      if (!networkChainId) {
        throw new Error('Unable to determine chain ID for EIP-712 hash generation');
      }

      // Generate EIP-712 transaction hash
      const txHash = this.generateTxHash(params, networkChainId);

      // Call the proposeTx function on the contract
      const tx = await this.contract.proposeTx(
        txHash,
        params.safe,
        params.to,
        params.value,
        params.data,
        params.operation,
        params.nonce
      );

      // Wait for transaction confirmation
      await tx.wait();

      return txHash;
    } catch (error) {
      console.error('Error proposing transaction:', error);
      throw new Error(`Failed to propose transaction: ${error}`);
    }
  }

  /**
   * Sign a proposed transaction
   */
  async signTx(txHash: string, signature: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.signTx(txHash, signature);
      await tx.wait();
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Mark a transaction as executed
   */
  async markAsExecuted(txHash: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.markAsExecuted(txHash);
      await tx.wait();
    } catch (error) {
      console.error('Error marking transaction as executed:', error);
      throw new Error(`Failed to mark transaction as executed: ${error}`);
    }
  }

  /**
   * Get transaction details from the pool
   */
  async getTxDetails(txHash: string): Promise<SafeTxPoolTransaction | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await this.contract.getTxDetails(txHash);
      const signatures = await this.contract.getSignatures(txHash);

      return {
        txHash,
        safe: result.safe,
        to: result.to,
        value: result.value.toString(),
        data: result.data,
        operation: result.operation,
        proposer: result.proposer,
        nonce: result.nonce.toNumber(),
        txId: result.txId.toNumber(),
        signatures
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  }

  /**
   * Check if an address has signed a transaction
   */
  async hasSignedTx(txHash: string, signer: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      return await this.contract.hasSignedTx(txHash, signer);
    } catch (error) {
      console.error('Error checking signature status:', error);
      return false;
    }
  }

  /**
   * Get pending transaction hashes for a Safe
   */
  async getPendingTxHashes(safe: string, offset: number = 0, limit: number = 10): Promise<string[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const hashes = await this.contract.getPendingTxHashes(safe, offset, limit);
      return hashes;
    } catch (error) {
      console.error('Error getting pending transactions:', error);
      return [];
    }
  }

  /**
   * Get all pending transactions for a Safe with details
   */
  async getPendingTransactions(safe: string): Promise<SafeTxPoolTransaction[]> {
    try {
      const hashes = await this.getPendingTxHashes(safe, 0, 100); // Get up to 100 transactions
      const transactions: SafeTxPoolTransaction[] = [];

      for (const hash of hashes) {
        const txDetails = await this.getTxDetails(hash);
        if (txDetails) {
          transactions.push(txDetails);
        }
      }

      return transactions;
    } catch (error) {
      console.error('Error getting pending transactions with details:', error);
      return [];
    }
  }

  /**
   * Delete a proposed transaction
   */
  async deleteTx(txHash: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.deleteTx(txHash);
      await tx.wait();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      throw new Error(`Failed to delete transaction: ${error}`);
    }
  }

  /**
   * Listen for transaction events
   */
  onTransactionProposed(callback: (event: any) => void): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('TransactionProposed', callback);
  }

  onTransactionSigned(callback: (event: any) => void): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('TransactionSigned', callback);
  }

  onTransactionExecuted(callback: (event: any) => void): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('TransactionExecuted', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

// Create singleton instances for different networks
export const safeTxPoolService = new SafeTxPoolService();
export const createSafeTxPoolService = (network: string) => new SafeTxPoolService(network);
