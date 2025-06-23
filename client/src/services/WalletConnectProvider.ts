import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

// Dynamic imports for WalletConnect dependencies to handle cases where they might not be installed
let WalletConnectProvider: any = null;
let QRCodeModal: any = null;

// Try to import WalletConnect dependencies
try {
  WalletConnectProvider = require('@walletconnect/web3-provider').default;
  QRCodeModal = require('@walletconnect/qrcode-modal').default;
} catch (error) {
  console.warn('WalletConnect dependencies not found. WalletConnect functionality will be disabled.');
}

export class WalletConnectProviderImpl extends BaseWalletProvider {
  readonly type = WalletProviderType.WALLETCONNECT;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.WALLETCONNECT,
    name: 'WalletConnect',
    icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTI5LjUgMTZDMjkuNSAyMy40NTU4IDIzLjQ1NTggMjkuNSAxNiAyOS41QzguNTQ0MTYgMjkuNSAyLjUgMjMuNDU1OCAyLjUgMTZDMi41IDguNTQ0MTYgOC41NDQxNiAyLjUgMTYgMi41QzIzLjQ1NTggMi41IDI5LjUgOC41NDQxNiAyOS41IDE2WiIgZmlsbD0iIzM5ODlGRiIgc3Ryb2tlPSIjMzk4OUZGIi8+CjxwYXRoIGQ9Ik0xMC41IDEzLjVDMTMuNSAxMC41IDE4LjUgMTAuNSAyMS41IDEzLjVMMjIgMTRMMjAuNSAxNS41TDIwIDE1QzE4IDE0IDE0IDE0IDEyIDE1TDExLjUgMTUuNUwxMCAxNEwxMC41IDEzLjVaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTMgMTguNUMxNC41IDE3IDE3LjUgMTcgMTkgMTguNUwxOS41IDE5TDE4IDE5LjVMMTcuNSAxOUMxNi41IDE4LjUgMTUuNSAxOC41IDE0LjUgMTlMMTQgMTkuNUwxMi41IDE5TDEzIDE4LjVaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
    description: 'Connect using WalletConnect protocol',
    isAvailable: WalletConnectProvider !== null && QRCodeModal !== null
  };

  private walletConnectProvider: any = null;

  async connect(): Promise<void> {
    if (!WalletConnectProvider || !QRCodeModal) {
      throw new Error('WalletConnect dependencies not installed. Please install @walletconnect/web3-provider and @walletconnect/qrcode-modal packages.');
    }

    try {
      // Create WalletConnect provider
      this.walletConnectProvider = new WalletConnectProvider({
        infuraId: process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161', // Default fallback
        rpc: {
          1: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
          5: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
          11155111: 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
          137: 'https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
          80001: 'https://polygon-mumbai.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        },
        chainId: 1, // Default to Ethereum mainnet
        qrcode: true,
        qrcodeModal: QRCodeModal,
      });

      // Enable session (triggers QR Code modal)
      await this.walletConnectProvider.enable();

      // Create ethers provider and signer
      this.provider = new ethers.providers.Web3Provider(this.walletConnectProvider);
      this.signer = this.provider.getSigner();
      this.connected = true;

      // Set up event listeners
      this.setupEventListeners();

      console.log('✅ WalletConnect connected successfully');
    } catch (error: any) {
      console.error('❌ WalletConnect connection failed:', error);
      throw new Error(`Failed to connect via WalletConnect: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.walletConnectProvider) {
        await this.walletConnectProvider.disconnect();
        this.walletConnectProvider = null;
      }
      
      this.provider = null;
      this.signer = null;
      this.connected = false;
      this.removeAllListeners();
      
      console.log('✅ WalletConnect disconnected');
    } catch (error: any) {
      console.error('❌ WalletConnect disconnect failed:', error);
      // Still mark as disconnected even if there was an error
      this.provider = null;
      this.signer = null;
      this.connected = false;
      this.removeAllListeners();
    }
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    if (!this.walletConnectProvider) {
      throw new Error('WalletConnect not connected');
    }

    try {
      await this.walletConnectProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
      return true;
    } catch (error: any) {
      console.error('Failed to switch network via WalletConnect:', error);
      return false;
    }
  }

  on(event: string, listener: (...args: any[]) => void): void {
    if (this.walletConnectProvider) {
      this.walletConnectProvider.on(event, listener);
    }
  }

  off(event: string, listener: (...args: any[]) => void): void {
    if (this.walletConnectProvider) {
      this.walletConnectProvider.removeListener(event, listener);
    }
  }

  removeAllListeners(): void {
    if (this.walletConnectProvider) {
      this.walletConnectProvider.removeAllListeners();
    }
  }

  private setupEventListeners(): void {
    if (!this.walletConnectProvider) return;

    // Subscribe to accounts change
    this.walletConnectProvider.on('accountsChanged', (accounts: string[]) => {
      console.log('WalletConnect accounts changed:', accounts);
    });

    // Subscribe to chainId change
    this.walletConnectProvider.on('chainChanged', (chainId: number) => {
      console.log('WalletConnect chain changed:', chainId);
    });

    // Subscribe to session disconnection
    this.walletConnectProvider.on('disconnect', (code: number, reason: string) => {
      console.log('WalletConnect disconnected:', code, reason);
      this.disconnect();
    });
  }

  // WalletConnect specific methods
  getWalletConnectProvider(): any {
    return this.walletConnectProvider;
  }

  isWalletConnectConnected(): boolean {
    return this.walletConnectProvider?.connected || false;
  }
}
