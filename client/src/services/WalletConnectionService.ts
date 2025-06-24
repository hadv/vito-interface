import { ethers } from 'ethers';
import { safeWalletService, SafeWalletService, SafeWalletConfig } from './SafeWalletService';
import { getRpcUrl, NETWORK_CONFIGS } from '../contracts/abis';
import { WalletProvider, WalletProviderType } from './WalletProvider';
import { WalletProviderFactory } from './WalletProviderFactory';

export interface WalletConnectionState {
  isConnected: boolean;
  address?: string;
  safeAddress?: string;
  network?: string;
  balance?: string;
  isOwner?: boolean;
  error?: string;
  // New fields for signer wallet state
  signerConnected?: boolean;
  signerAddress?: string;
  signerBalance?: string;
  readOnlyMode?: boolean;
  // New field for wallet provider type
  walletProviderType?: WalletProviderType;
}

export interface ConnectWalletParams {
  safeAddress: string;
  network: string;
  rpcUrl?: string;
  readOnlyMode?: boolean; // New option for read-only connection
}

export class WalletConnectionService {
  private state: WalletConnectionState = {
    isConnected: false,
    signerConnected: false,
    readOnlyMode: false
  };

  private listeners: ((state: WalletConnectionState) => void)[] = [];
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private currentWalletProvider: WalletProvider | null = null;

  /**
   * Connect to a Safe wallet (can be read-only or with signer)
   */
  async connectWallet(params: ConnectWalletParams): Promise<WalletConnectionState> {
    try {
      // Safe wallet always starts in read-only mode
      // User must explicitly connect a signer wallet

      // Validate Safe address before attempting to connect
      // Use provided rpcUrl or get default for network
      const rpcUrl = params.rpcUrl || getRpcUrl(params.network);
      const validation = await SafeWalletService.validateSafeAddress(params.safeAddress, rpcUrl);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Initialize Safe Wallet Service first to validate the Safe wallet
      // Use the same RPC URL that was validated
      const config: SafeWalletConfig = {
        safeAddress: params.safeAddress,
        network: params.network,
        rpcUrl: rpcUrl  // Use the validated RPC URL
      };

      // Initialize without signer first to validate Safe wallet
      await safeWalletService.initialize(config, undefined);

      // Get Safe info to validate the Safe wallet exists
      const safeInfo = await safeWalletService.getSafeInfo();

      // Don't automatically connect signer wallet - user must explicitly connect
      // This prevents automatic MetaMask popups when connecting to Safe wallet
      console.log('✅ Safe wallet connected in read-only mode. Use "Connect Wallet" to add signer.');

      // Safe wallet is always connected in read-only mode initially
      // User must explicitly connect a signer wallet to enable transactions

      // Update state - always start in read-only mode
      this.state = {
        isConnected: true,
        address: undefined, // No signer address initially
        safeAddress: params.safeAddress,
        network: params.network,
        balance: safeInfo.balance,
        isOwner: false, // Will be determined when signer connects
        signerConnected: false, // No signer connected initially
        signerAddress: undefined,
        signerBalance: undefined,
        readOnlyMode: true, // Always start in read-only mode
        error: undefined
      };

      // Always remove existing event listeners first
      this.removeEventListeners();

      // Don't set up event listeners in read-only mode
      // Event listeners will be set up when user explicitly connects a signer wallet

      // Notify listeners
      this.notifyListeners();

      return this.state;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect wallet';
      this.state = {
        isConnected: false,
        signerConnected: false,
        readOnlyMode: false,
        error: errorMessage
      };

      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Check if wallet network matches Safe network and prompt switching if needed (with provider)
   */
  async checkAndSwitchNetworkWithProvider(targetNetwork: string, walletProvider: WalletProvider): Promise<{ switched: boolean; error?: string }> {
    try {
      // Get current wallet network
      const network = await walletProvider.getNetwork();
      const currentChainId = network.chainId;

      // Get target network chain ID
      const targetConfig = NETWORK_CONFIGS[targetNetwork as keyof typeof NETWORK_CONFIGS];
      if (!targetConfig) {
        return { switched: false, error: `Unknown network: ${targetNetwork}` };
      }

      const targetChainId = targetConfig.chainId;

      // If networks match, no switching needed
      if (currentChainId === targetChainId) {
        return { switched: true };
      }

      console.log(`🔄 Network mismatch detected: wallet=${currentChainId}, target=${targetChainId} (${targetNetwork})`);

      // Try to switch network
      const switched = await walletProvider.switchNetwork(targetChainId);
      if (switched) {
        console.log(`✅ Successfully switched to ${targetNetwork} (chainId: ${targetChainId})`);
        return { switched: true };
      } else {
        return { switched: false, error: `Failed to switch to ${targetNetwork}` };
      }
    } catch (error: any) {
      console.error('Error checking network:', error);
      return { switched: false, error: `Network check failed: ${error.message}` };
    }
  }

  /**
   * Check if wallet network matches Safe network and prompt switching if needed (legacy MetaMask)
   */
  async checkAndSwitchNetwork(targetNetwork: string): Promise<{ switched: boolean; error?: string }> {
    if (typeof window.ethereum === 'undefined') {
      return { switched: false, error: 'No wallet detected' };
    }

    try {
      // Get current wallet network
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const network = await provider.getNetwork();
      const currentChainId = network.chainId;

      // Get target network chain ID
      const targetConfig = NETWORK_CONFIGS[targetNetwork as keyof typeof NETWORK_CONFIGS];
      if (!targetConfig) {
        return { switched: false, error: `Unknown network: ${targetNetwork}` };
      }

      const targetChainId = targetConfig.chainId;

      // If networks match, no switching needed
      if (currentChainId === targetChainId) {
        return { switched: true };
      }

      console.log(`🔄 Network mismatch detected: wallet=${currentChainId}, target=${targetChainId} (${targetNetwork})`);

      // Try to switch network in MetaMask
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });

        console.log(`✅ Successfully switched to ${targetNetwork} (chainId: ${targetChainId})`);
        return { switched: true };
      } catch (switchError: any) {
        // If the network is not added to MetaMask, try to add it
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: targetConfig.name,
                rpcUrls: [targetConfig.rpcUrl],
                blockExplorerUrls: [targetConfig.blockExplorer],
              }],
            });

            console.log(`✅ Successfully added and switched to ${targetNetwork}`);
            return { switched: true };
          } catch (addError: any) {
            console.error('Failed to add network:', addError);
            return { switched: false, error: `Failed to add ${targetNetwork} to wallet: ${addError.message}` };
          }
        } else if (switchError.code === 4001) {
          // User rejected the request
          return { switched: false, error: `User rejected network switch to ${targetNetwork}` };
        } else {
          console.error('Failed to switch network:', switchError);
          return { switched: false, error: `Failed to switch to ${targetNetwork}: ${switchError.message}` };
        }
      }
    } catch (error: any) {
      console.error('Error checking network:', error);
      return { switched: false, error: `Network check failed: ${error.message}` };
    }
  }

  /**
   * Connect signer wallet using a specific wallet provider
   */
  async connectSignerWalletWithProvider(providerType: WalletProviderType): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      // Get the wallet provider
      const walletProvider = WalletProviderFactory.getProvider(providerType);

      if (!walletProvider.info.isAvailable) {
        throw new Error(`${walletProvider.info.name} is not available. ${walletProvider.info.description}`);
      }

      // Connect the wallet provider
      await walletProvider.connect();

      // Get provider and signer from wallet provider
      const provider = walletProvider.getProvider();
      const signer = walletProvider.getSigner();

      if (!provider || !signer) {
        throw new Error('Failed to get provider or signer from wallet');
      }

      // Create ethers provider if needed
      if (!(provider instanceof ethers.providers.Web3Provider)) {
        this.provider = new ethers.providers.Web3Provider(provider);
      } else {
        this.provider = provider;
      }
      this.signer = signer;
      this.currentWalletProvider = walletProvider;

      // Check and switch network if needed
      const networkResult = await this.checkAndSwitchNetworkWithProvider(this.state.network!, walletProvider);
      if (!networkResult.switched) {
        throw new Error(networkResult.error || `Please switch your wallet to ${this.state.network} network`);
      }

      // Get user address and balance
      const userAddress = await walletProvider.getAddress();
      const signerBalance = await walletProvider.getBalance();

      // Update Safe Wallet Service with signer
      await safeWalletService.setSigner(this.signer);

      // Check if user is owner
      const isOwner = await safeWalletService.isOwner(userAddress);

      // Update state
      this.state = {
        ...this.state,
        address: userAddress,
        isOwner,
        signerConnected: true,
        signerAddress: userAddress,
        signerBalance,
        readOnlyMode: false,
        walletProviderType: providerType,
        error: undefined
      };

      // Set up event listeners for account/network changes
      this.setupEventListenersWithProvider(walletProvider);

      // Notify listeners
      this.notifyListeners();

      return this.state;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to connect signer wallet';
      this.state = {
        ...this.state,
        error: errorMessage
      };

      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Connect signer wallet to an already connected Safe wallet with network validation
   * (Legacy method - DEPRECATED - Use connectSignerWalletWithProvider instead)
   */
  async connectSignerWallet(): Promise<WalletConnectionState> {
    throw new Error('DEPRECATED: Use connectSignerWalletWithProvider() instead. This method has been removed to prevent automatic MetaMask connections.');
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    // Disconnect wallet provider if connected
    if (this.currentWalletProvider) {
      await this.currentWalletProvider.disconnect();
      this.currentWalletProvider = null;
    }

    this.provider = null;
    this.signer = null;

    this.state = {
      isConnected: false,
      signerConnected: false,
      readOnlyMode: false,
      walletProviderType: undefined
    };

    this.removeEventListeners();
    this.notifyListeners();
  }

  /**
   * Disconnect only the signer wallet (keep Safe wallet connected in read-only mode)
   */
  async disconnectSignerWallet(): Promise<void> {
    // Disconnect wallet provider if connected
    if (this.currentWalletProvider) {
      await this.currentWalletProvider.disconnect();
      this.currentWalletProvider = null;
    }

    this.provider = null;
    this.signer = null;

    // Update Safe Wallet Service to remove signer
    await safeWalletService.setSigner(null);

    this.state = {
      ...this.state,
      address: undefined,
      isOwner: false,
      signerConnected: false,
      signerAddress: undefined,
      signerBalance: undefined,
      readOnlyMode: true,
      walletProviderType: undefined,
      error: undefined
    };

    this.removeEventListeners();
    this.notifyListeners();
  }

  /**
   * Switch to a different signer wallet account
   * (Legacy method - DEPRECATED - Use connectSignerWalletWithProvider instead)
   */
  async switchSignerWallet(): Promise<WalletConnectionState> {
    throw new Error('DEPRECATED: Use connectSignerWalletWithProvider() instead. This method has been removed to prevent automatic MetaMask connections.');
  }

  /**
   * Switch network for an already connected Safe wallet
   */
  async switchNetwork(newNetwork: string): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      // Reconnect to the same Safe wallet on the new network
      // Always use read-only mode for network switching to avoid MetaMask popup
      return await this.connectWallet({
        safeAddress: this.state.safeAddress,
        network: newNetwork,
        readOnlyMode: true
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to switch network';
      this.state = {
        ...this.state,
        error: errorMessage
      };

      this.notifyListeners();
      throw new Error(errorMessage);
    }
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
   * Get current provider (if connected)
   */
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  /**
   * Get current signer (if connected)
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
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
   * Alias for subscribe method for convenience
   */
  onConnectionStateChange(listener: (state: WalletConnectionState) => void): () => void {
    return this.subscribe(listener);
  }

  /**
   * Get current connection state (alias for getState)
   */
  getConnectionState(): WalletConnectionState {
    return this.getState();
  }

  /**
   * Setup event listeners for wallet provider events
   */
  private setupEventListenersWithProvider(walletProvider: WalletProvider): void {
    // Account changed
    walletProvider.on('accountsChanged', this.handleAccountsChanged.bind(this));

    // Network changed
    walletProvider.on('chainChanged', this.handleChainChanged.bind(this));

    // Disconnect
    walletProvider.on('disconnect', this.handleDisconnect.bind(this));
  }

  /**
   * Setup event listeners for wallet events (legacy MetaMask)
   */
  private setupEventListeners(): void {
    // DISABLED TO PREVENT METAMASK POPUP
    console.log('Event listeners disabled to prevent MetaMask popup');
    // if (!window.ethereum) return;

    // // Account changed
    // window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));

    // // Network changed
    // window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Remove wallet provider listeners
    if (this.currentWalletProvider) {
      this.currentWalletProvider.removeAllListeners();
    }

    // Remove legacy MetaMask listeners
    if (window.ethereum) {
      try {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      } catch (error) {
        console.warn('Error removing MetaMask listeners:', error);
      }
    }
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
        // Always use read-only mode to avoid MetaMask popup on network change
        await this.connectWallet({
          safeAddress: this.state.safeAddress,
          network: this.state.network || 'ethereum',
          readOnlyMode: true
        });
      } catch (error) {
        console.error('Error reconnecting after network change:', error);
        await this.disconnectWallet();
      }
    }
  }

  /**
   * Handle wallet disconnect
   */
  private async handleDisconnect(): Promise<void> {
    console.log('Wallet disconnected');
    await this.disconnectSignerWallet();
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
   * Get available wallet providers
   */
  getAvailableWalletProviders() {
    return WalletProviderFactory.getAvailableProviderInfo();
  }

  /**
   * Get current wallet provider type
   */
  getCurrentWalletProviderType(): WalletProviderType | null {
    return this.state.walletProviderType || null;
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
