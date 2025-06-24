import { ethers } from 'ethers';
import { BaseWalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';

// Static imports for WalletConnect dependencies
import WalletConnectProvider from '@walletconnect/web3-provider';
import QRCodeModal from '@walletconnect/qrcode-modal';

export class WalletConnectProviderImpl extends BaseWalletProvider {
  readonly type = WalletProviderType.WALLETCONNECT;
  readonly info: WalletProviderInfo = {
    type: WalletProviderType.WALLETCONNECT,
    name: 'WalletConnect',
    icon: 'walletconnect',
    description: 'Connect using WalletConnect protocol',
    isAvailable: this.checkAvailability()
  };

  private walletConnectProvider: any = null;
  private isInitializing: boolean = false;

  private checkAvailability(): boolean {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') return false;

      // Check if WalletConnect dependencies are available
      // Don't actually instantiate anything, just check if the classes exist
      return typeof WalletConnectProvider !== 'undefined' && typeof QRCodeModal !== 'undefined';
    } catch (error) {
      console.warn('WalletConnect availability check failed:', error);
      return false;
    }
  }

  async connect(): Promise<void> {
    if (this.isInitializing) {
      throw new Error('WalletConnect connection already in progress');
    }

    if (this.connected && this.walletConnectProvider) {
      console.log('✅ WalletConnect already connected');
      return;
    }

    this.isInitializing = true;

    try {
      // Create WalletConnect provider with better configuration
      this.walletConnectProvider = new WalletConnectProvider({
        infuraId: process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161',
        rpc: {
          1: `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
          5: `https://goerli.infura.io/v3/${process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
          11155111: `https://sepolia.infura.io/v3/${process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
          137: `https://polygon-mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
          42161: `https://arbitrum-mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_ID || '9aa3d95b3bc440fa88ea12eaa4456161'}`,
        },
        chainId: 1, // Default to Ethereum mainnet
        qrcode: true,
        qrcodeModal: QRCodeModal,
        // Add bridge configuration to avoid connection issues
        bridge: 'https://bridge.walletconnect.org',
        // Add timeout to prevent hanging connections
        clientMeta: {
          description: 'Vito - Safe Wallet Interface',
          url: window.location.origin,
          icons: [`${window.location.origin}/favicon.ico`],
          name: 'Vito'
        }
      });

      console.log('🔄 Initializing WalletConnect...');

      // Set up event listeners before enabling
      this.setupEventListeners();

      // Enable session with timeout (triggers QR Code modal)
      await this.enableWithTimeout(this.walletConnectProvider, 30000); // 30 second timeout

      // Create ethers provider and signer
      this.provider = new ethers.providers.Web3Provider(this.walletConnectProvider);
      this.signer = this.provider.getSigner();
      this.connected = true;

      console.log('✅ WalletConnect connected successfully');
    } catch (error: any) {
      console.error('❌ WalletConnect connection failed:', error);

      // Clean up on failure
      this.walletConnectProvider = null;
      this.provider = null;
      this.signer = null;
      this.connected = false;

      // Provide more specific error messages
      if (error.message?.includes('User closed modal')) {
        throw new Error('Connection cancelled by user');
      } else if (error.message?.includes('WebSocket')) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      } else {
        throw new Error(`Failed to connect via WalletConnect: ${error.message || 'Unknown error'}`);
      }
    } finally {
      this.isInitializing = false;
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

  private async enableWithTimeout(provider: any, timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WalletConnect connection timeout. Please try again.'));
      }, timeoutMs);

      provider.enable()
        .then((result: any) => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch((error: any) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}
