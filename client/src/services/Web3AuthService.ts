import { ethers } from 'ethers';

export interface Web3AuthState {
  isConnected: boolean;
  isConnecting: boolean;
  user?: {
    email: string;
    name: string;
    profileImage: string;
    typeOfLogin: string;
    verifier: string;
    verifierId: string;
  };
  provider?: ethers.providers.Web3Provider;
  address?: string;
  socialProvider?: string;
  error?: string;
}

export interface SocialProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
  loginProvider: string;
}

// Web3Auth Global Types
declare global {
  interface Window {
    Web3auth: any;
    Web3AuthModal: any;
  }
}

/**
 * Web3Auth Service for Social Login Integration
 * Uses Web3Auth SDK via CDN to avoid dependency conflicts
 */
export class Web3AuthService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private web3auth: any = null;
  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  private state: Web3AuthState = {
    isConnected: false,
    isConnecting: false,
  };

  private listeners: ((state: Web3AuthState) => void)[] = [];

  constructor() {
    console.log('🚀 Web3AuthService initialized with Web3Auth SDK');
    // Don't initialize immediately, wait for first use
  }

  // Initialize Web3Auth SDK via CDN
  private async initializeWeb3Auth(): Promise<void> {
    // Prevent multiple initialization attempts
    if (this.isInitialized || this.isInitializing) {
      if (this.initializationPromise) {
        await this.initializationPromise;
      }
      return;
    }

    this.isInitializing = true;
    this.initializationPromise = this._doInitialization();

    try {
      await this.initializationPromise;
    } finally {
      this.isInitializing = false;
    }
  }

  private async _doInitialization(): Promise<void> {
    try {
      const clientId = process.env.REACT_APP_WEB3AUTH_CLIENT_ID;

      if (!clientId) {
        console.warn('⚠️ Web3Auth Client ID not found in environment variables');
        throw new Error('Web3Auth Client ID not configured');
      }

      console.log('🔄 Loading Web3Auth SDK...');
      // Load Web3Auth SDK from CDN
      await this.loadWeb3AuthSDK();

      console.log('🔄 Initializing Web3Auth...');
      // Initialize Web3Auth using the correct global object
      const Web3AuthConstructor = window.Web3AuthModal || window.Web3auth?.Web3Auth || window.Web3auth;

      if (!Web3AuthConstructor) {
        throw new Error('Web3Auth constructor not found in global scope');
      }

      this.web3auth = new Web3AuthConstructor({
        clientId,
        web3AuthNetwork: "sapphire_mainnet", // Use string instead of enum
        chainConfig: {
          chainNamespace: "eip155",
          chainId: "0x1", // Ethereum Mainnet
          rpcTarget: "https://rpc.ankr.com/eth",
          displayName: "Ethereum Mainnet",
          blockExplorerUrl: "https://etherscan.io",
          ticker: "ETH",
          tickerName: "Ethereum",
        },
        uiConfig: {
          appName: "Vito Interface",
          appUrl: window.location.origin,
          theme: {
            primary: "#3b82f6",
          },
          mode: "light",
          defaultLanguage: "en",
          loginGridCol: 3,
          primaryButton: "externalLogin",
        },
      });

      await this.web3auth.initModal();
      this.isInitialized = true;
      console.log('✅ Web3Auth initialized successfully');

      // Check if user is already connected
      if (this.web3auth.connected) {
        await this.handleExistingConnection();
      }

    } catch (error) {
      console.error('❌ Failed to initialize Web3Auth:', error);
      this.updateState({
        error: 'Failed to initialize Web3Auth. Please check your configuration.'
      });
      throw error;
    }
  }

  // Load Web3Auth SDK from CDN
  private loadWeb3AuthSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.Web3AuthModal || window.Web3auth) {
        console.log('✅ Web3Auth SDK already loaded');
        resolve();
        return;
      }

      console.log('🔄 Loading Web3Auth SDK from CDN...');
      const script = document.createElement('script');
      // Use the correct Web3Auth Modal CDN URL
      script.src = 'https://cdn.jsdelivr.net/npm/@web3auth/modal@8/dist/modal.umd.min.js';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('📦 Web3Auth SDK script loaded, waiting for initialization...');
        // Wait a bit for the Web3Auth object to be available
        let attempts = 0;
        const checkInterval = setInterval(() => {
          attempts++;
          console.log(`🔍 Checking for Web3Auth objects (attempt ${attempts}/50)...`);
          console.log('Available objects:', {
            Web3AuthModal: !!window.Web3AuthModal,
            Web3auth: !!window.Web3auth,
            windowKeys: Object.keys(window).filter(key => key.toLowerCase().includes('web3'))
          });

          if (window.Web3AuthModal || window.Web3auth) {
            clearInterval(checkInterval);
            console.log('✅ Web3Auth SDK ready');
            resolve();
          } else if (attempts > 50) { // 5 seconds timeout
            clearInterval(checkInterval);
            console.error('❌ Available window objects:', Object.keys(window).filter(key => key.toLowerCase().includes('web3')));
            reject(new Error('Web3Auth SDK failed to initialize after loading'));
          }
        }, 100);
      };

      script.onerror = () => {
        console.error('❌ Failed to load Web3Auth SDK script');
        reject(new Error('Failed to load Web3Auth SDK script'));
      };

      document.head.appendChild(script);
    });
  }

  // Handle existing connection on page load
  private async handleExistingConnection(): Promise<void> {
    try {
      if (!this.web3auth || !this.web3auth.connected) return;

      const web3authProvider = this.web3auth.provider;
      if (!web3authProvider) return;

      // Get user info
      const user = await this.web3auth.getUserInfo();

      // Create ethers provider
      const ethersProvider = new ethers.providers.Web3Provider(web3authProvider as any);
      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();

      this.provider = ethersProvider;
      this.signer = signer;

      this.updateState({
        isConnected: true,
        isConnecting: false,
        user: {
          email: user.email || '',
          name: user.name || '',
          profileImage: user.profileImage || '',
          typeOfLogin: user.typeOfLogin || '',
          verifier: user.verifier || '',
          verifierId: user.verifierId || '',
        },
        provider: ethersProvider,
        address,
        socialProvider: user.typeOfLogin,
        error: undefined,
      });

      console.log('✅ Existing Web3Auth connection restored');
    } catch (error) {
      console.error('❌ Failed to handle existing connection:', error);
    }
  }

  // Connect with social provider
  async connectWithSocial(loginProvider: string): Promise<Web3AuthState> {
    try {
      // Ensure Web3Auth is initialized before attempting connection
      if (!this.isInitialized) {
        console.log('🔄 Web3Auth not initialized, initializing now...');
        await this.initializeWeb3Auth();
      }

      if (!this.web3auth) {
        throw new Error('Web3Auth not initialized');
      }

      this.updateState({ isConnecting: true, error: undefined });

      console.log(`🔗 Connecting with ${loginProvider} via Web3Auth...`);

      // Connect with Web3Auth
      const web3authProvider = await this.web3auth.connectTo("openlogin", {
        loginProvider: loginProvider,
      });

      if (!web3authProvider) {
        throw new Error('Failed to connect with Web3Auth');
      }

      // Get user info
      const user = await this.web3auth.getUserInfo();

      // Create ethers provider
      const ethersProvider = new ethers.providers.Web3Provider(web3authProvider as any);
      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();

      this.provider = ethersProvider;
      this.signer = signer;

      this.updateState({
        isConnected: true,
        isConnecting: false,
        user: {
          email: user.email || '',
          name: user.name || '',
          profileImage: user.profileImage || '',
          typeOfLogin: user.typeOfLogin || '',
          verifier: user.verifier || '',
          verifierId: user.verifierId || '',
        },
        provider: ethersProvider,
        address,
        socialProvider: loginProvider,
        error: undefined,
      });

      console.log(`✅ Successfully connected with ${loginProvider}`);
      console.log('👤 User info:', user);
      console.log('🔑 Wallet address:', address);

      return this.state;
    } catch (error: any) {
      console.error(`❌ Failed to connect with ${loginProvider}:`, error);

      this.updateState({
        isConnecting: false,
        error: error.message || `Failed to connect with ${loginProvider}`,
      });

      throw error;
    }
  }

  // Disconnect from Web3Auth
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting Web3Auth...');

      if (this.web3auth && this.web3auth.connected) {
        await this.web3auth.logout();
      }

      this.provider = null;
      this.signer = null;

      this.updateState({
        isConnected: false,
        isConnecting: false,
        user: undefined,
        provider: undefined,
        address: undefined,
        socialProvider: undefined,
        error: undefined,
      });

      console.log('✅ Web3Auth disconnected successfully');
    } catch (error: any) {
      console.error('❌ Failed to disconnect Web3Auth:', error);
      throw error;
    }
  }

  // Get current state
  getState(): Web3AuthState {
    return { ...this.state };
  }

  // Get provider
  getProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  // Get signer
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  // Subscribe to state changes
  subscribe(listener: (state: Web3AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Update state and notify listeners
  private updateState(updates: Partial<Web3AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Check if Web3Auth is configured
  isConfigured(): boolean {
    const clientId = process.env.REACT_APP_WEB3AUTH_CLIENT_ID;
    return !!clientId && clientId !== 'your-web3auth-client-id-here';
  }

  // Check if Web3Auth is ready
  isReady(): boolean {
    return this.isInitialized && !!this.web3auth;
  }

  // Get initialization status
  getInitializationStatus(): { isInitialized: boolean; isInitializing: boolean } {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing,
    };
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService();
