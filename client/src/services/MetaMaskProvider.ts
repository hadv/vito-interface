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
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI5LjUgMTZDMjkuNSAyMy40NTU4IDIzLjQ1NTggMjkuNSAxNiAyOS41QzguNTQ0MTYgMjkuNSAyLjUgMjMuNDU1OCAyLjUgMTZDMi41IDguNTQ0MTYgOC41NDQxNiAyLjUgMTYgMi41QzIzLjQ1NTggMi41IDI5LjUgOC41NDQxNiAyOS41IDE2WiIgZmlsbD0iI0Y2ODUxQiIgc3Ryb2tlPSIjRjY4NTFCIi8+CjxwYXRoIGQ9Ik0yNi4yNSAxMi4yNUwyMi4yNSA5LjI1TDE5LjI1IDEyLjI1TDE2IDEwLjc1TDEyLjc1IDEyLjI1TDkuNzUgOS4yNUw1Ljc1IDEyLjI1TDkuNzUgMTUuMjVMMTIuNzUgMTMuNzVMMTYgMTUuMjVMMTkuMjUgMTMuNzVMMjIuMjUgMTUuMjVMMjYuMjUgMTIuMjVaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMjIuMjUgMTUuMjVMMTkuMjUgMTguMjVMMTYgMTYuNzVMMTIuNzUgMTguMjVMOS43NSAxNS4yNUwxMi43NSAyMS4yNUwxNiAyMi43NUwxOS4yNSAyMS4yNUwyMi4yNSAxNS4yNVoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    description: 'Connect using MetaMask browser extension',
    isAvailable: typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
  };

  async connect(): Promise<void> {
    if (!this.info.isAvailable) {
      throw new Error('MetaMask is not installed. Please install MetaMask browser extension.');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ MetaMask connected successfully');
    } catch (error: any) {
      console.error('❌ MetaMask connection failed:', error);
      throw new Error(`Failed to connect to MetaMask: ${error.message}`);
    }
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
