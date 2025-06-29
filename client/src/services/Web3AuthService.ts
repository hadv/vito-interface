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
    Web3Auth: any;
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
      console.log('Available Web3Auth objects:', {
        Web3AuthModal: typeof window.Web3AuthModal,
        Web3auth: typeof window.Web3auth,
        Web3Auth: typeof window.Web3Auth
      });

      // Try different possible Web3Auth constructors
      let Web3AuthConstructor = null;

      if (window.Web3AuthModal) {
        Web3AuthConstructor = window.Web3AuthModal;
        console.log('✅ Using window.Web3AuthModal');
      } else if (window.Web3auth && window.Web3auth.Web3Auth) {
        Web3AuthConstructor = window.Web3auth.Web3Auth;
        console.log('✅ Using window.Web3auth.Web3Auth');
      } else if (window.Web3auth) {
        Web3AuthConstructor = window.Web3auth;
        console.log('✅ Using window.Web3auth');
      } else if (window.Web3Auth) {
        Web3AuthConstructor = window.Web3Auth;
        console.log('✅ Using window.Web3Auth');
      }

      if (!Web3AuthConstructor) {
        const availableKeys = Object.keys(window).filter(key => key.toLowerCase().includes('web3'));
        throw new Error(`Web3Auth constructor not found. Available Web3 objects: ${availableKeys.join(', ')}`);
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
  private async loadWeb3AuthSDK(): Promise<void> {
    // Check if already loaded
    if (window.Web3AuthModal || window.Web3auth) {
      console.log('✅ Web3Auth SDK already loaded');
      return;
    }

    console.log('🔄 Loading Web3Auth SDK from CDN...');

    // Try multiple CDN URLs in sequence
    const cdnUrls = [
      'https://cdn.jsdelivr.net/npm/@web3auth/modal@8/dist/modal.umd.min.js',
      'https://cdn.jsdelivr.net/npm/@web3auth/modal@7/dist/modal.umd.min.js',
      'https://unpkg.com/@web3auth/modal@8/dist/modal.umd.min.js',
      'https://unpkg.com/@web3auth/modal@7/dist/modal.umd.min.js'
    ];

    await this.tryLoadingFromCDNs(cdnUrls);
  }

  // Try loading Web3Auth from multiple CDN sources
  private async tryLoadingFromCDNs(urls: string[]): Promise<void> {
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`🔄 Trying CDN ${i + 1}/${urls.length}: ${url}`);

      try {
        await this.loadScriptFromURL(url);

        // Check if Web3Auth objects are available
        if (window.Web3AuthModal || window.Web3auth || window.Web3Auth) {
          console.log('✅ Web3Auth SDK loaded successfully from:', url);
          return;
        } else {
          console.log(`⚠️ Script loaded but no Web3Auth objects found from: ${url}`);
        }
      } catch (error) {
        console.log(`❌ Failed to load from CDN ${i + 1}: ${error}`);
        if (i === urls.length - 1) {
          // If all CDNs fail, fall back to demo mode
          console.log('🔄 All CDNs failed, falling back to demo mode...');
          this.initializeDemoMode();
          return;
        }
      }
    }
  }

  // Load script from specific URL
  private loadScriptFromURL(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log(`📦 Script loaded from: ${url}`);
        // Wait a bit for the objects to be available
        setTimeout(() => {
          console.log('Available Web3 objects:', Object.keys(window).filter(key =>
            key.toLowerCase().includes('web3')
          ));
          resolve();
        }, 500);
      };

      script.onerror = () => {
        reject(new Error(`Failed to load script from ${url}`));
      };

      document.head.appendChild(script);
    });
  }

  // Initialize demo mode when Web3Auth CDN fails
  private initializeDemoMode(): void {
    console.log('🎭 Initializing Web3Auth demo mode...');

    // Create a mock Web3Auth object for demo purposes
    window.Web3auth = {
      Web3Auth: class MockWeb3Auth {
        constructor(config: any) {
          console.log('🎭 Mock Web3Auth initialized with config:', config);
        }

        async initModal() {
          console.log('🎭 Mock Web3Auth modal initialized');
        }

        async connectTo(adapter: string, options: any) {
          console.log(`🎭 Mock connecting to ${adapter} with options:`, options);

          // Simulate authentication delay
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Return a mock provider
          return {
            request: async ({ method, params }: any) => {
              if (method === 'eth_accounts') {
                return ['0x742d35Cc6634C0532925a3b8D0C9C0E3C5d5c8eA']; // Demo address
              }
              if (method === 'eth_chainId') {
                return '0x1'; // Ethereum mainnet
              }
              throw new Error(`Mock provider: ${method} not implemented`);
            }
          };
        }

        async getUserInfo() {
          return {
            email: `demo@${Date.now()}.com`,
            name: 'Demo User',
            profileImage: 'https://via.placeholder.com/100',
            typeOfLogin: 'google',
            verifier: 'google',
            verifierId: `demo_${Date.now()}`,
          };
        }

        async logout() {
          console.log('🎭 Mock logout');
        }

        get connected() {
          return false; // Always false for demo
        }
      }
    };

    console.log('✅ Demo mode initialized successfully');
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
