import { ethers } from 'ethers';
import { WalletConnectService } from './WalletConnectService';

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
      throw new Error('No WalletConnect session available');
    }

    // Use the WalletConnect SignClient directly (like in your working implementation)
    const signClient = (this.walletConnectService as any).signClient;
    if (!signClient) {
      throw new Error('WalletConnect SignClient not available');
    }

    // Prepare the typed data in the format expected by WalletConnect
    const typedData = {
      types: {
        EIP712Domain: [
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' }
        ],
        ...types
      },
      primaryType: Object.keys(types)[0], // First type is primary
      domain,
      message: value
    };

    console.log('🔐 WalletConnect Signer: Sending EIP-712 signing request');
    console.log('📋 Typed data:', typedData);

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_signTypedData_v4',
        params: [this.address, JSON.stringify(typedData)]
      }
    };

    console.log('📱 MOBILE WALLET: EIP-712 signing request sent via WalletConnect');
    
    try {
      const signature = await signClient.request(request);
      console.log('✅ WalletConnect Signer: EIP-712 signature received');
      return signature;
    } catch (error) {
      console.error('❌ WalletConnect Signer: EIP-712 signing failed:', error);
      throw error;
    }
  }
}
