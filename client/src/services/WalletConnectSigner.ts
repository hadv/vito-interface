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
   * Send a transaction using WalletConnect with improved gas estimation
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

    // Improve gas estimation for WalletConnect transactions
    let enhancedTransaction = { ...transaction };

    try {
      // If no gas limit is provided, estimate it
      if (!enhancedTransaction.gasLimit && this.provider) {
        console.log('🔍 Estimating gas for WalletConnect transaction...');

        const gasEstimate = await this.provider.estimateGas({
          to: transaction.to,
          value: transaction.value,
          data: transaction.data,
          from: this.address
        });

        // Add 20% buffer for WalletConnect transactions
        const gasWithBuffer = Math.floor(gasEstimate.toNumber() * 1.2);
        enhancedTransaction.gasLimit = `0x${gasWithBuffer.toString(16)}`;

        console.log(`📊 Gas estimated: ${gasEstimate.toNumber()} -> ${gasWithBuffer} (with buffer)`);
      }

      // If no gas price is provided, get current gas price
      if (!enhancedTransaction.gasPrice && !enhancedTransaction.maxFeePerGas && this.provider) {
        const feeData = await this.provider.getFeeData();
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          // Use EIP-1559 pricing
          enhancedTransaction.maxFeePerGas = feeData.maxFeePerGas.toHexString();
          enhancedTransaction.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.toHexString();
        } else if (feeData.gasPrice) {
          enhancedTransaction.gasPrice = feeData.gasPrice.toHexString();
        }
      }
    } catch (gasError) {
      console.warn('⚠️ Gas estimation failed for WalletConnect transaction:', gasError);
      // Continue with original transaction if gas estimation fails
    }

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_sendTransaction',
        params: [enhancedTransaction]
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

    // Validate WalletConnect session before signing
    try {
      const activeSessions = signClient.session.getAll();
      const activeSession = activeSessions.find((s: any) => s.topic === sessionTopic);
      if (!activeSession) {
        throw new Error('WalletConnect session is no longer active. Please reconnect your wallet.');
      }
    } catch (sessionError) {
      throw new Error('WalletConnect session validation failed. Please reconnect your wallet.');
    }

    // Prepare the typed data in the correct format for WalletConnect
    // Ensure domain has all required fields for Safe transactions
    const safeDomain = {
      chainId: domain.chainId,
      verifyingContract: domain.verifyingContract
    };

    // Detect wallet type from session metadata for compatibility adjustments
    let walletName = 'Unknown';
    try {
      const activeSessions = signClient.session.getAll();
      const activeSession = activeSessions.find((s: any) => s.topic === sessionTopic);
      walletName = activeSession?.peer?.metadata?.name || 'Unknown';
    } catch (error) {
      // Wallet detection failed, continue with default behavior
    }

    // Build complete EIP-712 typed data structure with wallet-specific optimizations
    const isUniswapWallet = walletName.toLowerCase().includes('uniswap');

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

    // For Uniswap wallet, ensure all addresses are properly checksummed
    if (isUniswapWallet) {
      // Ensure domain verifyingContract is checksummed
      if (typedData.domain.verifyingContract) {
        typedData.domain.verifyingContract = ethers.utils.getAddress(typedData.domain.verifyingContract);
      }

      // Ensure all address fields in message are checksummed
      if (typedData.message) {
        Object.keys(typedData.message).forEach(key => {
          const value = typedData.message[key];
          if (typeof value === 'string' && value.match(/^0x[a-fA-F0-9]{40}$/)) {
            try {
              typedData.message[key] = ethers.utils.getAddress(value);
            } catch (e) {
              // If it's not a valid address, leave it as is
            }
          }
        });
      }
    }



    // Validate the typed data structure
    if (!typedData.primaryType || !(typedData.primaryType in typedData.types)) {
      throw new Error(`Invalid typed data: primary type '${typedData.primaryType}' not found in types`);
    }

    // Prepare the request with Uniswap wallet compatibility
    // Some wallets (like Uniswap) are sensitive to parameter formatting
    const signerAddress = ethers.utils.getAddress(this.address); // Ensure proper checksum
    const typedDataString = JSON.stringify(typedData, null, 0); // Compact JSON without spaces

    const request = {
      topic: sessionTopic,
      chainId: `eip155:${this.chainId}`,
      request: {
        method: 'eth_signTypedData_v4',
        params: [signerAddress, typedDataString] // Use checksummed address and compact JSON
      }
    };



    try {
      // Add timeout to prevent hanging
      const timeoutMs = 120000; // 2 minutes timeout for mobile wallet interaction
      const signPromise = signClient.request(request);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Signing request timed out. Please check your mobile wallet app.')), timeoutMs)
      );

      const signature = await Promise.race([signPromise, timeoutPromise]);

      // Validate signature format
      if (!signature || typeof signature !== 'string' || !signature.startsWith('0x')) {
        throw new Error('Invalid signature format received from mobile wallet');
      }

      return signature;
    } catch (error: any) {
      // For Uniswap wallet, try alternative signing method if primary fails
      if (isUniswapWallet && !error.message.includes('rejected') && !error.message.includes('denied')) {
        try {
          // Try with eth_signTypedData (v3) instead of v4
          const fallbackRequest = {
            topic: sessionTopic,
            chainId: `eip155:${this.chainId}`,
            request: {
              method: 'eth_signTypedData',
              params: [signerAddress, typedDataString]
            }
          };

          const fallbackSignature = await signClient.request(fallbackRequest);

          if (fallbackSignature && typeof fallbackSignature === 'string' && fallbackSignature.startsWith('0x')) {
            return fallbackSignature;
          }
        } catch (fallbackError) {
          // Last resort: try personal_sign with the transaction hash
          try {
            // Create the transaction hash manually
            const encoder = ethers.utils.defaultAbiCoder;
            const txHashData = encoder.encode(
              ['address', 'uint256', 'bytes', 'uint8', 'uint256', 'uint256', 'uint256', 'address', 'address', 'uint256'],
              [
                value.to,
                value.value,
                value.data,
                value.operation,
                value.safeTxGas,
                value.baseGas,
                value.gasPrice,
                value.gasToken,
                value.refundReceiver,
                value.nonce
              ]
            );

            const txHash = ethers.utils.keccak256(txHashData);
            const message = `Sign Safe transaction hash: ${txHash}`;

            const personalSignRequest = {
              topic: sessionTopic,
              chainId: `eip155:${this.chainId}`,
              request: {
                method: 'personal_sign',
                params: [ethers.utils.hexlify(ethers.utils.toUtf8Bytes(message)), signerAddress]
              }
            };

            const personalSignature = await signClient.request(personalSignRequest);

            if (personalSignature && typeof personalSignature === 'string' && personalSignature.startsWith('0x')) {
              return personalSignature;
            }
          } catch (personalSignError) {
            // All fallbacks failed, continue to error handling
          }
        }
      }
      console.error('❌ WalletConnect Signer: EIP-712 signing failed:', error);

      // Provide user-friendly error messages
      const errorMessage = error?.message || error?.reason || 'Unknown signing error';

      if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('cancelled')) {
        if (isUniswapWallet) {
          throw new Error('Transaction signing was rejected in Uniswap wallet. Please ensure you tap the "Accept" button to approve the signing request.');
        }
        throw new Error('Transaction signing was rejected by user in mobile wallet');
      }

      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        if (isUniswapWallet) {
          throw new Error('Signing request timed out in Uniswap wallet. Please ensure the Uniswap app is open, responsive, and you tap "Accept" when the signing request appears.');
        }
        throw new Error('Signing request timed out. Please ensure your mobile wallet app is open and check for pending signing requests.');
      }

      if (errorMessage.includes('session') || errorMessage.includes('connection')) {
        throw new Error('WalletConnect session error. Please disconnect and reconnect your wallet.');
      }

      // Uniswap wallet specific error guidance
      if (isUniswapWallet) {
        throw new Error(`Uniswap wallet signing failed: ${errorMessage}.

Troubleshooting tips for Uniswap wallet:
1. Ensure the Uniswap app is fully updated
2. Make sure you tap "Accept" on the signing request
3. Try closing and reopening the Uniswap app
4. If the Accept button is unresponsive, try disconnecting and reconnecting WalletConnect
5. Check that you're on the correct network in Uniswap wallet

Please try again or reconnect your wallet.`);
      }

      // Re-throw with enhanced error message
      throw new Error(`WalletConnect signing failed: ${errorMessage}. Please try again or reconnect your wallet.`);
    }
  }
}
