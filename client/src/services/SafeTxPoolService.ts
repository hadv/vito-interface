import { ethers } from 'ethers';
import { SAFE_TX_POOL_ABI, SAFE_ABI, NETWORK_CONFIGS, isSafeTxPoolConfigured, getSafeTxPoolAddress } from '../contracts/abis';
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
  signatures: Array<{ signature: string; signer: string }>;
}

export interface AddressBookEntry {
  name: string;
  walletAddress: string;
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
      // Verify signer is properly connected
      const signerAddress = await this.signer.getAddress();
      console.log('SafeTxPoolService: Using signer address:', signerAddress);

      // Get chainId if not provided
      let networkChainId = chainId;
      if (!networkChainId && this.provider) {
        const network = await this.provider.getNetwork();
        networkChainId = network.chainId;
      }
      if (!networkChainId) {
        throw new Error('Unable to determine chain ID for EIP-712 hash generation');
      }

      console.log('SafeTxPoolService: Using chain ID:', networkChainId);

      // Generate EIP-712 transaction hash
      const txHash = this.generateTxHash(params, networkChainId);
      console.log('SafeTxPoolService: Generated transaction hash:', txHash);

      // Call the proposeTx function on the contract
      console.log('SafeTxPoolService: Calling proposeTx with params:', {
        txHash,
        safe: params.safe,
        to: params.to,
        value: params.value,
        data: params.data,
        operation: params.operation,
        nonce: params.nonce
      });

      const tx = await this.contract.proposeTx(
        txHash,
        params.safe,
        params.to,
        params.value,
        params.data,
        params.operation,
        params.nonce
      );

      console.log('SafeTxPoolService: Transaction submitted:', tx.hash);

      // Wait for transaction confirmation
      await tx.wait();
      console.log('SafeTxPoolService: Transaction confirmed');

      return txHash;
    } catch (error: any) {
      console.error('Error proposing transaction:', error);

      // Provide more specific error messages
      if (error.code === 'UNSUPPORTED_OPERATION' && error.operation === 'getAddress') {
        throw new Error('Wallet signer not properly connected. Please ensure your wallet is connected and unlocked.');
      } else if (error.code === 'NETWORK_ERROR') {
        throw new Error('Network connection error. Please check your internet connection and try again.');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds to pay for transaction gas fees.');
      } else if (error.reason) {
        throw new Error(`Transaction failed: ${error.reason}`);
      } else {
        throw new Error(`Failed to propose transaction: ${error.message || error}`);
      }
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
   * Get signers for a transaction by checking Safe owners
   */
  async getTransactionSigners(txHash: string, safeAddress: string): Promise<Array<{ signature: string; signer: string }>> {
    if (!this.contract || !this.provider) {
      throw new Error('Contract or provider not initialized');
    }

    try {
      // Get signatures from contract
      const signatures = await this.contract.getSignatures(txHash);

      // Get Safe owners to check who has signed
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, this.provider);

      const owners = await safeContract.getOwners();
      const signersWithAddresses: Array<{ signature: string; signer: string }> = [];

      // Check each owner to see if they have signed
      let signatureIndex = 0;
      for (const owner of owners) {
        const hasSigned = await this.hasSignedTx(txHash, owner);
        if (hasSigned && signatureIndex < signatures.length) {
          signersWithAddresses.push({
            signature: signatures[signatureIndex],
            signer: owner
          });
          signatureIndex++;
        }
      }

      return signersWithAddresses;
    } catch (error) {
      console.error('Error getting transaction signers:', error);
      return [];
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
      const signaturesWithSigners = await this.getTransactionSigners(txHash, result.safe);

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
        signatures: signaturesWithSigners
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
   * Enable or disable delegate calls for a Safe
   */
  async setDelegateCallEnabled(safe: string, enabled: boolean): Promise<ethers.ContractTransaction> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Signer required for write operations');
    }

    try {
      const tx = await this.contract.setDelegateCallEnabled(safe, enabled);
      return tx;
    } catch (error) {
      console.error('Error setting delegate call enabled:', error);
      throw error;
    }
  }

  /**
   * Add an allowed delegate call target for a Safe
   */
  async addDelegateCallTarget(safe: string, target: string): Promise<ethers.ContractTransaction> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Signer required for write operations');
    }

    try {
      const tx = await this.contract.addDelegateCallTarget(safe, target);
      return tx;
    } catch (error) {
      console.error('Error adding delegate call target:', error);
      throw error;
    }
  }

  /**
   * Remove an allowed delegate call target for a Safe
   */
  async removeDelegateCallTarget(safe: string, target: string): Promise<ethers.ContractTransaction> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!this.signer) {
      throw new Error('Signer required for write operations');
    }

    try {
      const tx = await this.contract.removeDelegateCallTarget(safe, target);
      return tx;
    } catch (error) {
      console.error('Error removing delegate call target:', error);
      throw error;
    }
  }

  /**
   * Check if delegate calls are enabled for a Safe
   */
  async isDelegateCallEnabled(safe: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      return await this.contract.isDelegateCallEnabled(safe);
    } catch (error) {
      console.error('Error checking delegate call enabled:', error);
      return false;
    }
  }

  /**
   * Check if a target is allowed for delegate calls from a Safe
   */
  async isDelegateCallTargetAllowed(safe: string, target: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      return await this.contract.isDelegateCallTargetAllowed(safe, target);
    } catch (error) {
      console.error('Error checking delegate call target allowed:', error);
      return false;
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

  // Address Book Methods

  /**
   * Add an entry to the address book of a Safe
   */
  async addAddressBookEntry(safe: string, walletAddress: string, name: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    if (!walletAddress || walletAddress === ethers.constants.AddressZero) {
      throw new Error('Invalid wallet address');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    try {
      // Convert string name to bytes32
      const nameBytes32 = ethers.utils.formatBytes32String(name.trim().substring(0, 31));

      const tx = await this.contract.addAddressBookEntry(safe, walletAddress, nameBytes32);
      await tx.wait();
    } catch (error) {
      console.error('Error adding address book entry:', error);
      throw new Error(`Failed to add address book entry: ${error}`);
    }
  }

  /**
   * Remove an entry from the address book of a Safe
   */
  async removeAddressBookEntry(safe: string, walletAddress: string): Promise<void> {
    if (!this.contract || !this.signer) {
      throw new Error('Contract not initialized or signer not set');
    }

    try {
      const tx = await this.contract.removeAddressBookEntry(safe, walletAddress);
      await tx.wait();
    } catch (error) {
      console.error('Error removing address book entry:', error);
      throw new Error(`Failed to remove address book entry: ${error}`);
    }
  }

  /**
   * Get all address book entries for a Safe
   */
  async getAddressBookEntries(safe: string): Promise<AddressBookEntry[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const entries = await this.contract.getAddressBookEntries(safe);

      return entries.map((entry: any) => ({
        name: ethers.utils.parseBytes32String(entry.name),
        walletAddress: entry.walletAddress
      }));
    } catch (error) {
      console.error('Error getting address book entries:', error);
      return [];
    }
  }

  /**
   * Listen for address book events
   */
  onAddressBookEntryAdded(callback: (safe: string, walletAddress: string, name: string) => void): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('AddressBookEntryAdded', (safe: string, walletAddress: string, nameBytes32: string) => {
      const name = ethers.utils.parseBytes32String(nameBytes32);
      callback(safe, walletAddress, name);
    });
  }

  onAddressBookEntryRemoved(callback: (safe: string, walletAddress: string) => void): void {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    this.contract.on('AddressBookEntryRemoved', callback);
  }
}

// Create singleton instances for different networks
export const safeTxPoolService = new SafeTxPoolService();
export const createSafeTxPoolService = (network: string) => new SafeTxPoolService(network);
