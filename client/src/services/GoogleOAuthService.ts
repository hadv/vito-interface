import { ethers } from 'ethers';

// Google OAuth Types
interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
}

interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

interface GoogleOAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: GoogleUser | null;
  error: string | null;
  wallet: {
    address: string;
    privateKey: string;
  } | null;
}

declare global {
  interface Window {
    google: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          prompt: () => void;
          renderButton: (element: HTMLElement, config: any) => void;
          disableAutoSelect: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

class GoogleOAuthService {
  private state: GoogleOAuthState = {
    isAuthenticated: false,
    isLoading: false,
    user: null,
    error: null,
    wallet: null,
  };

  private listeners: Array<(state: GoogleOAuthState) => void> = [];
  private clientId: string;
  private isInitialized = false;

  constructor() {
    this.clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
    if (!this.clientId) {
      console.warn('Google Client ID not found in environment variables');
    }
  }

  // Initialize Google OAuth
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load Google Identity Services script
      await this.loadGoogleScript();
      
      // Initialize Google OAuth
      window.google.accounts.id.initialize({
        client_id: this.clientId,
        callback: this.handleCredentialResponse.bind(this),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      this.isInitialized = true;
      console.log('✅ Google OAuth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Google OAuth:', error);
      this.updateState({ error: 'Failed to initialize Google OAuth' });
      throw error;
    }
  }

  // Load Google Identity Services script
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait a bit for the Google object to be available
        setTimeout(() => {
          if (window.google?.accounts?.id) {
            resolve();
          } else {
            reject(new Error('Google Identity Services failed to load'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services script'));
      };

      document.head.appendChild(script);
    });
  }

  // Handle Google credential response
  private async handleCredentialResponse(response: GoogleCredentialResponse): Promise<void> {
    try {
      this.updateState({ isLoading: true, error: null });

      // Decode JWT token to get user info
      const userInfo = this.decodeJWT(response.credential);
      console.log('🔐 Google OAuth successful:', userInfo);

      // Generate Ethereum wallet from Google user ID
      const wallet = this.generateWalletFromGoogleId(userInfo.sub);

      // Update state with authenticated user and wallet
      this.updateState({
        isAuthenticated: true,
        isLoading: false,
        user: {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          given_name: userInfo.given_name,
          family_name: userInfo.family_name,
        },
        wallet,
        error: null,
      });

      console.log('✅ Google OAuth authentication completed');
      console.log('🔑 Generated wallet address:', wallet.address);

    } catch (error) {
      console.error('❌ Google OAuth authentication failed:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });
    }
  }

  // Decode JWT token
  private decodeJWT(token: string): any {
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
      throw new Error('Failed to decode Google JWT token');
    }
  }

  // Generate deterministic Ethereum wallet from Google user ID
  private generateWalletFromGoogleId(googleId: string): { address: string; privateKey: string } {
    try {
      // Create a deterministic seed from Google ID
      // In production, you might want to add additional entropy or use a more secure method
      const seed = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`google_oauth_${googleId}`));
      
      // Create wallet from seed
      const wallet = new ethers.Wallet(seed);
      
      return {
        address: wallet.address,
        privateKey: wallet.privateKey,
      };
    } catch (error) {
      throw new Error('Failed to generate wallet from Google ID');
    }
  }

  // Sign in with Google
  async signIn(): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      this.updateState({ isLoading: true, error: null });

      // Trigger Google OAuth popup
      window.google.accounts.id.prompt();

    } catch (error) {
      console.error('❌ Google sign-in failed:', error);
      this.updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign-in failed',
      });
      throw error;
    }
  }

  // Sign out
  async signOut(): Promise<void> {
    try {
      if (this.state.user?.email) {
        // Revoke Google OAuth token
        window.google.accounts.id.revoke(this.state.user.email, () => {
          console.log('✅ Google OAuth token revoked');
        });
      }

      // Reset state
      this.updateState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        wallet: null,
        error: null,
      });

      console.log('✅ Google OAuth sign-out completed');
    } catch (error) {
      console.error('❌ Google sign-out failed:', error);
      throw error;
    }
  }

  // Get current state
  getState(): GoogleOAuthState {
    return { ...this.state };
  }

  // Get Ethereum provider from wallet
  getProvider(): ethers.providers.Web3Provider | null {
    if (!this.state.wallet) return null;

    try {
      // Create a provider using the generated wallet
      const wallet = new ethers.Wallet(this.state.wallet.privateKey);
      
      // For demo purposes, we'll create a provider that can sign transactions
      // In production, you might want to connect to a real network
      const provider = new ethers.providers.JsonRpcProvider('https://ethereum.publicnode.com');
      const connectedWallet = wallet.connect(provider);
      
      // Create a Web3Provider-like object
      return {
        getSigner: () => connectedWallet,
        getNetwork: () => provider.getNetwork(),
        getBalance: (address: string) => provider.getBalance(address),
        getTransactionCount: (address: string) => provider.getTransactionCount(address),
        sendTransaction: (transaction: any) => connectedWallet.sendTransaction(transaction),
        // Add other necessary methods as needed
      } as any;
    } catch (error) {
      console.error('❌ Failed to create provider:', error);
      return null;
    }
  }

  // Subscribe to state changes
  subscribe(listener: (state: GoogleOAuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Update state and notify listeners
  private updateState(updates: Partial<GoogleOAuthState>): void {
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state));
  }

  // Check if Google OAuth is configured
  isConfigured(): boolean {
    return !!this.clientId && this.clientId !== 'your-google-oauth-client-id-here';
  }
}

// Export singleton instance
export const googleOAuthService = new GoogleOAuthService();
export type { GoogleOAuthState, GoogleUser };
