import { ethers } from 'ethers';
import { googleOAuthService, GoogleOAuthState } from './GoogleOAuthService';

export interface Web3AuthState {
  isConnected: boolean;
  isConnecting: boolean;
  user?: any;
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

/**
 * Web3Auth Service for Social Login Integration
 * Simplified implementation for production readiness
 * TODO: Replace with full Web3Auth SDK when dependency conflicts are resolved
 */
export class Web3AuthService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private state: Web3AuthState = {
    isConnected: false,
    isConnecting: false
  };
  private listeners: ((state: Web3AuthState) => void)[] = [];

  constructor() {
    // Initialize Google OAuth service
    this.initializeGoogleOAuth();
    console.log('🚀 Web3AuthService initialized with Google OAuth integration');
  }

  // Initialize Google OAuth integration
  private async initializeGoogleOAuth(): Promise<void> {
    try {
      // Subscribe to Google OAuth state changes
      googleOAuthService.subscribe((googleState: GoogleOAuthState) => {
        this.handleGoogleOAuthStateChange(googleState);
      });

      // Initialize Google OAuth
      await googleOAuthService.initialize();
    } catch (error) {
      console.error('❌ Failed to initialize Google OAuth:', error);
    }
  }

  // Handle Google OAuth state changes
  private handleGoogleOAuthStateChange(googleState: GoogleOAuthState): void {
    if (googleState.isAuthenticated && googleState.user && googleState.wallet) {
      // Update Web3Auth state with Google OAuth data
      this.updateState({
        isConnected: true,
        isConnecting: false,
        user: {
          id: googleState.user.id,
          email: googleState.user.email,
          name: googleState.user.name,
          profileImage: googleState.user.picture,
        },
        provider: googleOAuthService.getProvider() || undefined,
        address: googleState.wallet.address,
        socialProvider: 'google',
        error: undefined,
      });
    } else if (googleState.error) {
      this.updateState({
        isConnected: false,
        isConnecting: false,
        error: googleState.error || undefined,
      });
    } else if (googleState.isLoading) {
      this.updateState({
        isConnecting: true,
        error: undefined,
      });
    }
  }

  /**
   * Real Google OAuth integration
   */
  private async authenticateWithGoogle(): Promise<{ address: string; user: any }> {
    try {
      // Check if Google OAuth is configured
      if (!googleOAuthService.isConfigured()) {
        throw new Error('Google OAuth is not configured. Please set REACT_APP_GOOGLE_CLIENT_ID in your environment variables.');
      }

      // Trigger Google OAuth sign-in
      await googleOAuthService.signIn();

      // Wait for authentication to complete
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Google OAuth timeout'));
        }, 30000); // 30 second timeout

        const unsubscribe = googleOAuthService.subscribe((state) => {
          if (state.isAuthenticated && state.user && state.wallet) {
            clearTimeout(timeout);
            unsubscribe();
            resolve({
              address: state.wallet.address,
              user: {
                id: state.user.id,
                email: state.user.email,
                name: state.user.name,
                profileImage: state.user.picture,
              },
            });
          } else if (state.error) {
            clearTimeout(timeout);
            unsubscribe();
            reject(new Error(state.error));
          }
        });
      });
    } catch (error) {
      console.error('❌ Google OAuth authentication failed:', error);
      throw error;
    }
  }

  /**
   * Fallback demo login for non-Google providers
   */
  private async simulateSocialLogin(provider: string): Promise<{ address: string; user: any }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate a demo wallet for the social login
    const wallet = ethers.Wallet.createRandom();
    const address = wallet.address;

    // Create mock user data
    const user = {
      email: `user@${provider}.com`,
      name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
      profileImage: `https://ui-avatars.com/api/?name=${provider}&background=3b82f6&color=fff`,
      typeOfLogin: provider,
      verifier: provider,
      verifierId: `${provider}_${Date.now()}`,
    };

    return { address, user };
  }

  /**
   * Connect with a specific social provider
   */
  async connectWithSocial(loginProvider: string): Promise<Web3AuthState> {
    if (this.state.isConnecting) {
      throw new Error('Connection already in progress');
    }

    this.updateState({ isConnecting: true, error: undefined });

    try {
      console.log(`🔗 Connecting with ${loginProvider}...`);

      let address: string;
      let user: any;

      // Use real Google OAuth for Google provider, fallback to demo for others
      if (loginProvider === 'google') {
        const result = await this.authenticateWithGoogle();
        address = result.address;
        user = result.user;

        // Set provider from Google OAuth service
        this.provider = googleOAuthService.getProvider();
        this.signer = this.provider?.getSigner() || null;
      } else {
        // Fallback to demo implementation for other providers
        const result = await this.simulateSocialLogin(loginProvider);
        address = result.address;
        user = result.user;
      }

      this.updateState({
        isConnected: true,
        isConnecting: false,
        user,
        provider: this.provider || undefined,
        address,
        socialProvider: loginProvider,
        error: undefined
      });

      console.log(`✅ Successfully connected with ${loginProvider}`);
      console.log(`📧 User: ${user.email}`);
      console.log(`🔑 Address: ${address}`);

      return this.state;
    } catch (error: any) {
      console.error(`❌ Failed to connect with ${loginProvider}:`, error);
      const errorMessage = error.message || `Failed to connect with ${loginProvider}`;
      this.updateState({
        isConnecting: false,
        error: errorMessage
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Disconnect from Web3Auth
   */
  async disconnect(): Promise<void> {
    try {
      console.log('🔌 Disconnecting Web3Auth...');

      // If connected via Google OAuth, sign out from Google
      if (this.state.socialProvider === 'google') {
        await googleOAuthService.signOut();
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
        error: undefined
      });

      console.log('✅ Successfully disconnected from Web3Auth');
    } catch (error) {
      console.error('❌ Failed to disconnect from Web3Auth:', error);
      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): Web3AuthState {
    return { ...this.state };
  }

  /**
   * Get ethers provider
   */
  getEthersProvider(): ethers.providers.Web3Provider | null {
    return this.provider;
  }

  /**
   * Get ethers signer
   */
  getEthersSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: Web3AuthState) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  /**
   * Update state and notify listeners
   */
  private updateState(updates: Partial<Web3AuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Check if Web3Auth is initialized
   */
  isInitialized(): boolean {
    return true; // Always initialized in simplified version
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state.isConnected;
  }

  /**
   * Check if currently connecting
   */
  isConnecting(): boolean {
    return this.state.isConnecting;
  }
}

// Export singleton instance
export const web3AuthService = new Web3AuthService();
