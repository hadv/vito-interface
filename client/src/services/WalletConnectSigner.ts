import { ethers } from 'ethers';
import { WalletConnectService } from './WalletConnectService';
import { preflightCheckWalletConnectSigning, logWalletConnectDiagnostics, diagnoseWalletConnectSession } from '../utils/walletConnectDebug';

/**
 * WalletConnect Signer Adapter
 * Bridges ethers.Signer interface with WalletConnect SignClient
 * Based on the working implementation from vito repo
 */
export class WalletConnectSigner extends ethers.Signer {
  private walletConnectService: WalletConnectService;
  private address: string;
  private chainId: number;

  // Add identifier property for detection in signing methods
  public readonly isWalletConnectSigner = true;

  constructor(
    walletConnectService: WalletConnectService,
    address: string,
    chainId: number,
    provider?: ethers.providers.Provider
  ) {
    super();
    this.walletConnectService = walletConnectService;
    this.address = address;
    this.chainId = chainId;

    // Set provider if provided
    if (provider) {
      ethers.utils.defineReadOnly(this, 'provider', provider);
    }
  }

  /**
   * Get the signer address
   */
  async getAddress(): Promise<string> {
    return this.address;
  }

  /**
   * Sign a message using WalletConnect
   */
  async signMessage(message: ethers.utils.Bytes | string): Promise<string> {
    const sessionTopic = this.walletConnectService.getSessionTopic();
    if (!sessionTopic) {
      throw new Error('No WalletConnect session available');
    }

    // Convert message to hex if needed
    const messageHex = ethers.utils.isBytes(message) 
      ? ethers.utils.hexlify(message)
      : ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message));

    // Use the WalletConnect SignClient directly (like in your working implementation)
    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      throw new Error('WalletConnect SignClient not available');
    }

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'personal_sign',
        params: [messageHex, this.address]
      }
    };

    return await signClient.request(request);
  }

  /**
   * Sign a transaction using WalletConnect
   */
  async signTransaction(transaction: ethers.providers.TransactionRequest): Promise<string> {
    const sessionTopic = this.walletConnectService.getSessionTopic();
    if (!sessionTopic) {
      throw new Error('No WalletConnect session available');
    }

    // Use the WalletConnect SignClient directly
    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      throw new Error('WalletConnect SignClient not available');
    }

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_signTransaction',
        params: [transaction]
      }
    };

    return await signClient.request(request);
  }

  /**
   * Send a transaction using WalletConnect
   */
  async sendTransaction(transaction: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const sessionTopic = this.walletConnectService.getSessionTopic();
    if (!sessionTopic) {
      throw new Error('No WalletConnect session available');
    }

    // Use the WalletConnect SignClient directly
    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      throw new Error('WalletConnect SignClient not available');
    }

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_sendTransaction',
        params: [transaction]
      }
    };

    const txHash = await signClient.request(request);
    
    // Return a transaction response
    if (!this.provider) {
      throw new Error('Provider not available for transaction response');
    }

    return this.provider.getTransaction(txHash);
  }

  /**
   * Connect to a new provider
   */
  connect(provider: ethers.providers.Provider): WalletConnectSigner {
    return new WalletConnectSigner(
      this.walletConnectService,
      this.address,
      this.chainId,
      provider
    );
  }

  /**
   * Sign typed data using WalletConnect (EIP-712)
   * This is the key method for Safe transaction signing
   */
  async _signTypedData(
    domain: ethers.TypedDataDomain,
    types: Record<string, ethers.TypedDataField[]>,
    value: Record<string, any>
  ): Promise<string> {
    const sessionTopic = this.walletConnectService.getSessionTopic();
    if (!sessionTopic) {
      throw new Error('No WalletConnect session available. Please reconnect your wallet.');
    }

    // Use the WalletConnect SignClient directly
    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      throw new Error('WalletConnect SignClient not available. Please reconnect your wallet.');
    }

    // Perform comprehensive pre-flight check
    console.log('🔍 Performing WalletConnect pre-flight check for signing...');
    const preflightCheck = preflightCheckWalletConnectSigning(this.walletConnectService, this.chainId);

    if (!preflightCheck.canSign) {
      console.error('❌ WalletConnect pre-flight check failed');
      const diagnostics = diagnoseWalletConnectSession(this.walletConnectService, this.chainId);
      logWalletConnectDiagnostics(diagnostics, 'Pre-flight Check');

      const issuesText = preflightCheck.issues.join('; ');
      throw new Error(`WalletConnect session not ready for signing: ${issuesText}. Please reconnect your wallet.`);
    }

    console.log('✅ WalletConnect pre-flight check passed');

    // Prepare the typed data in the correct format for WalletConnect
    // Ensure domain has all required fields for Safe transactions
    const safeDomain = {
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract
    };

    // Build complete EIP-712 typed data structure
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        ...types
      },
      primaryType: Object.keys(types)[0], // First type is primary (should be 'SafeTx')
      domain: safeDomain,
      message: value
    };

    console.log('🔐 WalletConnect Signer: Preparing EIP-712 signing request');
    console.log('📋 Domain:', safeDomain);
    console.log('📋 Primary type:', typedData.primaryType);
    console.log('📋 Message:', value);

    // Validate the typed data structure
    if (!typedData.primaryType || !(typedData.primaryType in typedData.types)) {
      throw new Error(`Invalid typed data: primary type '${typedData.primaryType}' not found in types`);
    }

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_signTypedData_v4',
        params: [this.address.toLowerCase(), JSON.stringify(typedData)]
      }
    };

    console.log('📱 MOBILE WALLET: Sending EIP-712 signing request via WalletConnect');
    console.log('🔗 Chain ID:', `eip155:${this.chainId}`);
    console.log('📱 This should trigger a signing request in your mobile wallet app');

    try {
      // Add timeout to prevent hanging
      const timeoutMs = 120000; // 2 minutes timeout for mobile wallet interaction
      const signPromise = signClient.request(request);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Signing request timed out. Please check your mobile wallet app.')), timeoutMs)
      );

      const signature = await Promise.race([signPromise, timeoutPromise]);

      console.log('✅ WalletConnect Signer: EIP-712 signature received successfully');
      console.log('📋 Signature length:', signature?.length || 0);

      // Validate signature format
      if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
        throw new Error('Invalid signature format received from mobile wallet');
      }

      return signature;
    } catch (error: any) {
      console.error('❌ WalletConnect Signer: EIP-712 signing failed:', error);

      // Provide user-friendly error messages
      const errorMessage = error?.message || error?.reason || 'Unknown signing error';

      if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('cancelled')) {
        throw new Error('Transaction signing was rejected by user in mobile wallet');
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        throw new Error('Signing request timed out. Please ensure your mobile wallet app is open and check for pending signing requests.');
      }

      if (errorMessage.includes('session') || errorMessage.includes('connection')) {
        throw new Error('WalletConnect session error. Please disconnect and reconnect your wallet.');
      }

      // Re-throw with enhanced error message
      throw new Error(`WalletConnect signing failed: ${errorMessage}. Please try again or reconnect your wallet.`);
    }
  }
}
