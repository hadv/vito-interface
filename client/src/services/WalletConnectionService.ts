import { ethers } from 'ethers';
import { safeWalletService, SafeWalletConfig } from './SafeWalletService';

export interface WalletConnectionState {
  isConnected: boolean;
  address?: string;
  safeAddress?: string;
  network?: string;
  balance?: string;
  isOwner?: boolean;
  error?: string;
}

export interface ConnectWalletParams {
  safeAddress: string;
  network: string;
  rpcUrl?: string;
}

export class WalletConnectionService {
  private state: WalletConnectionState = {
    isConnected: false
  };
  
  private listeners: ((state: WalletConnectionState) => void)[] = [];
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;

  /**
   * Connect to a Safe wallet
   */
  async connectWallet(params: ConnectWalletParams): Promise<WalletConnectionState> {
    try {
      // Check if MetaMask or other wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Get user address
      const userAddress = await this.signer.getAddress();
      
      // Initialize Safe Wallet Service
      const config: SafeWalletConfig = {
        safeAddress: params.safeAddress,
        network: params.network,
        rpcUrl: params.rpcUrl
      };
      
      await safeWalletService.initialize(config, this.signer);
      
      // Get Safe info and check if user is owner
      const safeInfo = await safeWalletService.getSafeInfo();
      const isOwner = await safeWalletService.isOwner(userAddress);
      
      // Update state
      this.state = {
        isConnected: true,
        address: userAddress,
        safeAddress: params.safeAddress,
        network: params.network,
        balance: safeInfo.balance,
        isOwner,
        error: undefined
      };

      // Set up event listeners for account/network changes
      this.setupEventListeners();
      
      // Notify listeners
      this.notifyListeners();
      
      return this.state;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect wallet';
      this.state = {
        isConnected: false,
        error: errorMessage
      };
      
      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer = null;
    
    this.state = {
      isConnected: false
    };
    
    this.removeEventListeners();
    this.notifyListeners();
  }

  /**
   * Get current connection state
   */
  getState(): WalletConnectionState {
    return { ...this.state };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: WalletConnectionState) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Setup event listeners for wallet events
   */
  private setupEventListeners(): void {
    if (!window.ethereum) return;

    // Account changed
    window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
    
    // Network changed
    window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', this.handleAccountsChanged.bind(this));
    window.ethereum.removeListener('chainChanged', this.handleChainChanged.bind(this));
  }

  /**
   * Handle account changes
   */
  private async handleAccountsChanged(accounts: string[]): Promise<void> {
    if (accounts.length === 0) {
      // User disconnected
      await this.disconnectWallet();
    }
  }

  /**
   * Handle network changes
   */
  private async handleChainChanged(chainId: string): Promise<void> {
    // Reload the page or reconnect when network changes
    if (this.state.isConnected && this.state.safeAddress) {
      try {
        await this.connectWallet({
          safeAddress: this.state.safeAddress,
          network: this.state.network || 'ethereum'
        });
      } catch (error) {
        console.error('Error reconnecting after network change:', error);
        await this.disconnectWallet();
      }
    }
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  /**
   * Validate Safe address format
   */
  static isValidSafeAddress(address: string): boolean {
    return ethers.utils.isAddress(address);
  }
}

// Singleton instance
export const walletConnectionService = new WalletConnectionService();

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}
