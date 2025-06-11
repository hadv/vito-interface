import { ethers } from 'ethers';
import { safeTxPoolService, SafeTxPoolService } from './SafeTxPoolService';

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
  transaction: any;
  isExecuted: boolean;
  confirmations: number;
  threshold: number;
}

export class SafeWalletService {
  public safe: any = null;
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
    this.provider = this.getProviderForNetwork(config.network, config.rpcUrl);

    // Use provided signer or create a read-only provider
    if (signer) {
      this.signer = signer;
    }

    // Initialize SafeTxPool service
    this.safeTxPoolService = new SafeTxPoolService(config.network);
    if (this.signer) {
      this.safeTxPoolService.setSigner(this.signer);
    }

    // Get user address for mock data
    const userAddress = signer ? await signer.getAddress() : '0x0000000000000000000000000000000000000000';

    // Mock Safe instance for now
    this.safe = {
      getAddress: () => config.safeAddress,
      getOwners: () => [userAddress],
      getThreshold: () => 1,
      getBalance: () => ethers.utils.parseEther('1.0'),
      getChainId: () => this.provider?.getNetwork().then(n => n.chainId) || 1,
      getTransactionHash: (tx: any) => `0x${Date.now().toString(16)}`,
      createTransaction: (data: any) => ({ data }),
      signTransaction: (tx: any) => tx,
      executeTransaction: (tx: any) => ({ hash: `0x${Date.now().toString(16)}` })
    };
  }

  /**
   * Get provider for different networks
   */
  private getProviderForNetwork(network: string, customRpcUrl?: string): ethers.providers.Provider {
    if (customRpcUrl) {
      return new ethers.providers.JsonRpcProvider(customRpcUrl);
    }

    const INFURA_KEY = process.env.REACT_APP_INFURA_KEY || 'YOUR_INFURA_KEY';
    const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'YOUR_ALCHEMY_KEY';

    switch(network.toLowerCase()) {
      case 'arbitrum':
        return new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
      case 'sepolia':
        return new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`);
      case 'ethereum':
      case 'mainnet':
      default:
        return new ethers.providers.AlchemyProvider('mainnet', ALCHEMY_KEY);
    }
  }

  /**
   * Check if the service is properly initialized
   */
  private ensureInitialized(): void {
    if (!this.safe) {
      throw new Error('SafeWalletService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get Safe information
   */
  async getSafeInfo() {
    this.ensureInitialized();
    
    const safeAddress = await this.safe!.getAddress();
    const owners = await this.safe!.getOwners();
    const threshold = await this.safe!.getThreshold();
    const balance = await this.safe!.getBalance();
    const chainId = await this.safe!.getChainId();

    return {
      address: safeAddress,
      owners,
      threshold,
      balance: ethers.utils.formatEther(balance),
      chainId
    };
  }

  /**
   * Create a Safe transaction and propose it to the SafeTxPool
   */
  async createTransaction(transactionRequest: TransactionRequest): Promise<any> {
    this.ensureInitialized();

    if (!this.safeTxPoolService) {
      throw new Error('SafeTxPool service not initialized');
    }

    try {
      // Get current nonce for the Safe
      const nonce = await this.getNonce();

      // Propose transaction to SafeTxPool contract
      const txHash = await this.safeTxPoolService.proposeTx({
        safe: this.config!.safeAddress,
        to: transactionRequest.to,
        value: transactionRequest.value,
        data: transactionRequest.data || '0x',
        operation: transactionRequest.operation || 0,
        nonce
      });

      // Return transaction data with hash
      return {
        data: {
          to: transactionRequest.to,
          value: transactionRequest.value,
          data: transactionRequest.data || '0x',
          operation: transactionRequest.operation || 0,
          nonce
        },
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
  async signTransaction(safeTransaction: any): Promise<any> {
    this.ensureInitialized();

    if (!this.signer || !this.safeTxPoolService) {
      throw new Error('No signer available or SafeTxPool service not initialized.');
    }

    try {
      // Get transaction hash
      const txHash = safeTransaction.txHash;

      // Sign the transaction hash
      const signature = await this.signer.signMessage(ethers.utils.arrayify(txHash));

      // Submit signature to SafeTxPool contract
      await this.safeTxPoolService.signTx(txHash, signature);

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
   * Execute a Safe transaction
   */
  async executeTransaction(safeTransaction: any): Promise<any> {
    this.ensureInitialized();

    if (!this.signer) {
      throw new Error('No signer available. Cannot execute transaction.');
    }

    const executeTxResponse = await this.safe!.executeTransaction(safeTransaction);
    return executeTxResponse;
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

    const owners = await this.safe!.getOwners();
    return owners.includes(address);
  }

  /**
   * Get the current nonce for the Safe
   */
  async getNonce(): Promise<number> {
    this.ensureInitialized();

    // For mock implementation, return a simple incrementing nonce
    // In a real implementation, this would query the Safe contract
    return Date.now() % 1000000; // Simple mock nonce
  }

  /**
   * Get transaction hash for a transaction
   */
  getTransactionHash(safeTransaction: any): string {
    if (safeTransaction.txHash) {
      return safeTransaction.txHash;
    }

    // Generate hash from transaction data
    if (this.safeTxPoolService) {
      return this.safeTxPoolService.generateTxHash({
        safe: this.config!.safeAddress,
        to: safeTransaction.data.to,
        value: safeTransaction.data.value,
        data: safeTransaction.data.data,
        operation: safeTransaction.data.operation,
        nonce: safeTransaction.data.nonce
      });
    }

    // Fallback to simple hash
    return `0x${Date.now().toString(16)}`;
  }
}

// Singleton instance
export const safeWalletService = new SafeWalletService();
