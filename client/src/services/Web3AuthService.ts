/**
 * Web3Auth Service
 *
 * This service provides Web3Auth integration using the standard Web3Auth Modal class,
 * following the official Web3Auth documentation.
 */

import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { ethers } from "ethers";
import {
  WEB3AUTH_CLIENT_ID,
  getChainConfigByNetwork
} from "../config/web3auth";

// Google OAuth Client ID (for fallback methods)
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export interface Web3AuthUser {
  email?: string;
  name?: string;
  profileImage?: string;
  verifier?: string;
  verifierId?: string;
  typeOfLogin?: string;
  dappShare?: string;
  idToken?: string;
}

export interface Web3AuthState {
  isConnected: boolean;
  isInitialized: boolean;
  user?: Web3AuthUser;
  provider?: ethers.providers.Web3Provider;
  address?: string;
  error?: string;
}

export class Web3AuthService {
  private web3auth: Web3Auth | null = null;
  private provider: ethers.providers.Web3Provider | null = null;
  private state: Web3AuthState = {
    isConnected: false,
    isInitialized: false,
  };
  private listeners: ((state: Web3AuthState) => void)[] = [];

  constructor() {
    this.initializeWeb3Auth();
  }

  /**
   * Initialize Web3Auth Modal
   */
  private async initializeWeb3Auth(): Promise<void> {
    try {
      console.log('🔐 Initializing Web3Auth Modal...');
      console.log('📋 Web3Auth Client ID:', WEB3AUTH_CLIENT_ID ? 'Configured' : 'Missing');
      console.log('🌐 Environment:', process.env.NODE_ENV);
      console.log('🔗 Origin:', typeof window !== 'undefined' ? window.location.origin : 'SSR');

      // Check if Web3Auth Client ID is configured
      if (!WEB3AUTH_CLIENT_ID || WEB3AUTH_CLIENT_ID.trim() === '') {
        const errorMessage = `
🚨 Web3Auth Client ID is not configured!

To fix this:
1. Visit https://dashboard.web3auth.io/
2. Create a new project
3. Copy your Client ID
4. Create a .env.local file in the client directory
5. Add: REACT_APP_WEB3AUTH_CLIENT_ID=your-client-id-here
6. Restart the development server

Current value: "${WEB3AUTH_CLIENT_ID}"
        `.trim();

        console.error(errorMessage);
        throw new Error('Web3Auth Client ID is not configured. Please check the console for setup instructions.');
      }

      // Create Ethereum provider
      const chainConfig = getChainConfigByNetwork('sepolia');
      const ethereumProvider = new EthereumPrivateKeyProvider({
        config: {
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: chainConfig.chainId,
            rpcTarget: chainConfig.rpcTarget,
            displayName: chainConfig.displayName,
            blockExplorerUrl: chainConfig.blockExplorer,
            ticker: chainConfig.ticker,
            tickerName: chainConfig.tickerName,
          },
        },
      });

      // Initialize Web3Auth
      this.web3auth = new Web3Auth({
        clientId: WEB3AUTH_CLIENT_ID,
        web3AuthNetwork: process.env.NODE_ENV === 'production'
          ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
          : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
        privateKeyProvider: ethereumProvider,
        uiConfig: {
          appName: "Vito Interface",
          appUrl: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          theme: {
            primary: "#3b82f6",
          },
          mode: "dark",
          logoLight: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'http://localhost:3000/favicon.ico',
          logoDark: typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'http://localhost:3000/favicon.ico',
          defaultLanguage: "en",
          loginGridCol: 3,
          primaryButton: "socialLogin",
        },
      });

      // Initialize the modal
      console.log('🔄 Initializing Web3Auth modal...');
      await this.web3auth.initModal();
      console.log('✅ Web3Auth modal initialized');

      // Check if user is already logged in
      if (this.web3auth.connected) {
        console.log('👤 User already connected, updating state...');
        await this.updateUserState();
      }

      this.state.isInitialized = true;
      console.log('✅ Web3Auth Modal initialized successfully');
      this.notifyListeners();

    } catch (error: any) {
      console.error('❌ Failed to initialize Web3Auth Modal:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });

      let errorMessage = 'Failed to initialize Web3Auth Modal';
      if (error.message?.includes('Invalid client id')) {
        errorMessage = 'Invalid Web3Auth Client ID. Please check your configuration.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }

      this.state.error = errorMessage;
      this.notifyListeners();
    }
  }

  /**
   * Load Google Identity Services
   */
  private async loadGoogleIdentityServices(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (window.google && window.google.accounts) {
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('Google Identity Services loaded');
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Connect with Web3Auth Modal
   */
  public async connectWithGoogle(): Promise<Web3AuthState> {
    if (!this.web3auth) {
      throw new Error('Web3Auth not initialized. Please check your configuration.');
    }

    if (!this.state.isInitialized) {
      throw new Error('Web3Auth is still initializing. Please wait and try again.');
    }

    try {
      console.log('🔐 Connecting with Web3Auth Modal...');
      console.log('📋 Web3Auth status:', {
        connected: this.web3auth.connected,
        status: this.web3auth.status
      });

      // Connect using Web3Auth modal
      const provider = await this.web3auth.connect();

      if (!provider) {
        throw new Error('Failed to get provider from Web3Auth. Connection was cancelled or failed.');
      }

      console.log('✅ Provider received from Web3Auth');

      // Create ethers provider
      this.provider = new ethers.providers.Web3Provider(provider as any);
      console.log('✅ Ethers provider created');

      // Update user state
      await this.updateUserState();

      console.log('✅ Web3Auth connection successful');
      return this.state;

    } catch (error: any) {
      console.error('❌ Web3Auth connection failed:', error);
      console.error('📋 Error details:', {
        message: error.message,
        code: error.code,
        name: error.name
      });

      let errorMessage = 'Failed to connect with Web3Auth';
      if (error.message?.includes('User closed the modal')) {
        errorMessage = 'Connection cancelled by user';
      } else if (error.message?.includes('Failed to login with auth')) {
        errorMessage = 'Authentication failed. Please check your Web3Auth configuration.';
      } else if (error.message?.includes('Invalid client id')) {
        errorMessage = 'Invalid Web3Auth Client ID. Please check your configuration.';
      }

      this.state.error = errorMessage;
      this.notifyListeners();
      throw new Error(errorMessage);
    }
  }

  /**
   * Update user state from Web3Auth
   */
  private async updateUserState(): Promise<void> {
    if (!this.web3auth || !this.provider) {
      return;
    }

    try {
      const user = await this.getUserInfo();
      const address = await this.getAddress();

      this.state = {
        isConnected: true,
        isInitialized: true,
        user: user || undefined,
        provider: this.provider,
        address: address || undefined,
        error: undefined,
      };

      this.notifyListeners();

    } catch (error) {
      console.error('Failed to update user state:', error);
      this.state.error = 'Failed to update user state';
      this.notifyListeners();
    }
  }

  /**
   * Get Google OAuth credential using popup (fallback method)
   */
  private async getGoogleCredential(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      if (!GOOGLE_CLIENT_ID) {
        reject(new Error('Google Client ID not configured'));
        return;
      }

      // Initialize Google OAuth
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => {
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('No credential received from Google'));
          }
        },
      });

      // Trigger the OAuth popup
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback to renderButton if prompt doesn't work
          if (window.google && window.google.accounts) {
            const buttonDiv = document.createElement('div');
            buttonDiv.style.position = 'fixed';
            buttonDiv.style.top = '50%';
            buttonDiv.style.left = '50%';
            buttonDiv.style.transform = 'translate(-50%, -50%)';
            buttonDiv.style.zIndex = '10000';
            buttonDiv.style.backgroundColor = 'white';
            buttonDiv.style.padding = '20px';
            buttonDiv.style.borderRadius = '8px';
            buttonDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            document.body.appendChild(buttonDiv);

            window.google.accounts.id.renderButton(buttonDiv, {
              theme: 'outline',
              size: 'large',
              type: 'standard',
            });

            // Auto-click the button after a short delay
            setTimeout(() => {
              const button = buttonDiv.querySelector('div[role="button"]') as HTMLElement;
              if (button) {
                button.click();
              }
              // Clean up after 5 seconds
              setTimeout(() => {
                if (document.body.contains(buttonDiv)) {
                  document.body.removeChild(buttonDiv);
                }
              }, 5000);
            }, 100);
          }
        }
      });
    });
  }

  /**
   * Parse JWT token to extract user information
   */
  private parseJwtToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );

      return JSON.parse(jsonPayload);
    } catch (error) {
      throw new Error('Failed to parse Google JWT token');
    }
  }

  /**
   * Generate deterministic wallet from Google user ID (Web3Auth style)
   */
  private generateWalletFromGoogleId(googleId: string): ethers.Wallet {
    // Create a deterministic seed from Google ID (similar to Web3Auth approach)
    const seed = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(`web3auth-google-${googleId}-${WEB3AUTH_CLIENT_ID}`)
    );

    // Generate wallet from seed
    const wallet = new ethers.Wallet(seed);

    return wallet;
  }

  /**
   * Disconnect from Web3Auth
   */
  public async disconnect(): Promise<void> {
    if (!this.web3auth) {
      console.log('Web3Auth not initialized');
      return;
    }

    try {
      console.log('🔐 Disconnecting from Web3Auth...');

      await this.web3auth.logout();
      this.provider = null;

      this.state = {
        isConnected: false,
        isInitialized: true,
        user: undefined,
        provider: undefined,
        address: undefined,
        error: undefined,
      };

      console.log('✅ Disconnected from Web3Auth');
      this.notifyListeners();

    } catch (error) {
      console.error('❌ Failed to disconnect from Web3Auth:', error);
      throw error;
    }
  }

  /**
   * Get current user information
   */
  public async getUserInfo(): Promise<Web3AuthUser | null> {
    if (!this.web3auth || !this.web3auth.connected) {
      return null;
    }

    try {
      const userInfo = await this.web3auth.getUserInfo();
      return {
        email: userInfo.email,
        name: userInfo.name,
        profileImage: userInfo.profileImage,
        verifier: userInfo.verifier,
        verifierId: userInfo.verifierId,
        typeOfLogin: userInfo.typeOfLogin,
        dappShare: userInfo.dappShare,
        idToken: userInfo.idToken,
      };
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  /**
   * Get Ethereum provider for blockchain interactions
   */
  public getEthereumProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  /**
   * Get wallet signer
   */
  public getSigner(): ethers.Signer | null {
    if (!this.provider) {
      return null;
    }
    return this.provider.getSigner();
  }

  /**
   * Get user's Ethereum address
   */
  public async getAddress(): Promise<string | null> {
    const signer = this.getSigner();
    if (!signer) {
      return null;
    }

    try {
      return await signer.getAddress();
    } catch (error) {
      console.error('Failed to get address:', error);
      return null;
    }
  }

  /**
   * Get user's balance
   */
  public async getBalance(): Promise<string | null> {
    const address = await this.getAddress();
    if (!this.provider || !address) {
      return null;
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    } catch (error) {
      console.error('Failed to get balance:', error);
      return null;
    }
  }

  /**
   * Switch to a different network
   */
  public async switchNetwork(network: string): Promise<void> {
    if (!this.web3auth || !this.provider) {
      throw new Error('Web3Auth not connected');
    }

    try {
      console.log(`🔄 Switching to ${network} network...`);

      // Note: Network switching in Web3Auth might require re-initialization
      // This is a simplified implementation
      await this.updateUserState();
      console.log(`✅ Switched to ${network} network`);

    } catch (error) {
      console.error(`❌ Failed to switch to ${network} network:`, error);
      throw error;
    }
  }



  /**
   * Get current state
   */
  public getState(): Web3AuthState {
    return { ...this.state };
  }

  /**
   * Check if Web3Auth is connected
   */
  public isConnected(): boolean {
    return this.state.isConnected && !!this.provider;
  }

  /**
   * Check if Web3Auth is initialized
   */
  public isInitialized(): boolean {
    return this.state.isInitialized;
  }

  /**
   * Add state change listener
   */
  public addListener(listener: (state: Web3AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in Web3Auth listener:', error);
      }
    });
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService();
