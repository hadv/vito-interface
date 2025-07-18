import { ethers } from 'ethers';
import {
  SAFE_TX_POOL_REGISTRY_ABI,
  SAFE_TX_POOL_ABI,
  getSafeTxPoolRegistryAddress,
  getSafeTxPoolAddress,
  isSafeTxPoolRegistryConfigured
} from '../contracts/abis';

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

export class SafeTransactionService {
  private provider: ethers.providers.Provider | null = null;
  private signer: ethers.Signer | null = null;
  private safeTxPoolRegistryAddress: string | null;
  private safeTxPoolAddress: string | null;
  private network: string;
  private useRegistry: boolean;

  constructor(network: string = 'ethereum') {
    this.network = network;
    // Get SafeTxPool Registry address from configuration (preferred)
    this.safeTxPoolRegistryAddress = getSafeTxPoolRegistryAddress(network);
    // Get SafeTxPool address from configuration (legacy fallback)
    this.safeTxPoolAddress = getSafeTxPoolAddress(network);
    // Prefer registry if available, fallback to legacy
    this.useRegistry = isSafeTxPoolRegistryConfigured(network);

    if (!this.safeTxPoolRegistryAddress && !this.safeTxPoolAddress) {
      console.warn(`Neither SafeTxPoolRegistry nor SafeTxPool address configured for network: ${network}. Please configure the contract addresses.`);
    } else if (this.useRegistry) {
      console.log(`Using SafeTxPoolRegistry for network: ${network}`);
    } else {
      console.log(`Using legacy SafeTxPool for network: ${network}`);
    }
  }

  /**
   * Initialize the service with provider and signer
   */
  initialize(provider: ethers.providers.Provider, signer?: ethers.Signer): void {
    this.provider = provider;
    this.signer = signer || null;
  }

  /**
   * Set the signer for transactions
   */
  setSigner(signer: ethers.Signer | null): void {
    this.signer = signer;
  }

  /**
   * Get the appropriate contract address and ABI
   */
  private getContractConfig(): { address: string | null; abi: any[] } {
    if (this.useRegistry && this.safeTxPoolRegistryAddress) {
      return { address: this.safeTxPoolRegistryAddress, abi: SAFE_TX_POOL_REGISTRY_ABI };
    } else {
      return { address: this.safeTxPoolAddress, abi: SAFE_TX_POOL_ABI };
    }
  }

  /**
   * Create transaction data for adding an address book entry
   */
  createAddAddressBookEntryTxData(safe: string, walletAddress: string, name: string): string {
    if (!walletAddress || walletAddress === ethers.constants.AddressZero) {
      throw new Error('Invalid wallet address');
    }

    if (!name || name.trim().length === 0) {
      throw new Error('Name is required');
    }

    // Create contract interface using appropriate ABI
    const { abi } = this.getContractConfig();
    const contractInterface = new ethers.utils.Interface(abi);
    
    // Convert string name to bytes32
    const nameBytes32 = ethers.utils.formatBytes32String(name.trim().substring(0, 31));

    // Encode function call
    const data = contractInterface.encodeFunctionData('addAddressBookEntry', [
      safe,
      walletAddress,
      nameBytes32
    ]);

    return data;
  }

  /**
   * Create transaction data for removing an address book entry
   */
  createRemoveAddressBookEntryTxData(safe: string, walletAddress: string): string {
    if (!walletAddress || walletAddress === ethers.constants.AddressZero) {
      throw new Error('Invalid wallet address');
    }

    // Create contract interface using appropriate ABI
    const { abi } = this.getContractConfig();
    const contractInterface = new ethers.utils.Interface(abi);

    // Encode function call
    const data = contractInterface.encodeFunctionData('removeAddressBookEntry', [
      safe,
      walletAddress
    ]);

    return data;
  }

  /**
   * Create a Safe transaction for adding an address book entry
   */
  async createAddAddressBookEntryTransaction(
    safeAddress: string,
    walletAddress: string,
    name: string,
    nonce: number
  ): Promise<SafeTransactionData> {
    const { address } = this.getContractConfig();
    if (!address) {
      throw new Error(`Neither SafeTxPoolRegistry nor SafeTxPool address configured for network: ${this.network}. Please configure the contract addresses in environment variables.`);
    }

    const data = this.createAddAddressBookEntryTxData(safeAddress, walletAddress, name);

    return {
      to: address,
      value: '0',
      data,
      operation: 0, // CALL operation
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce
    };
  }

  /**
   * Create a Safe transaction for removing an address book entry
   */
  async createRemoveAddressBookEntryTransaction(
    safeAddress: string,
    walletAddress: string,
    nonce: number
  ): Promise<SafeTransactionData> {
    const { address } = this.getContractConfig();
    if (!address) {
      throw new Error(`Neither SafeTxPoolRegistry nor SafeTxPool address configured for network: ${this.network}. Please configure the contract addresses in environment variables.`);
    }

    const data = this.createRemoveAddressBookEntryTxData(safeAddress, walletAddress);

    return {
      to: address,
      value: '0',
      data,
      operation: 0, // CALL operation
      safeTxGas: '0',
      baseGas: '0',
      gasPrice: '0',
      gasToken: ethers.constants.AddressZero,
      refundReceiver: ethers.constants.AddressZero,
      nonce
    };
  }

  /**
   * Get the next nonce for a Safe
   */
  async getSafeNonce(safeAddress: string): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Simple Safe ABI for getting nonce
      const safeABI = [
        'function nonce() external view returns (uint256)'
      ];

      const safeContract = new ethers.Contract(safeAddress, safeABI, this.provider);
      const nonce = await safeContract.nonce();
      return nonce.toNumber();
    } catch (error) {
      console.error('Error getting Safe nonce:', error);
      throw new Error(`Failed to get Safe nonce: ${error}`);
    }
  }

  /**
   * Create the transaction hash for a Safe transaction
   */
  createTransactionHash(
    safeAddress: string,
    txData: SafeTransactionData,
    chainId: number
  ): string {
    // Create the EIP-712 domain
    const domain = {
      chainId,
      verifyingContract: safeAddress
    };

    // Create the transaction type
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

    // Create the transaction data
    const transaction = {
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
    };

    // Create the hash
    return ethers.utils._TypedDataEncoder.hash(domain, types, transaction);
  }
}

// Create singleton instances for different networks
export const safeTransactionService = new SafeTransactionService();
export const createSafeTransactionService = (network: string) => new SafeTransactionService(network);
