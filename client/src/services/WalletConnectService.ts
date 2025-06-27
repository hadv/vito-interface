import { SignClient } from '@walletconnect/sign-client';
import QRCode from 'qrcode';
import { ethers } from 'ethers';
import { WalletConnectSigner } from './WalletConnectSigner';
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from '../config/walletconnect';

export class WalletConnectService {
  private signClient: any; // WalletConnect SignClient instance for signer wallet connections
  private dAppClient: any; // WalletConnect SignClient instance for dApp connections
  private sessionTopic: string | null = null; // Store the signer WalletConnect session topic
  private dAppSessionTopic: string | null = null; // Store the dApp WalletConnect session topic
  private isConnecting: boolean = false; // Flag to track connection state
  private listeners: Map<string, Function[]> = new Map();

  constructor() {
    // Initialize empty listeners map for events
    this.listeners.set('session_delete', []);
    this.listeners.set('session_expire', []);
    this.listeners.set('session_update', []);
    this.listeners.set('session_connected', []);
    this.listeners.set('session_disconnected', []);
  }

  /**
   * Add event listener
   * @param event Event name
   * @param callback Callback function
   */
  public addEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);
  }

  /**
   * Remove event listener
   * @param event Event name
   * @param callback Callback function
   */
  public removeEventListener(event: string, callback: Function): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event) || [];
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   * @param event Event name
   * @param data Event data
   */
  private emit(event: string, data?: any): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => callback(data));
  }

  /**
   * Get the current session topic
   * @returns The current session topic
   */
  public getSessionTopic(): string | null {
    return this.sessionTopic;
  }

  /**
   * Get the dApp session topic
   * @returns The dApp session topic
   */
  public getDAppSessionTopic(): string | null {
    return this.dAppSessionTopic;
  }

  /**
   * Setup WalletConnect event listeners
   */
  private setupWalletConnectListeners(): void {
    if (!this.signClient) return;

    // Handle session deletion (when mobile wallet disconnects)
    this.signClient.on('session_delete', ({ topic }: { topic: string }) => {
      console.log(`WalletConnect session deleted by mobile wallet: ${topic}`);
      if (topic === this.sessionTopic) {
        console.log('Mobile wallet initiated disconnection, cleaning up app state...');

        // Clear session state
        this.sessionTopic = null;
        this.connectionResult = null;

        // Emit disconnection event to notify the app
        this.emit('session_disconnected', {
          topic,
          reason: 'Mobile wallet disconnected',
          initiatedBy: 'mobile'
        });
        this.emit('session_delete', { topic });

        console.log('Mobile wallet disconnection cleanup completed');
      }
    });

    // Handle session expiry
    this.signClient.on('session_expire', ({ topic }: { topic: string }) => {
      console.log(`WalletConnect session expired: ${topic}`);
      if (topic === this.sessionTopic) {
        console.log('WalletConnect session expired, cleaning up app state...');

        // Clear session state
        this.sessionTopic = null;
        this.connectionResult = null;

        // Emit disconnection event to notify the app
        this.emit('session_disconnected', {
          topic,
          reason: 'Session expired',
          initiatedBy: 'system'
        });
        this.emit('session_expire', { topic });

        console.log('Session expiry cleanup completed');
      }
    });

    // Handle session events
    this.signClient.on('session_event', (event: any) => {
      console.log('WalletConnect session event:', event);
      this.emit('session_update', event);
    });

    // Handle session ping (to detect connection status)
    this.signClient.on('session_ping', ({ topic }: { topic: string }) => {
      console.log(`WalletConnect session ping: ${topic}`);
      // Respond to ping to maintain connection
      if (topic === this.sessionTopic) {
        this.signClient.respond({
          topic,
          response: { id: Date.now(), result: true, jsonrpc: '2.0' }
        }).catch((error: any) => {
          console.error('Failed to respond to ping:', error);
        });
      }
    });
  }

  /**
   * Initialize WalletConnect with the selected chain ID
   * @param chainId Network chain ID
   * @param forceNew Force a new connection even if one is in progress
   * @returns Promise that resolves when initialization is complete
   */
  public async initialize(chainId: number, forceNew: boolean = false): Promise<void> {
    // If forcing new connection, reset the connecting flag
    if (forceNew) {
      console.log('Forcing new WalletConnect connection...');
      this.isConnecting = false;
    }

    // Prevent duplicate connection attempts by checking if already connecting
    if (this.isConnecting) {
      console.log('Wallet connection already in progress, ignoring duplicate request');
      return;
    }

    try {
      // Set connecting flag to prevent duplicate requests
      this.isConnecting = true;

      // If there's an active session, verify it's still valid (unless forcing new)
      if (this.sessionTopic && this.signClient && !forceNew) {
        try {
          const session = await this.signClient.session.get(this.sessionTopic);
          if (session && session.expiry * 1000 > Date.now()) {
            // Session is still valid
            this.emit('session_connected', { message: 'Already connected to wallet!' });
            return;
          }
        } catch (e) {
          // Session not found or expired, clear it
          this.sessionTopic = null;
          this.emit('session_disconnected', null);
        }
      }

      // Initialize WalletConnect SignClient if not already initialized
      if (!this.signClient) {
        this.signClient = await SignClient.init({
          projectId: WALLETCONNECT_PROJECT_ID,
          metadata: WALLETCONNECT_METADATA
        });

        // Set up event listeners
        this.setupWalletConnectListeners();
      }

      // Create connection
      const connectResult = await this.signClient.connect({
        requiredNamespaces: {
          eip155: {
            methods: [
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4',
              'eth_sendTransaction'
            ],
            chains: [`eip155:${chainId}`],
            events: ['accountsChanged', 'chainChanged']
          }
        }
      });

      // Return the connection URI and QR code data
      this.emit('qr_generated', { uri: connectResult.uri });

      // Wait for approval
      const session = await connectResult.approval();
      this.sessionTopic = session.topic;

      // Get the connected address
      const account = session.namespaces.eip155.accounts[0].split(':')[2];

      // Store connection result for compatibility
      this.connectionResult = {
        address: account,
        provider: null, // Will be created when needed
        session
      };

      // Emit successful connection event
      this.emit('session_connected', { address: account, session });
    } catch (error: unknown) {
      // Clear session state on error
      this.sessionTopic = null;
      console.error('WalletConnect initialization failed:', error);
      this.emit('session_error', { error });
    } finally {
      // Reset connecting flag
      this.isConnecting = false;
    }
  }

  /**
   * Connect with WalletConnect URI
   * @param uri WalletConnect URI
   * @returns Promise that resolves when connection is complete
   */
  public async connectWithUri(uri?: string): Promise<{ uri: string }> {
    // If no URI is provided and we have a sign client, create a new connection
    if (!uri && this.signClient) {
      try {
        const connectResult = await this.signClient.connect({
          requiredNamespaces: {
            eip155: {
              methods: [
                'eth_sign',
                'personal_sign',
                'eth_signTypedData',
                'eth_signTypedData_v4',
                'eth_sendTransaction'
              ],
              chains: ['eip155:1'], // Default to Ethereum mainnet
              events: ['accountsChanged', 'chainChanged']
            }
          }
        });

        return { uri: connectResult.uri };
      } catch (error) {
        console.error('Error creating WalletConnect connection:', error);
        throw error;
      }
    }

    if (!uri) {
      throw new Error('No URI provided and unable to create connection');
    }

    try {
      // Parse the URI
      await this.signClient.pair({ uri });

      // Return the session URI
      return { uri };
    } catch (error) {
      console.error('Error connecting with WalletConnect URI:', error);
      throw error;
    }
  }

  /**
   * Disconnect active WalletConnect session
   * @param reason Optional reason for disconnection
   * @param retryCount Number of retry attempts (internal use)
   */
  public async disconnect(reason?: string, retryCount: number = 0): Promise<void> {
    if (!this.signClient || !this.sessionTopic) {
      console.log('No WalletConnect session to disconnect');
      return;
    }

    const maxRetries = 3;
    const retryDelay = 1000; // 1 second

    try {
      console.log(`Disconnecting WalletConnect session from app... (attempt ${retryCount + 1}/${maxRetries + 1})`);

      // Add timeout to prevent hanging
      const disconnectPromise = this.signClient.disconnect({
        topic: this.sessionTopic,
        reason: {
          code: 6000,
          message: reason || 'User disconnected from app'
        }
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Disconnect timeout')), 10000)
      );

      await Promise.race([disconnectPromise, timeoutPromise]);

      // Reset the session topic
      const disconnectedTopic = this.sessionTopic;
      this.sessionTopic = null;

      // Clear connection result
      this.connectionResult = null;

      // Emit disconnection event
      this.emit('session_disconnected', {
        topic: disconnectedTopic,
        reason: reason || 'User disconnected from app',
        initiatedBy: 'app'
      });

      console.log('WalletConnect session disconnected successfully');
    } catch (error) {
      console.error(`WalletConnect disconnection failed (attempt ${retryCount + 1}):`, error);

      // Retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        console.log(`Retrying disconnection in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.disconnect(reason, retryCount + 1);
      }

      // If all retries failed, force cleanup
      console.warn('All disconnect attempts failed, forcing cleanup...');
      const disconnectedTopic = this.sessionTopic;
      this.sessionTopic = null;
      this.connectionResult = null;

      this.emit('session_disconnected', {
        topic: disconnectedTopic,
        reason: 'Disconnect failed after retries, forcing cleanup',
        initiatedBy: 'app',
        error: error
      });
    }
  }

  /**
   * Check if WalletConnect is currently connected
   */
  public isConnected(): boolean {
    return !!this.sessionTopic && !!this.signClient;
  }

  /**
   * Reset connection state (useful when modal is closed without connecting)
   */
  public resetConnectionState(): void {
    console.log('Resetting WalletConnect connection state...');
    this.isConnecting = false;
    // Don't clear sessionTopic or signClient as they represent actual connections
  }

  /**
   * Check if currently in connecting state
   */
  public isConnectingState(): boolean {
    return this.isConnecting;
  }

  /**
   * Cancel any pending connection attempts
   */
  public cancelPendingConnection(): void {
    console.log('Canceling pending WalletConnect connection...');
    this.isConnecting = false;
    // Note: We don't disconnect actual sessions, just reset the connecting state
  }

  /**
   * Verify connection status by checking session validity
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this.signClient || !this.sessionTopic) {
      return false;
    }

    try {
      const session = await this.signClient.session.get(this.sessionTopic);
      if (!session || session.expiry * 1000 <= Date.now()) {
        console.log('WalletConnect session is expired or invalid');
        // Clean up expired session
        this.sessionTopic = null;
        this.connectionResult = null;
        this.emit('session_disconnected', {
          reason: 'Session expired during verification',
          initiatedBy: 'system'
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error('Failed to verify WalletConnect session:', error);
      // Clean up invalid session
      this.sessionTopic = null;
      this.connectionResult = null;
      this.emit('session_disconnected', {
        reason: 'Session verification failed',
        initiatedBy: 'system',
        error
      });
      return false;
    }
  }

  /**
   * Test bidirectional disconnection functionality
   */
  public async testDisconnection(): Promise<{ success: boolean; message: string }> {
    if (!this.isConnected()) {
      return { success: false, message: 'No active WalletConnect session to test' };
    }

    try {
      console.log('Testing WalletConnect disconnection...');

      // Attempt to disconnect
      await this.disconnect('Testing disconnection functionality');

      // Verify disconnection
      const isStillConnected = await this.verifyConnection();

      if (isStillConnected) {
        return {
          success: false,
          message: 'Disconnection test failed - session still active'
        };
      }

      return {
        success: true,
        message: 'Disconnection test successful - session properly terminated'
      };
    } catch (error) {
      return {
        success: false,
        message: `Disconnection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get current session info if connected
   */
  public async getSessionInfo(): Promise<any | null> {
    if (!this.signClient || !this.sessionTopic) {
      return null;
    }

    try {
      const session = await this.signClient.session.get(this.sessionTopic);
      return session;
    } catch (error) {
      console.error('Failed to get session info:', error);
      return null;
    }
  }

  /**
   * Generate QR code canvas for the WalletConnect URI
   * @param canvas Canvas element to render QR code on
   * @param uri WalletConnect URI
   */
  public static async generateQrCode(canvas: HTMLCanvasElement, uri: string): Promise<void> {
    await QRCode.toCanvas(canvas, uri, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  }

  // Adapter methods for compatibility with existing UI
  public subscribe(callback: (state: any) => void): () => void {
    this.addEventListener('session_connected', callback);
    this.addEventListener('session_disconnected', callback);
    this.addEventListener('session_error', callback);
    this.addEventListener('qr_generated', callback);

    return () => {
      this.removeEventListener('session_connected', callback);
      this.removeEventListener('session_disconnected', callback);
      this.removeEventListener('session_error', callback);
      this.removeEventListener('qr_generated', callback);
    };
  }

  public async initializeConnection(): Promise<void> {
    await this.initialize(11155111); // Default to Sepolia
  }

  public getConnectionResult(): any {
    // This will be set by the session_connected event
    return this.connectionResult;
  }

  /**
   * Create a WalletConnect signer for the current session
   */
  public createSigner(chainId: number, provider?: ethers.providers.Provider): WalletConnectSigner | null {
    if (!this.connectionResult || !this.connectionResult.address) {
      return null;
    }

    return new WalletConnectSigner(
      this,
      this.connectionResult.address,
      chainId,
      provider
    );
  }

  /**
   * Get the connected address
   */
  public getConnectedAddress(): string | null {
    return this.connectionResult?.address || null;
  }

  private connectionResult: any = null;
}

// Export types for compatibility
export interface WalletConnectState {
  isConnected: boolean;
  address?: string;
  chainId?: number;
  uri?: string;
  qrCodeDataUrl?: string;
  error?: string;
  isInitializing?: boolean;
  isPairing?: boolean;
}

// Create and export singleton instance
export const walletConnectService = new WalletConnectService();