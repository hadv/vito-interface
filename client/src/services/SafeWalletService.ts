import { ethers } from 'ethers';
import Safe, { EthersAdapter } from '@safe-global/protocol-kit';
import SafeApiKit from '@safe-global/api-kit';
import { SafeTransactionDataPartial, SafeTransaction } from '@safe-global/types-kit';

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
  transaction: SafeTransaction;
  isExecuted: boolean;
  confirmations: number;
  threshold: number;
}

export class SafeWalletService {
  private safe: Safe | null = null;
  private safeApiKit: SafeApiKit | null = null;
  private ethAdapter: EthersAdapter | null = null;
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private config: SafeWalletConfig | null = null;

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

    // Create EthersAdapter
    this.ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: this.signer || this.provider
    });

    // Initialize Safe instance
    this.safe = await Safe.create({
      ethAdapter: this.ethAdapter,
      safeAddress: config.safeAddress
    });

    // Initialize Safe API Kit for transaction service
    const chainId = await this.provider.getNetwork().then(n => n.chainId);
    this.safeApiKit = new SafeApiKit({
      chainId: BigInt(chainId)
    });
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
    if (!this.safe || !this.safeApiKit || !this.ethAdapter) {
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
   * Create a Safe transaction
   */
  async createTransaction(transactionRequest: TransactionRequest): Promise<SafeTransaction> {
    this.ensureInitialized();

    const safeTransactionData: SafeTransactionDataPartial = {
      to: transactionRequest.to,
      value: transactionRequest.value,
      data: transactionRequest.data || '0x',
      operation: transactionRequest.operation || 0
    };

    const safeTransaction = await this.safe!.createTransaction({
      transactions: [safeTransactionData]
    });

    return safeTransaction;
  }

  /**
   * Sign a Safe transaction
   */
  async signTransaction(safeTransaction: SafeTransaction): Promise<SafeTransaction> {
    this.ensureInitialized();
    
    if (!this.signer) {
      throw new Error('No signer available. Cannot sign transaction.');
    }

    const signedTransaction = await this.safe!.signTransaction(safeTransaction);
    return signedTransaction;
  }

  /**
   * Execute a Safe transaction
   */
  async executeTransaction(safeTransaction: SafeTransaction): Promise<ethers.ContractTransaction> {
    this.ensureInitialized();
    
    if (!this.signer) {
      throw new Error('No signer available. Cannot execute transaction.');
    }

    const executeTxResponse = await this.safe!.executeTransaction(safeTransaction);
    return executeTxResponse;
  }

  /**
   * Get pending transactions for the Safe
   */
  async getPendingTransactions(): Promise<any[]> {
    this.ensureInitialized();

    const pendingTxs = await this.safeApiKit!.getPendingTransactions(this.config!.safeAddress);
    return pendingTxs.results;
  }

  /**
   * Get transaction history for the Safe
   */
  async getTransactionHistory(): Promise<any[]> {
    this.ensureInitialized();

    const allTxs = await this.safeApiKit!.getAllTransactions(this.config!.safeAddress);
    return allTxs.results;
  }

  /**
   * Check if an address is an owner of the Safe
   */
  async isOwner(address: string): Promise<boolean> {
    this.ensureInitialized();

    const owners = await this.safe!.getOwners();
    return owners.includes(address);
  }
}

// Singleton instance
export const safeWalletService = new SafeWalletService();
