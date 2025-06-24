import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export class MetaMaskProvider extends BaseWalletProvider {
  readonly type = WalletProviderType.METAMASK;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.METAMASK,
    name: 'MetaMask',
    icon: 'metamask',
    description: 'Connect using MetaMask browser extension',
    isAvailable: typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  };

  async connect(): Promise<void> {
    if (!this.info.isAvailable) {
      throw new Error('MetaMask is not installed. Please install MetaMask browser extension.');
    }

    try {
      // Request account access with timeout
      await this.requestAccountsWithTimeout(30000); // 30 second timeout

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ MetaMask connected successfully');
    } catch (error: any) {
      console.error('❌ MetaMask connection failed:', error);

      // Clean up on failure
      this.provider = null;
      this.signer = null;
      this.connected = false;

      // Handle specific MetaMask error codes
      if (error.code === 4001) {
        // User rejected the request
        throw new Error('Connection cancelled by user');
      } else if (error.code === -32002) {
        // Request already pending
        throw new Error('MetaMask is already processing a request. Please check MetaMask and try again.');
      } else if (error.code === -32603) {
        // Internal error
        throw new Error('MetaMask internal error. Please try again.');
      } else if (error.message?.includes('User denied')) {
        // Alternative user rejection message
        throw new Error('Connection cancelled by user');
      } else if (error.message?.includes('Already processing')) {
        // Already processing
        throw new Error('MetaMask is busy. Please wait and try again.');
      } else if (error.message?.includes('timeout')) {
        // Timeout error
        throw new Error('Connection timeout. Please try again.');
      } else {
        // Generic error
        throw new Error(`Failed to connect to MetaMask: ${error.message || 'Unknown error'}`);
      }
    }
  }

  private async requestAccountsWithTimeout(timeoutMs: number): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MetaMask connection timeout. Please try again.'));
      }, timeoutMs);

      window.ethereum.request({ method: 'eth_requestAccounts' })
        .then((accounts: string[]) => {
          clearTimeout(timeout);
          resolve(accounts);
        })
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  async disconnect(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.connected = false;
    this.removeAllListeners();
    console.log('✅ MetaMask disconnected');
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.provider || !window.ethereum) {
      throw new Error('MetaMask not connected');
    }

    try {
      await window.ethereum.request({
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
    if (window.ethereum) {
      window.ethereum.on(event, listener);
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (window.ethereum) {
      window.ethereum.removeListener(event, listener);
    }
  }

  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners();
    }
  }

  // MetaMask specific methods
  async requestPermissions(): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    await window.ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
  }
}
