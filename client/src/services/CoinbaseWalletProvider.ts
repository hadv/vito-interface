import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

declare global {
  interface Window {
    coinbaseWalletExtension?: any;
  }
}

export class CoinbaseWalletProvider extends BaseWalletProvider {
  readonly type = WalletProviderType.COINBASE_WALLET;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.COINBASE_WALLET,
    name: 'Coinbase Wallet',
    icon: 'coinbase',
    description: 'Connect using Coinbase Wallet',
    isAvailable: typeof window !== 'undefined' && (
      typeof window.coinbaseWalletExtension !== 'undefined' ||
      typeof window.ethereum?.isCoinbaseWallet !== 'undefined'
    )
  };

  async connect(): Promise<void> {
    if (!this.info.isAvailable) {
      throw new Error('Coinbase Wallet is not installed. Please install Coinbase Wallet extension or app.');
    }

    try {
      let provider;
      
      // Check for Coinbase Wallet extension
      if (window.coinbaseWalletExtension) {
        provider = window.coinbaseWalletExtension;
      } else if (window.ethereum?.isCoinbaseWallet) {
        provider = window.ethereum;
      } else {
        throw new Error('Coinbase Wallet not found');
      }

      // Request account access
      await provider.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ Coinbase Wallet connected successfully');
    } catch (error: any) {
      console.error('❌ Coinbase Wallet connection failed:', error);

      // Clean up on failure
      this.provider = null;
      this.signer = null;
      this.connected = false;

      // Handle specific error codes
      if (error.code === 4001 || error.message?.includes('User denied') || error.message?.includes('User rejected')) {
        throw new Error('Connection cancelled by user');
      } else if (error.code === -32002) {
        throw new Error('Coinbase Wallet is already processing a request. Please check your wallet and try again.');
      } else {
        throw new Error(`Failed to connect to Coinbase Wallet: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.connected = false;
    this.removeAllListeners();
    console.log('✅ Coinbase Wallet disconnected');
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Coinbase Wallet not connected');
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
