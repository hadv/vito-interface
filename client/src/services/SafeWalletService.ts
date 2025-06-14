import { ethers } from 'ethers';
import { SafeTxPoolService } from './SafeTxPoolService';
import { OnChainDataService, OnChainTransactionStatus } from './OnChainDataService';
import { SAFE_ABI } from '../contracts/abis';
import { getProviderForNetwork } from '../utils/ens';
import {
  signSafeTransaction,
  createSafeContractTransactionHash,
  SafeDomain,
  combineSignatures
} from '../utils/eip712';

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
  private onChainDataService: OnChainDataService | null = null;

  /**
   * Check if a Safe address is valid on the given network
   */
  static async validateSafeAddress(safeAddress: string, rpcUrl: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!rpcUrl) {
        return {
          isValid: false,
          error: 'RPC URL is required for Safe address validation'
        };
      }

      const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Check if the address has code (is a contract)
      const code = await provider.getCode(safeAddress);
      if (code === '0x') {
        return {
          isValid: false,
          error: `No contract found at address ${safeAddress}. Please verify the Safe address and network.`
        };
      }

      // Try to create a Safe contract and call a simple view function
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, provider);
      await safeContract.getThreshold();

      return { isValid: true };
    } catch (error: any) {
      if (error.code === 'CALL_EXCEPTION') {
        return {
          isValid: false,
          error: `Invalid Safe contract at ${safeAddress}. The contract may not be a Safe wallet or may not be deployed on this network.`
        };
      }

      return {
        isValid: false,
        error: `Failed to validate Safe address: ${error.message}`
      };
    }
  }

  /**
   * Initialize the Safe Wallet Service with validation
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

    // Initialize OnChainData service
    this.onChainDataService = new OnChainDataService(config.network);
  }

  /**
   * Set or update the signer for the Safe Wallet Service
   */
  async setSigner(signer: ethers.Signer | null): Promise<void> {
    this.signer = signer;

    if (this.config && this.provider) {
      // Update Safe contract with new signer
      this.safeContract = new ethers.Contract(
        this.config.safeAddress,
        SAFE_ABI,
        this.signer || this.provider
      );

      // Update SafeTxPool service with new signer
      if (this.safeTxPoolService) {
        this.safeTxPoolService.setSigner(this.signer);
      }
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
   * Validate that the Safe contract exists and is valid
   */
  private async validateSafeContract(): Promise<void> {
    if (!this.safeContract || !this.provider || !this.config) {
      throw new Error('Safe contract or provider not available');
    }

    try {
      // Check if the address has code (is a contract)
      const code = await this.provider.getCode(this.config.safeAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address ${this.config.safeAddress}. Please verify the Safe address and network.`);
      }

      // Try to call a simple view function to verify it's a Safe contract
      await this.safeContract.getThreshold();
    } catch (error: any) {
      if (error.message.includes('No contract found')) {
        throw error;
      }

      // More specific error messages based on the error type
      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Invalid Safe contract at ${this.config.safeAddress}. The contract may not be a Safe wallet or may not be deployed on the ${this.config.network} network.`);
      }

      throw new Error(`Failed to validate Safe contract: ${error.message}`);
    }
  }

  /**
   * Get Safe information with enhanced error handling
   */
  async getSafeInfo() {
    this.ensureInitialized();

    if (!this.safeContract || !this.provider) {
      throw new Error('Safe contract or provider not available');
    }

    try {
      // First validate the Safe contract
      await this.validateSafeContract();

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
    } catch (error: any) {
      console.error('Error getting Safe info:', error);

      // Provide more helpful error messages
      if (error.message.includes('No contract found') || error.message.includes('Invalid Safe contract')) {
        throw error;
      }

      throw new Error(`Failed to get Safe information: ${error.message || error}`);
    }
  }

  /**
   * Step 1: Create domain type EIP-712 transaction
   */
  async createEIP712Transaction(transactionRequest: TransactionRequest): Promise<{
    safeTransactionData: SafeTransactionData;
    domain: SafeDomain;
    txHash: string;
  }> {
    this.ensureInitialized();

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Get current nonce for the Safe
      const nonce = await this.getNonce();

      // Get network info for EIP-712 domain
      const network = await this.provider.getNetwork();
      const domain: SafeDomain = {
        chainId: network.chainId,
        verifyingContract: this.config!.safeAddress
      };

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

      // Generate EIP-712 transaction hash
      const txHash = await this.getEIP712TransactionHash(safeTransactionData);

      return {
        safeTransactionData,
        domain,
        txHash
      };
    } catch (error: any) {
      console.error('Error creating EIP-712 transaction:', error);

      // Provide more helpful error messages
      if (error.message.includes('No contract found') || error.message.includes('Invalid Safe contract')) {
        throw error;
      }

      if (error.message.includes('Cannot get nonce')) {
        throw error;
      }

      throw new Error(`Failed to create EIP-712 transaction: ${error.message || error}`);
    }
  }

  /**
   * Step 2: Request user to sign EIP-712 transaction
   */
  async signEIP712Transaction(
    safeTransactionData: SafeTransactionData,
    domain: SafeDomain
  ): Promise<string> {
    this.ensureInitialized();

    if (!this.signer) {
      throw new Error('No signer available.');
    }

    try {
      // Sign using EIP-712 typed data
      const signature = await signSafeTransaction(this.signer, domain, safeTransactionData);
      return signature;
    } catch (error) {
      console.error('Error signing EIP-712 transaction:', error);
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Step 3: Use signed transaction data to propose transaction on SafeTxPool contract
   */
  async proposeSignedTransaction(
    safeTransactionData: SafeTransactionData,
    txHash: string,
    signature: string
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.safeTxPoolService || !this.provider) {
      throw new Error('SafeTxPool service or provider not initialized');
    }

    try {
      // Get network info
      const network = await this.provider.getNetwork();

      // Propose transaction to SafeTxPool contract
      await this.safeTxPoolService.proposeTx({
        safe: this.config!.safeAddress,
        to: safeTransactionData.to,
        value: safeTransactionData.value,
        data: safeTransactionData.data,
        operation: safeTransactionData.operation,
        nonce: safeTransactionData.nonce
      }, network.chainId);

      // Submit the signature to SafeTxPool
      await this.safeTxPoolService.signTx(txHash, signature);
    } catch (error) {
      console.error('Error proposing signed transaction:', error);
      throw error;
    }
  }

  /**
   * Complete transaction flow: Create EIP-712 → Sign → Propose
   */
  async createTransaction(transactionRequest: TransactionRequest): Promise<SafeTransactionData & { txHash: string; signature: string }> {
    try {
      // Step 1: Create domain type EIP-712 transaction
      const { safeTransactionData, domain, txHash } = await this.createEIP712Transaction(transactionRequest);

      // Step 2: Request user to sign
      const signature = await this.signEIP712Transaction(safeTransactionData, domain);

      // Step 3: Use signed transaction data to propose transaction on SafeTxPool contract
      await this.proposeSignedTransaction(safeTransactionData, txHash, signature);

      return {
        ...safeTransactionData,
        txHash,
        signature
      };
    } catch (error) {
      console.error('Error in complete transaction flow:', error);
      throw error;
    }
  }

  /**
   * Sign a Safe transaction using EIP-712 and submit signature to SafeTxPool
   */
  async signTransaction(safeTransaction: SafeTransactionData & { txHash: string }): Promise<SafeTransactionData & { txHash: string; signature: string }> {
    this.ensureInitialized();

    if (!this.signer || !this.safeTxPoolService || !this.provider) {
      throw new Error('No signer available or services not initialized.');
    }

    try {
      // Get network info for EIP-712 domain
      const network = await this.provider.getNetwork();
      const domain: SafeDomain = {
        chainId: network.chainId,
        verifyingContract: this.config!.safeAddress
      };

      // Sign using EIP-712 typed data
      const signature = await signSafeTransaction(this.signer, domain, safeTransaction);

      // Submit signature to SafeTxPool contract
      await this.safeTxPoolService.signTx(safeTransaction.txHash, signature);

      // Return signed transaction with signature
      return {
        ...safeTransaction,
        signature
      };
    } catch (error) {
      console.error('Error signing Safe transaction with EIP-712:', error);
      throw new Error(`Failed to sign transaction: ${error}`);
    }
  }

  /**
   * Execute a Safe transaction when threshold is met
   */
  async executeTransaction(
    safeTransaction: SafeTransactionData,
    signatures: Array<{ signature: string; signer: string }>
  ): Promise<ethers.ContractTransaction> {
    this.ensureInitialized();

    if (!this.signer || !this.safeContract) {
      throw new Error('No signer available or Safe contract not initialized.');
    }

    try {
      // Combine signatures using EIP-712 utility (properly sorted)
      const combinedSignatures = combineSignatures(signatures);

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
      console.error('Error executing Safe transaction:', error);
      throw new Error(`Failed to execute transaction: ${error}`);
    }
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
   * Get transaction history for the Safe from on-chain data
   */
  async getTransactionHistory(): Promise<any[]> {
    this.ensureInitialized();

    if (!this.onChainDataService || !this.config) {
      console.warn('OnChainDataService not initialized');
      return [];
    }

    try {
      // Get executed transactions from Safe Transaction Service API (faster and more reliable)
      const executedTxs = await this.onChainDataService.getSafeTransactionHistory(
        this.config.safeAddress,
        100, // Limit to last 100 transactions
        0    // Offset
      );

      // Get pending transactions from SafeTxPool, with Safe Transaction Service as fallback
      let pendingTxs = await this.getPendingTransactions();

      // If SafeTxPool returns no results, try Safe Transaction Service
      if (pendingTxs.length === 0) {
        const servicePendingTxs = await this.onChainDataService.getSafePendingTransactions(
          this.config.safeAddress,
          50, // Limit to last 50 pending transactions
          0   // Offset
        );

        // Convert Safe Transaction Service format to our format
        pendingTxs = servicePendingTxs.map(tx => ({
          id: tx.safeTxHash || `pending_${Date.now()}`,
          safeTxHash: tx.safeTxHash,
          from: this.config!.safeAddress,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
          nonce: tx.nonce,
          submissionDate: tx.submissionDate,
          confirmations: tx.confirmations?.length || 0,
          confirmationsRequired: tx.confirmationsRequired || 1,
          proposer: tx.proposer,
          executor: tx.executor,
          gasToken: tx.gasToken,
          safeTxGas: tx.safeTxGas,
          baseGas: tx.baseGas,
          gasPrice: tx.gasPrice,
          refundReceiver: tx.refundReceiver,
          signatures: tx.confirmations?.map((c: any) => c.signature) || []
        }));
      }

      // Combine and format transactions
      const allTransactions = [
        ...executedTxs.map(tx => ({
          id: tx.safeTxHash || tx.transactionHash,
          safeTxHash: tx.safeTxHash,
          executionTxHash: tx.transactionHash || undefined,
          from: this.config!.safeAddress,
          to: tx.to,
          value: tx.value,
          data: tx.data,
          operation: tx.operation,
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
          nonce: tx.nonce,
          executor: tx.executor,
          blockNumber: tx.blockNumber,
          timestamp: tx.timestamp,
          status: 'executed',
          isExecuted: true,
          confirmations: 999, // Executed transactions are fully confirmed
        })),
        ...pendingTxs.map(tx => ({
          ...tx,
          status: 'pending',
          isExecuted: false,
        }))
      ];

      // Sort by timestamp (newest first)
      return allTransactions.sort((a, b) => {
        const aTime = a.timestamp || a.submissionDate ? new Date(a.submissionDate).getTime() : 0;
        const bTime = b.timestamp || b.submissionDate ? new Date(b.submissionDate).getTime() : 0;
        return bTime - aTime;
      });
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
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
   * Get the current nonce for the Safe with enhanced error handling
   */
  async getNonce(): Promise<number> {
    this.ensureInitialized();

    if (!this.safeContract) {
      throw new Error('Safe contract not initialized');
    }

    try {
      // First validate the Safe contract
      await this.validateSafeContract();

      const nonce = await this.safeContract.nonce();
      return nonce.toNumber();
    } catch (error: any) {
      console.error('Error getting nonce:', error);

      // Provide more specific error messages
      if (error.message.includes('No contract found') || error.message.includes('Invalid Safe contract')) {
        throw error;
      }

      if (error.code === 'CALL_EXCEPTION') {
        throw new Error(`Cannot get nonce from Safe contract at ${this.config!.safeAddress}. Please verify this is a valid Safe wallet address on the ${this.config!.network} network.`);
      }

      if (error.message.includes('network')) {
        throw new Error(`Network error while getting Safe nonce. Please check your internet connection and try again.`);
      }

      throw new Error(`Failed to get Safe nonce: ${error.message || error}`);
    }
  }

  /**
   * Get transaction hash for a transaction
   */
  getTransactionHash(safeTransaction: SafeTransactionData & { txHash: string }): string {
    return safeTransaction.txHash;
  }

  /**
   * Get transaction status from on-chain data
   */
  async getTransactionStatus(safeTxHash: string): Promise<OnChainTransactionStatus> {
    this.ensureInitialized();

    if (!this.onChainDataService || !this.safeTxPoolService) {
      throw new Error('Services not initialized');
    }

    try {
      // First check if transaction exists in SafeTxPool (pending)
      const pendingTxs = await this.safeTxPoolService.getPendingTransactions(this.config!.safeAddress);
      const pendingTx = pendingTxs.find(tx => tx.txHash === safeTxHash);

      if (pendingTx) {
        // Transaction is still pending
        const safeInfo = await this.getSafeInfo();
        const hasEnoughSignatures = pendingTx.signatures.length >= safeInfo.threshold;

        return {
          status: hasEnoughSignatures ? 'confirmed' : 'pending',
          confirmations: pendingTx.signatures.length,
          blockNumber: undefined,
          gasUsed: undefined,
          gasPrice: undefined,
          executionTxHash: undefined
        };
      }

      // Check if transaction was executed on-chain
      const executedTxs = await this.onChainDataService.getSafeTransactionHistory(
        this.config!.safeAddress,
        100,
        0
      );

      const executedTx = executedTxs.find(tx => tx.safeTxHash === safeTxHash);
      if (executedTx) {
        return {
          status: 'executed',
          confirmations: 999, // Executed transactions are fully confirmed
          blockNumber: executedTx.blockNumber,
          gasUsed: executedTx.gasUsed,
          gasPrice: executedTx.gasPrice,
          executionTxHash: executedTx.transactionHash || undefined,
          timestamp: executedTx.timestamp
        };
      }

      // Transaction not found
      return {
        status: 'pending',
        confirmations: 0
      };
    } catch (error) {
      console.error('Error getting transaction status:', error);
      return {
        status: 'pending',
        confirmations: 0
      };
    }
  }

  /**
   * Check if transaction can be executed (has enough confirmations)
   */
  async canExecuteTransaction(safeTxHash: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.safeTxPoolService) {
      return false;
    }

    try {
      const status = await this.getTransactionStatus(safeTxHash);
      return status.status === 'confirmed';
    } catch (error) {
      console.error('Error checking if transaction can be executed:', error);
      return false;
    }
  }

  /**
   * Get EIP-712 transaction hash for Safe transaction
   */
  async getEIP712TransactionHash(safeTransaction: SafeTransactionData): Promise<string> {
    this.ensureInitialized();

    if (!this.provider) {
      throw new Error('Provider not available');
    }

    try {
      const network = await this.provider.getNetwork();
      return createSafeContractTransactionHash(
        this.config!.safeAddress,
        network.chainId,
        safeTransaction
      );
    } catch (error) {
      console.error('Error creating EIP-712 transaction hash:', error);
      throw new Error(`Failed to create transaction hash: ${error}`);
    }
  }
}

// Singleton instance
export const safeWalletService = new SafeWalletService();
