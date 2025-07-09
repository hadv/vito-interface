import { ethers } from 'ethers';
import { safeWalletService, SafeWalletService, SafeWalletConfig } from './SafeWalletService';
import { getRpcUrl, NETWORK_CONFIGS, SAFE_ABI } from '../contracts/abis';
import { walletConnectService } from './WalletConnectService';
import { web3AuthService } from './Web3AuthService';

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
  chainId?: number;
  // Track wallet type for proper icon display
  walletType?: 'metamask' | 'walletconnect' | 'ledger' | 'privatekey' | 'web3auth';
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
  private provider: ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;

  constructor() {
    // Set up WalletConnect event listeners for mobile wallet disconnections
    this.setupWalletConnectEventListeners();

    // Set up periodic connection verification for WalletConnect
    this.setupConnectionVerification();
  }

  /**
   * Set up WalletConnect event listeners to handle mobile wallet disconnections
   */
  private setupWalletConnectEventListeners(): void {
    // Listen for WalletConnect session disconnections
    walletConnectService.addEventListener('session_disconnected', (data: any) => {
      console.log('WalletConnect session disconnected:', data);

      // Only handle disconnections initiated by mobile wallet or system
      if (data?.initiatedBy === 'mobile' || data?.initiatedBy === 'system') {
        console.log('Mobile wallet disconnected, updating app state...');

        // If we currently have a WalletConnect signer connected, disconnect it
        if (this.state.signerConnected && this.state.walletType === 'walletconnect') {
          this.handleMobileWalletDisconnection(data?.reason || 'Mobile wallet disconnected');
        }
      }
    });

    // Listen for session deletion events
    walletConnectService.addEventListener('session_delete', (data: any) => {
      console.log('WalletConnect session deleted:', data);

      // Handle session deletion (mobile wallet disconnected)
      if (this.state.signerConnected && this.state.walletType === 'walletconnect') {
        this.handleMobileWalletDisconnection('Mobile wallet session deleted');
      }
    });

    // Listen for session expiry events
    walletConnectService.addEventListener('session_expire', (data: any) => {
      console.log('WalletConnect session expired:', data);

      // Handle session expiry
      if (this.state.signerConnected && this.state.walletType === 'walletconnect') {
        this.handleMobileWalletDisconnection('WalletConnect session expired');
      }
    });
  }

  /**
   * Set up periodic connection verification for WalletConnect
   */
  private setupConnectionVerification(): void {
    // Check connection status every 30 seconds for WalletConnect
    setInterval(async () => {
      if (this.state.walletType === 'walletconnect' && this.state.signerConnected) {
        try {
          const isConnected = await walletConnectService.verifyConnection();
          if (!isConnected) {
            console.log('WalletConnect connection verification failed, handling disconnection...');
            await this.handleMobileWalletDisconnection('Connection verification failed');
          }
        } catch (error) {
          console.error('Error during connection verification:', error);
        }
      }
    }, 30000); // 30 seconds
  }

  /**
   * Handle mobile wallet disconnection
   */
  private async handleMobileWalletDisconnection(reason: string): Promise<void> {
    console.log(`Handling mobile wallet disconnection: ${reason}`);

    try {
      // Clear provider and signer
      this.provider = null;
      this.signer = null;

      // Update Safe Wallet Service to remove signer
      await safeWalletService.setSigner(null);

      // Update state to read-only mode
      this.state = {
        ...this.state,
        address: undefined,
        isOwner: false,
        signerConnected: false,
        signerAddress: undefined,
        signerBalance: undefined,
        readOnlyMode: true,
        walletType: undefined,
        error: undefined
      };

      // Remove event listeners
      this.removeEventListeners();

      // Verify WalletConnect is properly cleaned up
      if (walletConnectService.isConnected()) {
        console.log('WalletConnect still shows as connected, verifying...');
        const isStillConnected = await walletConnectService.verifyConnection();
        if (isStillConnected) {
          console.warn('WalletConnect verification shows connection still active, this may indicate a sync issue');
        }
      }

      // Notify all listeners of the state change
      this.notifyListeners();

      console.log('Mobile wallet disconnection handled, switched to read-only mode');
    } catch (error) {
      console.error('Error during mobile wallet disconnection handling:', error);

      // Force state cleanup even if there were errors
      this.state = {
        ...this.state,
        signerConnected: false,
        readOnlyMode: true,
        walletType: undefined,
        error: `Disconnection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      this.notifyListeners();
    }
  }

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
      // NOTE: We don't auto-connect signer wallet here to prevent unwanted popups
      // User must explicitly click "Connect" button to connect signer wallet
      if (!readOnlyMode) {
        console.log('Safe wallet connected in read-only mode. User can connect signer wallet manually.');
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
   * Connect signer wallet using WalletConnect (new implementation)
   */
  async connectWalletConnectSigner(address: string, chainId: number): Promise<WalletConnectionState> {
    console.log('🔗 Connecting WalletConnect signer with new implementation');
    console.log('📋 Address:', address, 'Chain ID:', chainId);

    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    if (!walletConnectService.isConnected()) {
      throw new Error('WalletConnect session not available');
    }

    try {
      // Create read-only provider for the network
      const rpcUrl = getRpcUrl(this.state.network!);
      const readOnlyProvider = new ethers.providers.JsonRpcProvider(rpcUrl);

      // Create WalletConnect signer
      const walletConnectSigner = walletConnectService.createSigner(chainId, readOnlyProvider);
      if (!walletConnectSigner) {
        throw new Error('Failed to create WalletConnect signer');
      }

      // Set the signer
      this.signer = walletConnectSigner;
      this.provider = readOnlyProvider; // Use read-only provider for queries

      // Get signer balance using read-only provider
      console.log('💰 Getting signer balance...');
      const signerBalance = await readOnlyProvider.getBalance(address);
      const formattedSignerBalance = ethers.utils.formatEther(signerBalance);

      // Update Safe Wallet Service with signer
      console.log('🔧 Setting signer in SafeWalletService...');
      await safeWalletService.setSigner(this.signer);

      // Check if user is owner using read-only provider
      console.log('👤 Checking if user is owner...');
      const rpcContract = new ethers.Contract(this.state.safeAddress!, SAFE_ABI, readOnlyProvider);
      const isOwner = await rpcContract.isOwner(address);

      // Update state
      this.state = {
        ...this.state,
        address,
        isOwner,
        signerConnected: true,
        signerAddress: address,
        signerBalance: formattedSignerBalance,
        readOnlyMode: false,
        error: undefined,
        chainId,
        walletType: 'walletconnect'
      };

      console.log('✅ WalletConnect signer connected successfully');
      this.notifyListeners();

      return this.state;
    } catch (error: any) {
      console.error('❌ Failed to connect WalletConnect signer:', error);
      const errorMessage = error.message || 'Failed to connect WalletConnect signer';
      this.state = {
        ...this.state,
        error: errorMessage
      };
      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Connect signer wallet using WalletConnect provider (legacy method)
   */
  async connectWalletConnectSignerLegacy(provider: any, address: string): Promise<WalletConnectionState> {
    console.log('connectWalletConnectSigner called with:', { provider, address });
    console.log('Current wallet connection state:', this.state);

    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      console.log('Creating ethers provider from WalletConnect provider...');
      // Create ethers provider from WalletConnect provider
      this.provider = new ethers.providers.Web3Provider(provider);
      this.signer = this.provider.getSigner();

      // Get network info with timeout
      console.log('Getting network info...');

      // Use Safe wallet's network as default instead of hardcoded mainnet
      let chainId = 1; // Fallback to mainnet
      if (this.state.network) {
        const targetConfig = NETWORK_CONFIGS[this.state.network as keyof typeof NETWORK_CONFIGS];
        if (targetConfig) {
          chainId = targetConfig.chainId;
          console.log('🔄 Using Safe wallet network as default:', { network: this.state.network, chainId });
        }
      }

      try {
        // Add timeout to prevent hanging
        const networkPromise = this.provider.getNetwork();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network request timeout')), 5000)
        );

        const network = await Promise.race([networkPromise, timeoutPromise]) as any;
        chainId = network.chainId;
        console.log('✅ Network info retrieved:', { chainId, name: network.name });
      } catch (networkError) {
        console.error('❌ Failed to get network info (using Safe wallet network):', networkError);
        console.log('🔄 Using Safe wallet chainId:', chainId);
      }

      // Validate network matches Safe wallet network (warning only, don't block)
      console.log('🔍 Validating network compatibility...');
      if (this.state.network) {
        const targetConfig = NETWORK_CONFIGS[this.state.network as keyof typeof NETWORK_CONFIGS];
        if (targetConfig && chainId !== targetConfig.chainId) {
          console.warn('⚠️ Network mismatch (proceeding anyway):', {
            expected: targetConfig.chainId,
            actual: chainId,
            safeNetwork: this.state.network
          });
          console.log('🔄 WalletConnect will use Safe wallet network for compatibility');
          // Use Safe wallet's chainId for compatibility
          chainId = targetConfig.chainId;
        } else {
          console.log('✅ Network validation passed');
        }
      } else {
        console.log('⚠️ No network validation required');
      }

      // Get signer balance - use RPC directly for WalletConnect to avoid timeouts
      console.log('💰 Getting signer balance...');
      let formattedSignerBalance = '0.0';

      // For WalletConnect, skip provider balance check and go straight to RPC
      console.log('🔄 Using RPC directly for WalletConnect balance (avoiding provider timeouts)...');
      try {
        const rpcUrl = getRpcUrl(this.state.network!);
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const rpcBalance = await rpcProvider.getBalance(address);
        formattedSignerBalance = ethers.utils.formatEther(rpcBalance);
        console.log('✅ Signer balance retrieved via RPC:', formattedSignerBalance);
      } catch (rpcError) {
        console.error('❌ RPC balance request failed:', rpcError);
        console.log('🔄 Using default balance:', formattedSignerBalance);
      }

      // Update Safe Wallet Service with signer
      console.log('🔗 Setting signer in Safe Wallet Service...');
      try {
        await safeWalletService.setSigner(this.signer);
        console.log('✅ Signer set in Safe Wallet Service');
      } catch (signerError) {
        console.error('❌ Failed to set signer:', signerError);
        throw signerError;
      }

      // Check if user is owner - use RPC directly for WalletConnect to avoid timeouts
      console.log('👤 Checking if user is owner...');
      let isOwner = false;
      try {
        console.log('🔄 Using RPC-based owner check for WalletConnect (avoiding provider timeouts)...');
        // Use RPC provider directly to avoid WalletConnect timeout issues
        const rpcUrl = getRpcUrl(this.state.network!);
        const rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const rpcContract = new ethers.Contract(this.state.safeAddress!, SAFE_ABI, rpcProvider);

        // Try direct isOwner call with short timeout
        try {
          const ownerPromise = rpcContract.isOwner(address);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC isOwner timeout')), 3000)
          );

          isOwner = await Promise.race([ownerPromise, timeoutPromise]) as boolean;
          console.log('✅ RPC owner check completed:', isOwner);
        } catch (rpcOwnerError) {
          console.log('❌ RPC isOwner failed, trying getOwners fallback:', rpcOwnerError);

          // Fallback: Get all owners and check manually
          const ownersPromise = rpcContract.getOwners();
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('RPC getOwners timeout')), 3000)
          );

          const owners = await Promise.race([ownersPromise, timeoutPromise]) as string[];
          isOwner = owners.map(owner => owner.toLowerCase()).includes(address.toLowerCase());
          console.log('✅ RPC getOwners fallback completed:', { isOwner, totalOwners: owners.length });
        }
      } catch (ownerError) {
        console.error('❌ All owner check methods failed (using default):', ownerError);
        console.log('🔄 Using default owner status:', isOwner);
      }

      // Update state
      console.log('📝 Updating wallet connection state...');
      this.state = {
        ...this.state,
        address,
        isOwner,
        signerConnected: true,
        signerAddress: address,
        signerBalance: formattedSignerBalance,
        readOnlyMode: false,
        error: undefined,
        chainId,
        walletType: 'walletconnect'
      };

      console.log('✅ Updated wallet connection state:', this.state);

      // Notify listeners
      console.log('📢 Notifying listeners...');
      this.notifyListeners();
      console.log('✅ Listeners notified');

      console.log('🎉 WalletConnect signer integration completed successfully!');

      // Test WalletConnect connection
      console.log('🧪 Testing WalletConnect provider...');
      try {
        const testResult = await this.testWalletConnectProvider();
        console.log('✅ WalletConnect provider test result:', testResult);

        // Also test EIP-712 signing capability
        console.log('🧪 Testing EIP-712 signing capability...');
        const signingTestResult = await this.testEIP712Signing();
        console.log('✅ EIP-712 signing test result:', signingTestResult);
      } catch (testError) {
        console.error('❌ WalletConnect provider test failed:', testError);
      }

      return this.state;
    } catch (error: any) {
      console.error('Error in connectWalletConnectSigner:', error);
      const errorMessage = error.message || 'Failed to connect WalletConnect signer';
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
   * Only requests accounts when explicitly called by user action
   */
  async connectSignerWallet(): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      console.log('🔗 User explicitly requested signer wallet connection');

      // Check if MetaMask is available and prioritize it over other wallets
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Detect and use MetaMask specifically to avoid Phantom interference
      let provider = window.ethereum;

      // If multiple wallets are installed, try to use MetaMask specifically
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        const metamaskProvider = window.ethereum.providers.find((p: any) => p.isMetaMask);
        if (metamaskProvider) {
          provider = metamaskProvider;
          console.log('🎯 Using MetaMask provider specifically');
        }
      } else if (window.ethereum.isMetaMask) {
        provider = window.ethereum;
        console.log('🎯 Using MetaMask provider');
      }

      // Check and switch network if needed
      const networkResult = await this.checkAndSwitchNetwork(this.state.network!);
      if (!networkResult.switched) {
        throw new Error(networkResult.error || `Please switch your wallet to ${this.state.network} network`);
      }

      console.log('📱 Requesting wallet account access (user initiated)...');
      // Request account access from the specific provider
      await provider.request({ method: 'eth_requestAccounts' });

      // Create provider and signer using the specific provider
      this.provider = new ethers.providers.Web3Provider(provider);
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
        error: undefined,
        walletType: 'metamask'
      };

      // Set up event listeners for account/network changes
      this.setupEventListeners();

      // Notify listeners
      this.notifyListeners();

      return this.state;
    } catch (error: any) {
      // Handle specific error codes
      let errorMessage = 'Failed to connect signer wallet';

      if (error.code === 4001) {
        // User rejected the request
        errorMessage = 'Connection cancelled by user';
      } else if (error.code === -32002) {
        // Request already pending
        errorMessage = 'Connection request already pending. Please check your wallet.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.state = {
        ...this.state,
        error: errorMessage
      };

      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Connect signer wallet using Web3Auth (Google OAuth)
   */
  async connectWeb3AuthSigner(): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      console.log('🔐 Connecting Web3Auth signer...');

      // Connect with Google OAuth through Web3Auth
      // Note: This will be handled by the Web3Auth hooks in the UI components
      // For now, we'll use the existing Web3Auth service as fallback
      const web3AuthState = await web3AuthService.connectWithGoogle();

      if (!web3AuthState.isConnected || !web3AuthState.address) {
        throw new Error('Failed to connect with Web3Auth');
      }

      // Get Web3Auth provider and signer
      const web3AuthProvider = web3AuthService.getEthereumProvider();
      const web3AuthSigner = web3AuthService.getSigner();

      if (!web3AuthProvider || !web3AuthSigner) {
        throw new Error('Failed to get Web3Auth provider or signer');
      }

      // Set provider and signer
      this.provider = web3AuthProvider;
      this.signer = web3AuthSigner;

      // Get user address and balance
      const userAddress = web3AuthState.address;
      const signerBalance = await web3AuthService.getBalance();

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
        signerBalance: signerBalance || '0.0',
        readOnlyMode: false,
        error: undefined,
        walletType: 'web3auth'
      };

      console.log('✅ Web3Auth signer connected successfully');
      console.log('👤 User:', web3AuthState.user?.email);
      console.log('📍 Address:', userAddress);
      console.log('💰 Balance:', signerBalance);

      // Notify listeners
      this.notifyListeners();

      return this.state;

    } catch (error: any) {
      console.error('❌ Failed to connect Web3Auth signer:', error);
      const errorMessage = error.message || 'Failed to connect Web3Auth signer';
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
   * @param forceful Whether to force cleanup (used when switching wallets)
   */
  async disconnectSignerWallet(forceful: boolean = false): Promise<void> {
    console.log('Disconnecting signer wallet...', forceful ? '(forceful)' : '');

    // If WalletConnect is connected, disconnect it properly
    if (this.state.walletType === 'walletconnect') {
      try {
        if (forceful) {
          // Force disconnect and cleanup when switching wallets
          console.log('Force disconnecting WalletConnect for wallet switch...');
          await walletConnectService.forceDisconnectAndCleanup();
        } else if (walletConnectService.isConnected()) {
          console.log('Disconnecting WalletConnect session...');
          await walletConnectService.disconnect('User disconnected from app');
          console.log('WalletConnect disconnected from app');

          // Verify disconnection was successful
          const isStillConnected = await walletConnectService.verifyConnection();
          if (isStillConnected) {
            console.warn('WalletConnect still shows as connected after disconnect attempt');
            // Force cleanup
            await this.handleMobileWalletDisconnection('Forced cleanup after failed disconnect');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to disconnect WalletConnect:', error);
        // Continue with local cleanup even if WalletConnect disconnect failed
      }
    }

    // If Web3Auth is connected, disconnect it properly
    if (this.state.walletType === 'web3auth') {
      try {
        console.log('Disconnecting Web3Auth session...');
        await web3AuthService.disconnect();
        console.log('Web3Auth disconnected successfully');
      } catch (error) {
        console.error('Failed to disconnect Web3Auth:', error);
        // Continue with local cleanup even if Web3Auth disconnect failed
      }
    }

    // Clear local state
    this.provider = null;
    this.signer = null;

    try {
      // Update Safe Wallet Service to remove signer
      await safeWalletService.setSigner(null);
    } catch (error) {
      console.error('Failed to update Safe Wallet Service:', error);
    }

    // Update state to read-only mode
    this.state = {
      ...this.state,
      address: undefined,
      isOwner: false,
      signerConnected: false,
      signerAddress: undefined,
      signerBalance: undefined,
      readOnlyMode: true,
      walletType: undefined,
      error: undefined
    };

    // Remove event listeners
    this.removeEventListeners();

    // Notify all listeners of the state change
    this.notifyListeners();

    console.log('Signer wallet disconnected successfully, switched to read-only mode');
  }

  /**
   * Force cleanup of all wallet connections (emergency cleanup)
   */
  async forceCleanupConnections(): Promise<void> {
    console.log('Force cleaning up all wallet connections...');

    try {
      // Force disconnect WalletConnect if it's connected
      if (walletConnectService.isConnected()) {
        try {
          await walletConnectService.disconnect('Force cleanup');
        } catch (error) {
          console.error('Failed to force disconnect WalletConnect:', error);
        }
      }

      // Clear all local state
      this.provider = null;
      this.signer = null;

      // Update Safe Wallet Service
      try {
        await safeWalletService.setSigner(null);
      } catch (error) {
        console.error('Failed to clear Safe Wallet Service signer:', error);
      }

      // Reset state
      this.state = {
        isConnected: false,
        signerConnected: false,
        readOnlyMode: false
      };

      // Remove all event listeners
      this.removeEventListeners();

      // Notify listeners
      this.notifyListeners();

      console.log('Force cleanup completed');
    } catch (error) {
      console.error('Error during force cleanup:', error);
      throw error;
    }
  }

  /**
   * Switch to a different signer wallet account
   */
  async switchSignerWallet(): Promise<WalletConnectionState> {
    if (!this.state.isConnected || !this.state.safeAddress) {
      throw new Error('Safe wallet must be connected first');
    }

    try {
      // Check if MetaMask is available and prioritize it over other wallets
      if (typeof window.ethereum === 'undefined') {
        throw new Error('No wallet detected. Please install MetaMask or another Web3 wallet.');
      }

      // Detect and use MetaMask specifically to avoid Phantom interference
      let provider = window.ethereum;

      // If multiple wallets are installed, try to use MetaMask specifically
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        const metamaskProvider = window.ethereum.providers.find((p: any) => p.isMetaMask);
        if (metamaskProvider) {
          provider = metamaskProvider;
        }
      } else if (window.ethereum.isMetaMask) {
        provider = window.ethereum;
      }

      // Request account access (this will show MetaMask account selector)
      await provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });

      // Get accounts after permission request
      const accounts = await provider.request({ method: 'eth_requestAccounts' });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect your wallet.');
      }

      // Check and switch network if needed
      const networkResult = await this.checkAndSwitchNetwork(this.state.network!);
      if (!networkResult.switched) {
        throw new Error(networkResult.error || `Please switch your wallet to ${this.state.network} network`);
      }

      // Create provider and signer using the specific provider
      this.provider = new ethers.providers.Web3Provider(provider);
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
   * Test WalletConnect provider functionality
   */
  private async testWalletConnectProvider(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.provider || !this.signer) {
        return { success: false, error: 'No provider or signer available' };
      }

      console.log('🧪 Testing basic provider methods...');

      // Test 1: Get accounts
      const accounts = await this.provider.listAccounts();
      console.log('✅ Test 1 - listAccounts():', accounts);

      // Test 2: Get network
      const network = await this.provider.getNetwork();
      console.log('✅ Test 2 - getNetwork():', network);

      // Test 3: Get signer address
      const signerAddress = await this.signer.getAddress();
      console.log('✅ Test 3 - signer.getAddress():', signerAddress);

      // Test 4: Test a simple request
      const chainId = await this.provider.send('eth_chainId', []);
      console.log('✅ Test 4 - eth_chainId:', chainId);

      console.log('🎉 All WalletConnect provider tests passed!');
      return { success: true };
    } catch (error: any) {
      console.error('❌ WalletConnect provider test failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test basic signing with WalletConnect (personal_sign first, then EIP-712)
   */
  async testEIP712Signing(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.provider || !this.signer) {
        return { success: false, error: 'No provider or signer available' };
      }

      const signerAddress = await this.signer.getAddress();
      console.log('📋 Signer address:', signerAddress);

      // Test 1: Try basic personal_sign first
      console.log('🧪 Test 1: Testing basic personal_sign...');
      console.log('📱 IMPORTANT: Please check your mobile wallet app now!');
      console.log('📱 You should see a signing request appear on your mobile wallet.');
      console.log('📱 If you don\'t see it, please:');
      console.log('📱 1. Open your mobile wallet app');
      console.log('📱 2. Make sure it\'s in the foreground');
      console.log('📱 3. Check for any pending notifications');

      try {
        const basicMessage = 'Hello from Vito! This is a test signing request.';
        console.log('📋 Basic message to sign:', basicMessage);

        const basicSignature = await this.provider.send('personal_sign', [
          ethers.utils.hexlify(ethers.utils.toUtf8Bytes(basicMessage)),
          signerAddress
        ]);

        console.log('✅ Basic personal_sign successful:', basicSignature);
      } catch (basicError: any) {
        console.error('❌ Basic personal_sign failed:', basicError);

        // Provide specific troubleshooting based on error
        if (basicError.message?.includes('timeout')) {
          return {
            success: false,
            error: `Signing timeout - Please ensure your mobile wallet app is open and check for pending signing requests. Error: ${basicError.message}`
          };
        } else if (basicError.message?.includes('rejected')) {
          return {
            success: false,
            error: `Signing was rejected by user. This is normal if you cancelled the request.`
          };
        } else {
          return {
            success: false,
            error: `Basic signing failed: ${basicError.message}. Please check your mobile wallet app.`
          };
        }
      }

      // Test 2: Try EIP-712 signing if basic signing worked
      console.log('🧪 Test 2: Testing EIP-712 signing...');
      try {
        // Create a simple test typed data
        const testTypedData = {
          types: {
            EIP712Domain: [
              { name: 'name', type: 'string' },
              { name: 'version', type: 'string' },
              { name: 'chainId', type: 'uint256' }
            ],
            TestMessage: [
              { name: 'message', type: 'string' },
              { name: 'timestamp', type: 'uint256' }
            ]
          },
          primaryType: 'TestMessage',
          domain: {
            name: 'Vito Test',
            version: '1',
            chainId: this.state.chainId || 1
          },
          message: {
            message: 'Test EIP-712 signing',
            timestamp: Math.floor(Date.now() / 1000)
          }
        };

        console.log('📋 Test typed data:', testTypedData);

        // Try to sign using eth_signTypedData_v4
        const eip712Signature = await this.provider.send('eth_signTypedData_v4', [
          signerAddress,
          JSON.stringify(testTypedData)
        ]);

        console.log('✅ EIP-712 test signing successful:', eip712Signature);
        return { success: true };
      } catch (eip712Error: any) {
        console.error('❌ EIP-712 test signing failed:', eip712Error);
        // If basic signing worked but EIP-712 failed, that's still partially successful
        return {
          success: false,
          error: `EIP-712 signing failed (but basic signing worked): ${eip712Error.message}`
        };
      }
    } catch (error: any) {
      console.error('❌ All signing tests failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current connection state
   */
  getState(): WalletConnectionState {
    return { ...this.state };
  }

  /**
   * Get the current signer
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * Get the current provider
   */
  getProvider(): ethers.providers.Web3Provider | ethers.providers.JsonRpcProvider | null {
    return this.provider;
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
    ethereum?: any & {
      providers?: any[];
      isMetaMask?: boolean;
      isPhantom?: boolean;
    };
  }
}
