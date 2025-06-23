import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

declare global {
  interface Window {
    trustWallet?: any;
  }
}

export class TrustWalletProvider extends BaseWalletProvider {
  readonly type = WalletProviderType.TRUST_WALLET;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.TRUST_WALLET,
    name: 'Trust Wallet',
    icon: 'trust',
    description: 'Connect using Trust Wallet',
    isAvailable: typeof window !== 'undefined' && (
      typeof window.trustWallet !== 'undefined' ||
      typeof window.ethereum?.isTrust !== 'undefined'
    )
  };

  async connect(): Promise<void> {
    if (!this.info.isAvailable) {
      throw new Error('Trust Wallet is not installed. Please install Trust Wallet extension or app.');
    }

    try {
      let provider;
      
      // Check for Trust Wallet
      if (window.trustWallet) {
        provider = window.trustWallet;
      } else if (window.ethereum?.isTrust) {
        provider = window.ethereum;
      } else {
        throw new Error('Trust Wallet not found');
      }

      // Request account access
      await provider.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ Trust Wallet connected successfully');
    } catch (error: any) {
      console.error('❌ Trust Wallet connection failed:', error);

      // Clean up on failure
      this.provider = null;
      this.signer = null;
      this.connected = false;

      // Handle specific error codes
      if (error.code === 4001 || error.message?.includes('User denied') || error.message?.includes('User rejected')) {
        throw new Error('Connection cancelled by user');
      } else if (error.code === -32002) {
        throw new Error('Trust Wallet is already processing a request. Please check your wallet and try again.');
      } else {
        throw new Error(`Failed to connect to Trust Wallet: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.connected = false;
    this.removeAllListeners();
    console.log('✅ Trust Wallet disconnected');
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Trust Wallet not connected');
    }

    try {
      const provider = this.provider.provider;
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      console.error('Failed to switch network:', error);
      return false;
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (this.provider?.provider) {
      this.provider.provider.on(event, listener);
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (this.provider?.provider) {
      this.provider.provider.removeListener(event, listener);
    }
  }

  removeAllListeners(): void {
    if (this.provider?.provider) {
      this.provider.provider.removeAllListeners();
    }
  }
}
