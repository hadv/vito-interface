import { ethers } from 'ethers';
import { SafeTxPoolService } from './SafeTxPoolService';
import { OnChainDataService, OnChainTransactionStatus } from './OnChainDataService';
import { SAFE_ABI, getRpcUrl } from '../contracts/abis';
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

    // Set up provider based on network - always use working RPC configuration
    let actualRpcUrl: string;
    if (config.rpcUrl) {
      actualRpcUrl = config.rpcUrl;
      this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
    } else {
      // Use the same RPC URL logic as validation for consistency
      actualRpcUrl = getRpcUrl(config.network);
      this.provider = new ethers.providers.JsonRpcProvider(actualRpcUrl);
    }

    console.log(`🌐 SafeWalletService initialized with RPC: ${actualRpcUrl} for network: ${config.network}`);

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
   * Reinitialize provider with working RPC URL
   */
  private async reinitializeProvider(): Promise<void> {
    if (!this.config) {
      throw new Error('No configuration available for provider reinitialization');
    }

    console.log(`🔄 Reinitializing provider for network: ${this.config.network}`);

    // Use the same RPC URL logic as static validation
    const workingRpcUrl = getRpcUrl(this.config.network);
    console.log(`🌐 Using working RPC URL: ${workingRpcUrl}`);

    // Create new provider
    this.provider = new ethers.providers.JsonRpcProvider(workingRpcUrl);

    // Recreate Safe contract with new provider
    this.safeContract = new ethers.Contract(
      this.config.safeAddress,
      SAFE_ABI,
      this.signer || this.provider
    );

    console.log(`✅ Provider reinitialized successfully`);
  }

  /**
   * Check Safe contract interface compatibility
   */
  private async checkSafeInterface(): Promise<{ version?: string; hasNonce: boolean; hasGetThreshold: boolean }> {
    if (!this.provider || !this.config) {
      throw new Error('Provider or config not available');
    }

    const result = {
      version: undefined as string | undefined,
      hasNonce: false,
      hasGetThreshold: false
    };

    try {
      const contract = new ethers.Contract(this.config.safeAddress, SAFE_ABI, this.provider);

      // Check if getThreshold exists
      try {
        await contract.getThreshold();
        result.hasGetThreshold = true;
        console.log('✅ getThreshold() method available');
      } catch (error) {
        console.log('❌ getThreshold() method not available');
      }

      // Check if nonce exists
      try {
        await contract.nonce();
        result.hasNonce = true;
        console.log('✅ nonce() method available');
      } catch (error) {
        console.log('❌ nonce() method not available');
      }

      // Try to get version if available
      try {
        const version = await contract.VERSION();
        result.version = version;
        console.log(`✅ Safe version: ${version}`);
      } catch (error) {
        console.log('❌ VERSION() method not available');
      }

    } catch (error) {
      console.error('Error checking Safe interface:', error);
    }

    return result;
  }

  /**
   * Validate that the Safe contract exists and is valid
   */
  private async validateSafeContract(): Promise<void> {
    if (!this.safeContract || !this.provider || !this.config) {
      throw new Error('Safe contract or provider not available');
    }

    try {
      console.log(`🔍 Validating Safe contract at ${this.config.safeAddress} on ${this.config.network}`);

      // Get the actual RPC URL being used
      const providerUrl = (this.provider as any).connection?.url || 'unknown';
      console.log(`🌐 Using provider URL: ${providerUrl}`);

      // Check if the address has code (is a contract)
      const code = await this.provider.getCode(this.config.safeAddress);
      console.log(`📄 Contract code length: ${code.length} characters`);

      if (code === '0x') {
        throw new Error(`No contract found at address ${this.config.safeAddress}. Please verify the Safe address and network.`);
      }

      // Try to call a simple view function to verify it's a Safe contract
      console.log(`🔧 Testing Safe contract interface with provider...`);

      // Check interface compatibility first
      const interfaceCheck = await this.checkSafeInterface();
      console.log(`🔍 Interface check results:`, interfaceCheck);

      if (!interfaceCheck.hasGetThreshold) {
        throw new Error(`Contract at ${this.config.safeAddress} does not implement Safe interface (missing getThreshold method)`);
      }

      // Create a fresh contract instance with the current provider to ensure consistency
      const testContract = new ethers.Contract(this.config.safeAddress, SAFE_ABI, this.provider);
      const threshold = await testContract.getThreshold();
      console.log(`✅ Safe validation successful! Threshold: ${threshold.toString()}`);

      if (!interfaceCheck.hasNonce) {
        console.warn(`⚠️ Warning: Safe contract does not have nonce() method. This may cause transaction issues.`);
      }
    } catch (error: any) {
      console.error(`❌ Safe validation failed:`, error);
      console.error(`❌ Provider details:`, {
        providerUrl: (this.provider as any).connection?.url,
        network: this.config.network,
        safeAddress: this.config.safeAddress
      });

      if (error.message.includes('No contract found')) {
        throw error;
      }

      if (error.message.includes('does not implement Safe interface')) {
        throw error;
      }

      // More specific error messages based on the error type
      if (error.code === 'CALL_EXCEPTION') {
        // Try to use the static validation method as a fallback to compare results
        console.log(`🔄 Trying static validation as fallback...`);
        try {
          const rpcUrl = getRpcUrl(this.config.network);
          const staticValidation = await SafeWalletService.validateSafeAddress(this.config.safeAddress, rpcUrl);
          if (staticValidation.isValid) {
            console.log(`✅ Static validation passed, but instance validation failed. Provider mismatch detected.`);
            throw new Error(`Provider configuration mismatch. Static validation works but instance validation fails. Please reconnect your wallet.`);
          } else {
            console.log(`❌ Static validation also failed: ${staticValidation.error}`);
          }
        } catch (staticError) {
          console.error(`❌ Static validation error:`, staticError);
        }

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
   * Get enhanced Safe information including version and nonce
   */
  async getEnhancedSafeInfo() {
    this.ensureInitialized();

    if (!this.safeContract || !this.provider) {
      throw new Error('Safe contract or provider not available');
    }

    try {
      // First validate the Safe contract
      await this.validateSafeContract();

      // Get basic Safe info
      const [owners, threshold, balance, network] = await Promise.all([
        this.safeContract.getOwners(),
        this.safeContract.getThreshold(),
        this.provider.getBalance(this.config!.safeAddress),
        this.provider.getNetwork()
      ]);

      // Get nonce
      let nonce: number;
      try {
        nonce = await this.getNonce();
      } catch (error) {
        console.warn('Could not get Safe nonce:', error);
        nonce = 0;
      }

      // Get version
      let version: string | undefined;
      try {
        version = await this.safeContract.VERSION();
        console.log(`✅ Safe version: ${version}`);
      } catch (error) {
        console.warn('Could not get Safe version:', error);
        version = undefined;
      }

      return {
        address: this.config!.safeAddress,
        owners,
        threshold: threshold.toNumber(),
        balance: ethers.utils.formatEther(balance),
        chainId: network.chainId,
        nonce,
        version
      };
    } catch (error: any) {
      console.error('Error getting enhanced Safe info:', error);

      // Provide more helpful error messages
      if (error.message.includes('No contract found') || error.message.includes('Invalid Safe contract')) {
        throw error;
      }

      throw new Error(`Failed to get enhanced Safe information: ${error.message || error}`);
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
    console.log('🔐 SAFE WALLET SERVICE: createEIP712Transaction called');
    console.log('📋 Transaction request:', transactionRequest);

    this.ensureInitialized();

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      // Get current nonce for the Safe
      console.log('🔐 SAFE WALLET SERVICE: Getting Safe nonce...');
      const nonce = await this.getNonce();
      console.log('🔐 SAFE WALLET SERVICE: Got nonce:', nonce);

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

      console.log('🔐 SAFE WALLET SERVICE: EIP-712 transaction created successfully');
      console.log('📋 Safe transaction data:', safeTransactionData);
      console.log('📋 Domain:', domain);
      console.log('📋 Transaction hash:', txHash);

      const result = {
        safeTransactionData,
        domain,
        txHash
      };

      console.log('🔐 SAFE WALLET SERVICE: Returning result to TransactionModal');
      return result;
    } catch (error: any) {
      console.error('❌ SAFE WALLET SERVICE: Error creating EIP-712 transaction:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

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
   * Step 2: Request user to sign EIP-712 transaction with enhanced error handling
   */
  async signEIP712Transaction(
    safeTransactionData: SafeTransactionData,
    domain: SafeDomain
  ): Promise<string> {
    console.log('🔐 SAFE WALLET SERVICE: signEIP712Transaction called');
    console.log('📋 Transaction data:', safeTransactionData);
    console.log('📋 Domain:', domain);
    console.log('📋 Signer available:', !!this.signer);

    this.ensureInitialized();

    if (!this.signer) {
      throw new Error('No signer available. Please connect your wallet first.');
    }

    try {
      console.log('🔐 Starting EIP-712 transaction signing...');

      // Get signer address with timeout
      try {
        console.log('🔐 Getting signer address...');
        const addressPromise = this.signer.getAddress();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getAddress timeout')), 5000) // 5 second timeout
        );
        const signerAddress = await Promise.race([addressPromise, timeoutPromise]);
        console.log('📋 Signer address:', signerAddress);
      } catch (error: any) {
        console.error('❌ Failed to get signer address:', error.message);
        console.log('⚠️ Proceeding without signer address...');
      }

      console.log('📋 Domain:', domain);
      console.log('📋 Transaction data:', safeTransactionData);

      // Skip network validation to avoid WalletConnect hanging issues
      console.log('🔐 SAFE WALLET SERVICE: Skipping network validation (known to hang with WalletConnect)');
      console.log('🔐 Expected chainId:', domain.chainId);
      console.log('⚠️ Proceeding directly to EIP-712 signing...');

      // Sign using EIP-712 typed data
      console.log('🔐 SAFE WALLET SERVICE: About to call signSafeTransaction');
      console.log('📱 MOBILE WALLET: This should trigger EIP-712 signing now!');
      console.log('🔐 SAFE WALLET SERVICE: Calling signSafeTransaction with:', {
        signer: !!this.signer,
        domain,
        safeTransactionData
      });

      const signature = await signSafeTransaction(this.signer, domain, safeTransactionData);

      console.log('🔐 SAFE WALLET SERVICE: signSafeTransaction completed');
      console.log('📋 Received signature:', signature);

      console.log('✅ EIP-712 transaction signed successfully');
      console.log('📋 Signature:', signature);

      return signature;
    } catch (error: any) {
      console.error('❌ Error signing EIP-712 transaction:', error);

      // Extract meaningful error message
      const errorMessage = error?.message || error?.reason || error?.data?.message || 'Unknown signing error';

      // Provide user-friendly error messages
      if (errorMessage.includes('rejected') || errorMessage.includes('denied')) {
        throw new Error('Transaction signing was rejected by user');
      }

      if (errorMessage.includes('unsupported')) {
        throw new Error('EIP-712 signing not supported by your wallet. Please try a different wallet or update your current wallet.');
      }

      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        throw new Error('Network error during signing. Please check your connection and try again.');
      }

      if (errorMessage.includes('No signer available')) {
        throw new Error('Wallet not connected. Please connect your wallet and try again.');
      }

      throw new Error(`Failed to sign transaction: ${errorMessage}`);
    }
  }

  /**
   * Propose transaction without signature (for separated flows)
   */
  async proposeUnsignedTransaction(
    safeTransactionData: SafeTransactionData,
    txHash: string
  ): Promise<void> {
    this.ensureInitialized();

    if (!this.safeTxPoolService || !this.provider) {
      throw new Error('SafeTxPool service or provider not initialized');
    }

    try {
      // Get network info
      const network = await this.provider.getNetwork();

      // Propose transaction to SafeTxPool contract without signatures
      await this.safeTxPoolService.proposeTx({
        safe: this.config!.safeAddress,
        to: safeTransactionData.to,
        value: safeTransactionData.value,
        data: safeTransactionData.data,
        operation: safeTransactionData.operation,
        nonce: safeTransactionData.nonce
      }, network.chainId);

      console.log('✅ Transaction proposed successfully to SafeTxPool');
    } catch (error) {
      console.error('❌ Error proposing transaction to SafeTxPool:', error);
      throw error;
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
   * Sign an existing pending transaction from SafeTxPool
   */
  async signExistingTransaction(transactionData: {
    txHash: string;
    to: string;
    value: string;
    data: string;
    operation: number;
    nonce: number;
  }): Promise<void> {
    this.ensureInitialized();

    if (!this.signer || !this.provider || !this.safeTxPoolService) {
      throw new Error('Signer, provider, or SafeTxPool service not available');
    }

    try {
      // Get network info for EIP-712 domain
      const network = await this.provider.getNetwork();
      const domain: SafeDomain = {
        chainId: network.chainId,
        verifyingContract: this.config!.safeAddress
      };

      // Create Safe transaction data structure for signing
      const safeTransactionData: SafeTransactionData = {
        to: transactionData.to,
        value: transactionData.value,
        data: transactionData.data,
        operation: transactionData.operation,
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: ethers.constants.AddressZero,
        refundReceiver: ethers.constants.AddressZero,
        nonce: transactionData.nonce
      };

      // Sign using EIP-712 typed data
      const signature = await signSafeTransaction(this.signer, domain, safeTransactionData);

      // Submit signature to SafeTxPool contract using the provided txHash
      await this.safeTxPoolService.signTx(transactionData.txHash, signature);
    } catch (error) {
      console.error('Error signing existing transaction:', error);
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

      console.log('🚀 EXECUTING SAFE TRANSACTION');
      console.log('📱 Mobile wallet execution - ensuring proper gas estimation');

      // Check if we're dealing with WalletConnect or mobile wallet
      const isMobileWallet = await this.detectMobileWallet();
      const isWalletConnect = this.isWalletConnect();
      console.log('📱 Wallet type detected:', { isMobileWallet, isWalletConnect });

      let tx: ethers.ContractTransaction;

      if (isWalletConnect) {
        console.log('🔗 WALLETCONNECT: Using WalletConnect-specific execution method');
        tx = await this.executeTransactionViaWalletConnect(
          safeTransaction,
          combinedSignatures
        );
      } else {
        // Standard execution for browser extensions and other wallets
        console.log('🌐 STANDARD: Using standard contract execution');

        // Prepare transaction options with proper gas estimation for mobile wallets
        let txOptions: any = {};

        if (isMobileWallet) {
          console.log('📱 MOBILE WALLET: Adding explicit gas estimation');

          try {
            // Estimate gas for mobile wallets
            const gasEstimate = await this.safeContract.estimateGas.execTransaction(
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

            // Add 20% buffer for mobile wallets (they're more sensitive to gas issues)
            const gasLimit = gasEstimate.mul(120).div(100);

            // Get current gas price
            const gasPrice = await this.provider!.getGasPrice();

            txOptions = {
              gasLimit,
              gasPrice: gasPrice.mul(110).div(100) // 10% higher gas price for mobile
            };

            console.log('📱 MOBILE WALLET: Gas estimation completed', {
              gasEstimate: gasEstimate.toString(),
              gasLimit: gasLimit.toString(),
              gasPrice: gasPrice.toString()
            });
          } catch (gasError) {
            console.warn('📱 MOBILE WALLET: Gas estimation failed, using defaults:', gasError);
            // Fallback to higher default gas for mobile wallets
            txOptions = {
              gasLimit: 500000, // Higher default for mobile
              gasPrice: await this.provider!.getGasPrice()
            };
          }
        }

        // Execute the transaction on the Safe contract
        console.log('🚀 Executing Safe transaction with options:', txOptions);
        tx = await this.safeContract.execTransaction(
          safeTransaction.to,
          safeTransaction.value,
          safeTransaction.data,
          safeTransaction.operation,
          safeTransaction.safeTxGas,
          safeTransaction.baseGas,
          safeTransaction.gasPrice,
          safeTransaction.gasToken,
          safeTransaction.refundReceiver,
          combinedSignatures,
          txOptions
        );
      }

      console.log('✅ Safe transaction executed successfully:', tx.hash);
      return tx;
    } catch (error: any) {
      console.error('❌ Error executing Safe transaction:', error);

      // Provide more specific error messages for mobile wallets
      if (error.message?.includes('gas') || error.message?.includes('Gas')) {
        throw new Error(`Transaction failed due to gas estimation issues. This is common with mobile wallets. Please try again or use a browser extension. Details: ${error.message}`);
      }

      if (error.message?.includes('user rejected') || error.message?.includes('User rejected')) {
        throw new Error('Transaction was cancelled by user');
      }

      throw new Error(`Failed to execute transaction: ${error.message || error}`);
    }
  }

  /**
   * Detect if we're dealing with a mobile wallet or WalletConnect
   */
  private async detectMobileWallet(): Promise<boolean> {
    try {
      // Check if we're in a mobile environment
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      // Check if the signer is from a mobile wallet or WalletConnect
      const provider = this.signer!.provider as any;
      const isWalletConnect = provider && provider.isWalletConnect;
      const isMobileProvider = provider && (
        (provider.isMetaMask && isMobile) ||
        provider.isWalletConnect ||
        (provider.isCoinbaseWallet && isMobile) ||
        provider.isTrust ||
        provider.isImToken ||
        provider.isUniswap // Uniswap Wallet
      );

      console.log('🔍 Wallet detection:', {
        isMobile,
        isWalletConnect,
        isMobileProvider,
        providerType: provider?.constructor?.name
      });

      return isMobile || !!isMobileProvider || !!isWalletConnect;
    } catch (error) {
      console.warn('Could not detect mobile wallet, assuming desktop:', error);
      return false;
    }
  }

  /**
   * Detect if we're using WalletConnect specifically
   */
  private isWalletConnect(): boolean {
    try {
      const provider = this.signer?.provider as any;
      return !!(provider && provider.isWalletConnect);
    } catch (error) {
      return false;
    }
  }

  /**
   * Detect if we're using Uniswap Wallet specifically
   */
  private isUniswapWallet(): boolean {
    try {
      const provider = this.signer?.provider as any;

      // Check for Uniswap Wallet specific properties
      const isUniswap = provider && (
        provider.isUniswap ||
        provider.isUniswapWallet ||
        (provider.session && provider.session.peer &&
         provider.session.peer.metadata &&
         provider.session.peer.metadata.name?.toLowerCase().includes('uniswap'))
      );

      return !!isUniswap;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute Safe transaction via WalletConnect using eth_sendTransaction
   * This is required for wallets like Uniswap Wallet that connect via WalletConnect
   */
  private async executeTransactionViaWalletConnect(
    safeTransaction: SafeTransactionData,
    combinedSignatures: string
  ): Promise<ethers.ContractTransaction> {
    console.log('🔗 WALLETCONNECT: Preparing transaction for WalletConnect execution');

    // Check if this is specifically Uniswap Wallet
    const isUniswapWallet = this.isUniswapWallet();
    console.log('🦄 UNISWAP WALLET detected:', isUniswapWallet);

    try {
      // Encode the execTransaction call data
      const safeInterface = new ethers.utils.Interface(SAFE_ABI);
      const txData = safeInterface.encodeFunctionData('execTransaction', [
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
      ]);

      console.log('🔗 WALLETCONNECT: Encoded transaction data:', {
        to: this.config!.safeAddress,
        data: txData.slice(0, 50) + '...',
        dataLength: txData.length
      });

      // Estimate gas for WalletConnect transaction with multiple fallback strategies
      let gasLimit: ethers.BigNumber;
      const signerAddress = await this.signer!.getAddress();

      console.log('🔗 WALLETCONNECT: Starting gas estimation for Uniswap Wallet...');

      // Strategy 1: Try direct gas estimation
      try {
        console.log('🔗 Strategy 1: Direct gas estimation...');
        gasLimit = await this.provider!.estimateGas({
          to: this.config!.safeAddress,
          data: txData,
          from: signerAddress
        });

        // Add 50% buffer for Uniswap Wallet (they need even more gas)
        gasLimit = gasLimit.mul(150).div(100);
        console.log('✅ WALLETCONNECT: Gas estimated (Strategy 1):', gasLimit.toString());
      } catch (gasError1) {
        console.warn('❌ Strategy 1 failed:', gasError1);

        // Strategy 2: Try with a static provider (bypass WalletConnect for estimation)
        try {
          console.log('🔗 Strategy 2: Using static provider for gas estimation...');
          const staticProvider = new ethers.providers.JsonRpcProvider(getRpcUrl(this.config!.network));
          gasLimit = await staticProvider.estimateGas({
            to: this.config!.safeAddress,
            data: txData,
            from: signerAddress
          });

          // Add 60% buffer for Uniswap Wallet with static estimation
          gasLimit = gasLimit.mul(160).div(100);
          console.log('✅ WALLETCONNECT: Gas estimated (Strategy 2):', gasLimit.toString());
        } catch (gasError2) {
          console.warn('❌ Strategy 2 failed:', gasError2);

          // Strategy 3: Use Safe-specific gas calculation
          try {
            console.log('🔗 Strategy 3: Safe-specific gas calculation...');
            // Base gas for Safe execution + transaction-specific gas
            const baseGas = 21000; // Base transaction gas
            const safeOverhead = 50000; // Safe contract overhead
            const dataGas = Math.ceil(txData.length / 2) * 16; // Gas for calldata
            const calculatedGas = baseGas + safeOverhead + dataGas;

            gasLimit = ethers.BigNumber.from(calculatedGas.toString()).mul(200).div(100); // 100% buffer
            console.log('✅ WALLETCONNECT: Gas calculated (Strategy 3):', gasLimit.toString());
          } catch (gasError3) {
            console.warn('❌ Strategy 3 failed:', gasError3);

            // Strategy 4: Uniswap Wallet optimized defaults
            console.log('🔗 Strategy 4: Uniswap Wallet optimized defaults...');
            if (isUniswapWallet) {
              gasLimit = ethers.BigNumber.from('1200000'); // 1.2M gas specifically for Uniswap Wallet
              console.log('🦄 UNISWAP WALLET: Using optimized gas limit:', gasLimit.toString());
            } else {
              gasLimit = ethers.BigNumber.from('800000'); // 800k for other WalletConnect wallets
              console.log('✅ WALLETCONNECT: Using default WalletConnect gas:', gasLimit.toString());
            }
          }
        }
      }

      // Get current gas price with Uniswap Wallet optimizations
      let gasPrice: ethers.BigNumber;
      try {
        console.log('🔗 WALLETCONNECT: Getting gas price...');
        gasPrice = await this.provider!.getGasPrice();

        // Uniswap Wallet needs higher gas prices for reliable execution
        const adjustedGasPrice = gasPrice.mul(150).div(100); // 50% higher for Uniswap Wallet
        gasPrice = adjustedGasPrice;

        console.log('✅ WALLETCONNECT: Gas price adjusted for Uniswap Wallet:', gasPrice.toString());
      } catch (gasPriceError) {
        console.warn('❌ Gas price estimation failed, using fallback:', gasPriceError);
        // Fallback to a reasonable gas price (20 gwei)
        gasPrice = ethers.utils.parseUnits('20', 'gwei');
      }

      // Prepare transaction request for WalletConnect with explicit hex formatting
      const transactionRequest = {
        to: this.config!.safeAddress,
        data: txData,
        gasLimit: gasLimit.toHexString(), // Use toHexString() method
        gasPrice: gasPrice.toHexString(), // Use toHexString() method
        value: '0x0'
      };

      console.log('🔗 WALLETCONNECT: Final transaction request for Uniswap Wallet:', {
        to: transactionRequest.to,
        gasLimit: transactionRequest.gasLimit,
        gasPrice: transactionRequest.gasPrice,
        dataLength: txData.length
      });

      // For Uniswap Wallet, try to send without gas parameters first (let wallet estimate)
      if (isUniswapWallet) {
        console.log('🦄 UNISWAP WALLET: Attempting transaction without gas parameters (wallet estimation)...');
        try {
          const simpleRequest = {
            to: this.config!.safeAddress,
            data: txData,
            value: '0x0'
            // Let Uniswap Wallet estimate gas itself
          };

          const tx = await this.signer!.sendTransaction(simpleRequest);
          console.log('✅ UNISWAP WALLET: Transaction sent with wallet gas estimation:', tx.hash);
          return tx;
        } catch (simpleError) {
          console.warn('🦄 UNISWAP WALLET: Wallet gas estimation failed, trying with manual gas:', simpleError);
          // Fall through to manual gas estimation
        }
      }

      console.log('🔗 WALLETCONNECT: Sending transaction via sendTransaction with manual gas:', {
        to: transactionRequest.to,
        gasLimit: transactionRequest.gasLimit,
        gasPrice: transactionRequest.gasPrice
      });

      // Use sendTransaction for WalletConnect (this triggers the wallet UI)
      const tx = await this.signer!.sendTransaction(transactionRequest);

      console.log('✅ WALLETCONNECT: Transaction sent successfully:', tx.hash);
      return tx;

    } catch (error: any) {
      console.error('❌ WALLETCONNECT: Transaction execution failed:', error);

      // Provide specific error messages for WalletConnect issues
      if (error.message?.includes('user rejected') || error.message?.includes('User rejected')) {
        throw new Error('Transaction was cancelled in Uniswap Wallet');
      } else if (error.message?.includes('gas')) {
        throw new Error('Gas estimation failed. This is common with WalletConnect. Please try again.');
      } else if (error.message?.includes('insufficient funds')) {
        throw new Error('Insufficient funds to execute transaction');
      }

      throw new Error(`WalletConnect execution failed: ${error.message || error}`);
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
      console.log('🔍 Checking if address is Safe owner:', address);

      // Method 1: Try direct isOwner call with timeout
      try {
        const isOwnerPromise = this.safeContract.isOwner(address);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('isOwner call timeout')), 3000)
        );

        const result = await Promise.race([isOwnerPromise, timeoutPromise]) as boolean;
        console.log('✅ Direct isOwner call succeeded:', result);
        return result;
      } catch (directError) {
        console.log('❌ Direct isOwner call failed, trying fallback method:', directError);
      }

      // Method 2: Fallback - Get all owners and check if address is in the list
      try {
        console.log('🔄 Fallback: Getting all owners and checking manually...');
        const ownersPromise = this.safeContract.getOwners();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getOwners call timeout')), 3000)
        );

        const owners = await Promise.race([ownersPromise, timeoutPromise]) as string[];
        const isOwner = owners.map(owner => owner.toLowerCase()).includes(address.toLowerCase());
        console.log('✅ Fallback owner check completed:', { isOwner, totalOwners: owners.length });
        return isOwner;
      } catch (fallbackError) {
        console.log('❌ Fallback owner check also failed:', fallbackError);
      }

      // Method 3: Use RPC provider directly as last resort
      try {
        console.log('🔄 Last resort: Using RPC provider directly...');
        const rpcUrl = getRpcUrl(this.config!.network);
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const rpcContract = new ethers.Contract(this.config!.safeAddress, SAFE_ABI, rpcProvider);

        const rpcIsOwnerPromise = rpcContract.isOwner(address);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC isOwner call timeout')), 3000)
        );

        const result = await Promise.race([rpcIsOwnerPromise, timeoutPromise]) as boolean;
        console.log('✅ RPC owner check completed:', result);
        return result;
      } catch (rpcError) {
        console.log('❌ RPC owner check also failed:', rpcError);
      }

      console.log('⚠️ All owner check methods failed, returning false');
      return false;
    } catch (error) {
      console.error('❌ Unexpected error in isOwner check:', error);
      return false;
    }
  }

  /**
   * Get the current nonce for the Safe with multiple fallback methods
   */
  async getNonce(): Promise<number> {
    this.ensureInitialized();

    if (!this.safeContract || !this.provider || !this.config) {
      throw new Error('Safe contract not initialized');
    }

    // Method 1: Try direct nonce() call with timeout
    try {
      console.log('🔢 Method 1: Getting Safe nonce via contract.nonce()...');
      console.log('🔢 Using provider for nonce call:', !!this.provider);
      console.log('🔢 Using signer for nonce call:', !!this.signer);

      // Add timeout to prevent hanging
      const noncePromise = this.safeContract.nonce();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Nonce call timeout')), 10000) // 10 second timeout
      );

      const nonce = await Promise.race([noncePromise, timeoutPromise]);
      console.log(`✅ Safe nonce (method 1): ${nonce.toString()}`);
      return nonce.toNumber();
    } catch (error: any) {
      console.log(`❌ Method 1 failed: ${error.message}`);
    }

    // Method 2: Try with fresh contract instance using read-only provider
    try {
      console.log('🔢 Method 2: Creating fresh contract instance with read-only provider...');
      // Use read-only provider instead of signer provider to avoid WalletConnect issues
      const readOnlyProvider = new ethers.providers.JsonRpcProvider(getRpcUrl(this.config.network));
      const freshContract = new ethers.Contract(this.config.safeAddress, SAFE_ABI, readOnlyProvider);

      const noncePromise = freshContract.nonce();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Nonce call timeout')), 10000) // 10 second timeout
      );

      const nonce = await Promise.race([noncePromise, timeoutPromise]);
      console.log(`✅ Safe nonce (method 2): ${nonce.toString()}`);
      return nonce.toNumber();
    } catch (error: any) {
      console.log(`❌ Method 2 failed: ${error.message}`);
    }

    // Method 3: Try with reinitialized provider
    try {
      console.log('🔢 Method 3: Reinitializing provider and retrying...');
      await this.reinitializeProvider();

      const nonce = await this.safeContract!.nonce();
      console.log(`✅ Safe nonce (method 3): ${nonce.toString()}`);
      return nonce.toNumber();
    } catch (error: any) {
      console.log(`❌ Method 3 failed: ${error.message}`);
    }

    // Method 4: Try with static provider (same as validation)
    try {
      console.log('🔢 Method 4: Using static provider (validation method)...');
      const staticRpcUrl = getRpcUrl(this.config.network);
      const staticProvider = new ethers.providers.JsonRpcProvider(staticRpcUrl);
      const staticContract = new ethers.Contract(this.config.safeAddress, SAFE_ABI, staticProvider);

      const nonce = await staticContract.nonce();
      console.log(`✅ Safe nonce (method 4): ${nonce.toString()}`);

      // Update our provider to use the working one
      this.provider = staticProvider;
      this.safeContract = new ethers.Contract(
        this.config.safeAddress,
        SAFE_ABI,
        this.signer || this.provider
      );

      return nonce.toNumber();
    } catch (error: any) {
      console.log(`❌ Method 4 failed: ${error.message}`);
    }

    // Method 5: Try low-level call
    try {
      console.log('🔢 Method 5: Using low-level call...');
      const nonceSelector = '0xaffed0e0'; // keccak256("nonce()").slice(0, 10)
      const result = await this.provider.call({
        to: this.config.safeAddress,
        data: nonceSelector
      });

      if (result && result !== '0x') {
        const nonce = ethers.BigNumber.from(result).toNumber();
        console.log(`✅ Safe nonce (method 5): ${nonce.toString()}`);
        return nonce;
      }
    } catch (error: any) {
      console.log(`❌ Method 5 failed: ${error.message}`);
    }

    // All methods failed
    console.error('❌ All nonce retrieval methods failed');

    // Try validation to see if the contract is actually valid
    try {
      await this.validateSafeContract();
      throw new Error(`Safe contract validation passes but all nonce() methods failed. This indicates a contract interface mismatch or network issue.`);
    } catch (validationError: any) {
      throw new Error(`Safe contract validation failed: ${validationError.message}`);
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

  /**
   * Get the current provider
   */
  getProvider(): ethers.providers.Provider | null {
    return this.provider;
  }

  /**
   * Get the current guard address for the Safe
   */
  async getCurrentGuard(): Promise<string> {
    this.ensureInitialized();

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    if (!this.config) {
      throw new Error('Safe configuration not initialized');
    }

    try {
      // Safe contracts store the guard address in a specific storage slot
      // keccak256("guard_manager.guard.address") = 0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8
      const GUARD_STORAGE_SLOT = '0x4a204f620c8c5ccdca3fd54d003badd85ba500436a431f0cbda4f558c93c34c8';

      const guardData = await this.provider.getStorageAt(this.config.safeAddress, GUARD_STORAGE_SLOT);

      // Convert the storage data to an address
      // Storage returns 32 bytes, but address is only 20 bytes (last 20 bytes)
      const guardAddress = ethers.utils.getAddress('0x' + guardData.slice(-40));

      return guardAddress;
    } catch (error: any) {
      console.error('Error getting current guard:', error);
      throw new Error(`Failed to get current guard: ${error.message || error}`);
    }
  }

  /**
   * Set a guard for the Safe wallet
   */
  async setGuard(guardAddress: string): Promise<SafeTransactionData & { txHash: string; signature: string }> {
    this.ensureInitialized();

    if (!this.signer) {
      throw new Error('Signer not available. Please connect a wallet.');
    }

    if (!this.safeContract) {
      throw new Error('Safe contract not initialized');
    }

    try {
      // Get current nonce
      const nonce = await this.getNonce();

      // Import SafeGuardService to create the transaction
      const { SafeGuardService } = await import('./SafeGuardService');
      const safeTransaction = SafeGuardService.createSetGuardTransaction(
        this.config!.safeAddress,
        guardAddress,
        nonce
      );

      // Create and sign the transaction
      const transactionRequest: TransactionRequest = {
        to: safeTransaction.to,
        value: safeTransaction.value,
        data: safeTransaction.data,
        operation: safeTransaction.operation
      };

      return await this.createTransaction(transactionRequest);
    } catch (error) {
      console.error('Error setting guard:', error);
      throw new Error(`Failed to set guard: ${error}`);
    }
  }

  /**
   * Remove the current guard from the Safe wallet
   */
  async removeGuard(): Promise<SafeTransactionData & { txHash: string; signature: string }> {
    this.ensureInitialized();

    if (!this.signer) {
      throw new Error('Signer not available. Please connect a wallet.');
    }

    if (!this.safeContract) {
      throw new Error('Safe contract not initialized');
    }

    try {
      // Get current nonce
      const nonce = await this.getNonce();

      // Import SafeGuardService to create the transaction
      const { SafeGuardService } = await import('./SafeGuardService');
      const safeTransaction = SafeGuardService.createRemoveGuardTransaction(
        this.config!.safeAddress,
        nonce
      );

      // Create and sign the transaction
      const transactionRequest: TransactionRequest = {
        to: safeTransaction.to,
        value: safeTransaction.value,
        data: safeTransaction.data,
        operation: safeTransaction.operation
      };

      return await this.createTransaction(transactionRequest);
    } catch (error) {
      console.error('Error removing guard:', error);
      throw new Error(`Failed to remove guard: ${error}`);
    }
  }
}

// Singleton instance
export const safeWalletService = new SafeWalletService();
