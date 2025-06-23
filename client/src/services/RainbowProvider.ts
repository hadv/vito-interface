import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

declare global {
  interface Window {
    rainbow?: any;
  }
}

export class RainbowProvider extends BaseWalletProvider {
  readonly type = WalletProviderType.RAINBOW;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.RAINBOW,
    name: 'Rainbow',
    icon: 'rainbow',
    description: 'Connect using Rainbow Wallet',
    isAvailable: typeof window !== 'undefined' && (
      typeof window.rainbow !== 'undefined' ||
      typeof window.ethereum?.isRainbow !== 'undefined'
    )
  };

  async connect(): Promise<void> {
    if (!this.info.isAvailable) {
      throw new Error('Rainbow Wallet is not installed. Please install Rainbow Wallet extension or app.');
    }

    try {
      let provider;
      
      // Check for Rainbow Wallet
      if (window.rainbow) {
        provider = window.rainbow;
      } else if (window.ethereum?.isRainbow) {
        provider = window.ethereum;
      } else {
        throw new Error('Rainbow Wallet not found');
      }

      // Request account access
      await provider.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ Rainbow Wallet connected successfully');
    } catch (error: any) {
      console.error('❌ Rainbow Wallet connection failed:', error);
      throw new Error(`Failed to connect to Rainbow Wallet: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.connected = false;
    this.removeAllListeners();
    console.log('✅ Rainbow Wallet disconnected');
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Rainbow Wallet not connected');
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
