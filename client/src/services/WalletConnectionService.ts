import { ethers } from 'ethers';
import { safeWalletService, SafeWalletService, SafeWalletConfig } from './SafeWalletService';
import { getRpcUrl, NETWORK_CONFIGS } from '../contracts/abis';

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

  /**
   * Connect to a Safe wallet (can be read-only or with signer)
   */
  async connectWallet(params: ConnectWalletParams): Promise<WalletConnectionState> {
    try {
      const readOnlyMode = params.readOnlyMode || false;
      let userAddress: string | undefined;
      let isOwner = false;

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

      // Only try to connect signer after Safe wallet is validated
      if (!readOnlyMode) {
        try {
          // Check if MetaMask or other wallet is available
          if (typeof window.ethereum !== 'undefined') {
            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Create provider and signer
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();

            // Get user address
            userAddress = await this.signer.getAddress();

            // Update Safe Wallet Service with signer
            await safeWalletService.setSigner(this.signer);
          }
        } catch (signerError) {
          console.warn('Failed to connect signer wallet, continuing in read-only mode:', signerError);
          // Continue in read-only mode if signer connection fails
        }
      }

      // Check if user is owner (only if we have a signer)
      if (userAddress) {
        isOwner = await safeWalletService.isOwner(userAddress);
      }

      // Get signer balance if we have a signer
      let signerBalance: string | undefined;
      if (this.signer && userAddress) {
        const balance = await this.provider!.getBalance(userAddress);
        signerBalance = ethers.utils.formatEther(balance);
      }

      // Update state
      this.state = {
        isConnected: true,
        address: userAddress,
        safeAddress: params.safeAddress,
        network: params.network,
        balance: safeInfo.balance,
        isOwner,
        signerConnected: !!this.signer,
        signerAddress: userAddress,
        signerBalance,
        readOnlyMode: !this.signer,
        error: undefined
      };

      // Always remove existing event listeners first
      this.removeEventListeners();

      // Don't set up event listeners in read-only mode to prevent MetaMask interactions
      // Set up event listeners for account/network changes (only if signer is connected)
      if (this.signer && !readOnlyMode) {
        this.setupEventListeners();
      }

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
   * Check if wallet network matches Safe network and prompt switching if needed
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
   * Connect signer wallet to an already connected Safe wallet with network validation
   */
  async connectSignerWallet(): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      // Check if MetaMask or other wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Check and switch network if needed
      const networkResult = await this.checkAndSwitchNetwork(this.state.network!);
      if (!networkResult.switched) {
        throw new Error(networkResult.error || `Please switch your wallet to ${this.state.network} network`);
      }

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();

      // Get user address
      const userAddress = await this.signer.getAddress();

      // Get signer balance
      const signerBalance = await this.provider.getBalance(userAddress);
      const formattedSignerBalance = ethers.utils.formatEther(signerBalance);

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
        signerBalance: formattedSignerBalance,
        readOnlyMode: false,
        error: undefined
      };

      // Set up event listeners for account/network changes
      this.setupEventListeners();

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
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer = null;

    this.state = {
      isConnected: false,
      signerConnected: false,
      readOnlyMode: false
    };

    this.removeEventListeners();
    this.notifyListeners();
  }

  /**
   * Disconnect only the signer wallet (keep Safe wallet connected in read-only mode)
   */
  async disconnectSignerWallet(): Promise<void> {
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
      error: undefined
    };

    this.removeEventListeners();
    this.notifyListeners();
  }

  /**
   * Switch to a different signer wallet account
   */
  async switchSignerWallet(): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      // Check if MetaMask or other wallet is available
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Request account access (this will show MetaMask account selector)
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      // Get accounts after permission request
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      // Check and switch network if needed
      const networkResult = await this.checkAndSwitchNetwork(this.state.network!);
      if (!networkResult.switched) {
        throw new Error(networkResult.error || `Please switch your wallet to ${this.state.network} network`);
      }

      // Create provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();

      // Get user address
      const userAddress = await this.signer.getAddress();

      // Get signer balance
      const signerBalance = await this.provider.getBalance(userAddress);
      const formattedSignerBalance = ethers.utils.formatEther(signerBalance);

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
        signerBalance: formattedSignerBalance,
        readOnlyMode: false,
        error: undefined
      };

      // Set up event listeners for account/network changes
      this.setupEventListeners();

      // Notify listeners
      this.notifyListeners();

      return this.state;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to switch signer wallet';
      this.state = {
        ...this.state,
        error: errorMessage
      };

      this.notifyListeners();
      throw new Error(errorMessage);
    }
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
    if (!window.ethereum) return;

    try {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    } catch (error) {
      console.warn('Error removing MetaMask listeners:', error);
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
