import { SignClient } from '@walletconnect/sign-client';
import QRCode from 'qrcode';
import { ethers } from 'ethers';
import { WalletConnectSigner } from './WalletConnectSigner';
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from '../config/walletconnect';
import { walletConnectErrorSuppression } from './WalletConnectErrorSuppression';

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
      try {
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
      } catch (error: any) {
        // Check if this is a suppressed WalletConnect error
        if (walletConnectErrorSuppression.shouldSuppressError({
          message: error.message || '',
          stack: error.stack || ''
        })) {
          // Silently handle suppressed errors
          console.debug('🔇 Suppressed WalletConnect session_delete error:', error.message);
          return;
        }
        // Log non-suppressed errors
        console.error('Error handling session_delete:', error);
      }
    });

    // Handle session expiry
    this.signClient.on('session_expire', ({ topic }: { topic: string }) => {
      try {
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
      } catch (error: any) {
        // Check if this is a suppressed WalletConnect error
        if (walletConnectErrorSuppression.shouldSuppressError({
          message: error.message || '',
          stack: error.stack || ''
        })) {
          // Silently handle suppressed errors
          console.debug('🔇 Suppressed WalletConnect session_expire error:', error.message);
          return;
        }
        // Log non-suppressed errors
        console.error('Error handling session_expire:', error);
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
    // If forcing new connection, reset the connecting flag and clean up existing state
    if (forceNew) {
      console.log('Forcing new WalletConnect connection...');
      this.isConnecting = false;

      // If there's an existing session, clean it up first
      if (this.sessionTopic) {
        console.log('Cleaning up existing session before forcing new connection...');
        try {
          if (this.signClient) {
            await this.signClient.disconnect({
              topic: this.sessionTopic,
              reason: { code: 6000, message: 'Forcing new connection' }
            });
          }
        } catch (error) {
          console.warn('Failed to disconnect existing session, continuing with cleanup:', error);
        }
        this.sessionTopic = null;
        this.connectionResult = null;
      }
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
          // First check if the session exists in the client's session store
          const sessions = this.signClient.session.getAll();
          const sessionExists = sessions.some((session: any) => session.topic === this.sessionTopic);

          if (!sessionExists) {
            console.log('Session no longer exists in store, clearing local state');
            this.sessionTopic = null;
            this.emit('session_disconnected', null);
          } else {
            const session = await this.signClient.session.get(this.sessionTopic);
            if (session && session.expiry * 1000 > Date.now()) {
              // Session is still valid
              this.emit('session_connected', { message: 'Already connected to wallet!' });
              return;
            }
          }
        } catch (e: any) {
          // Check if this is the "No matching key" error
          if (e.message && e.message.includes('No matching key')) {
            console.log('Session was deleted externally, clearing local state');
          } else {
            console.warn('Error checking existing session:', e);
          }
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

      console.log('WalletConnect session approved:', session);
      console.log('Session namespaces:', session.namespaces);
      console.log('EIP155 namespace details:', session.namespaces?.eip155);

      // Get the connected address with proper error handling
      let account: string;

      if (!session.namespaces?.eip155?.accounts || session.namespaces.eip155.accounts.length === 0) {
        console.error('No accounts found in session namespaces:', session.namespaces);
        throw new Error('No accounts found in WalletConnect session');
      }

      try {
        const accountString = session.namespaces.eip155.accounts[0];
        console.log('Full account string:', accountString);
        account = accountString.split(':')[2];
        console.log('Extracted account address:', account);
      } catch (error) {
        console.error('Failed to extract account from session:', session.namespaces.eip155.accounts[0]);
        throw new Error('Invalid account format in WalletConnect session');
      }

      // Store connection result for compatibility
      this.connectionResult = {
        address: account,
        provider: null, // Will be created when needed
        session
      };

      // Emit successful connection event
      console.log('🔗 WalletConnect signer session established:', { address: account, topic: session.topic });
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
   * Force disconnect and cleanup all WalletConnect state
   * Used when switching wallets to ensure clean state
   */
  public async forceDisconnectAndCleanup(): Promise<void> {
    console.log('Force disconnecting and cleaning up WalletConnect...');

    try {
      // If there's an active session, disconnect it
      if (this.sessionTopic && this.signClient) {
        await this.disconnect('Switching to different wallet');
      }
    } catch (error) {
      console.error('Error during force disconnect:', error);
    }

    // Force cleanup regardless of disconnect success
    this.sessionTopic = null;
    this.connectionResult = null;
    this.isConnecting = false;

    console.log('WalletConnect force cleanup completed');
  }

  /**
   * Verify connection status by checking session validity
   */
  public async verifyConnection(): Promise<boolean> {
    if (!this.signClient || !this.sessionTopic) {
      return false;
    }

    try {
      // First check if the session exists in the client's session store
      const sessions = this.signClient.session.getAll();
      const sessionExists = sessions.some((session: any) => session.topic === this.sessionTopic);

      if (!sessionExists) {
        console.log('WalletConnect session no longer exists in store');
        // Clean up non-existent session
        this.sessionTopic = null;
        this.connectionResult = null;
        this.emit('session_disconnected', {
          reason: 'Session no longer exists',
          initiatedBy: 'system'
        });
        return false;
      }

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
    } catch (error: any) {
      // Check if this is the "No matching key" error - this means session was deleted
      if (error.message && error.message.includes('No matching key')) {
        console.log('WalletConnect session was deleted, cleaning up local state');
        this.sessionTopic = null;
        this.connectionResult = null;
        this.emit('session_disconnected', {
          reason: 'Session was deleted externally',
          initiatedBy: 'system'
        });
        return false;
      }

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
      // First check if the session exists in the client's session store
      const sessions = this.signClient.session.getAll();
      const sessionExists = sessions.some((session: any) => session.topic === this.sessionTopic);

      if (!sessionExists) {
        console.log('Session no longer exists in store');
        // Clean up local state
        this.sessionTopic = null;
        this.connectionResult = null;
        return null;
      }

      const session = await this.signClient.session.get(this.sessionTopic);
      return session;
    } catch (error: any) {
      // Check if this is the "No matching key" error
      if (error.message && error.message.includes('No matching key')) {
        console.log('Session was deleted externally, cleaning up local state');
        this.sessionTopic = null;
        this.connectionResult = null;
        return null;
      }

      console.error('Failed to get session info:', error);
      return null;
    }
  }

  /**
   * Generate QR code canvas for the WalletConnect URI with blue theme and centered logo
   * @param canvas Canvas element to render QR code on
   * @param uri WalletConnect URI
   */
  public static async generateQrCode(canvas: HTMLCanvasElement, uri: string): Promise<void> {
    // Generate QR code with blue theme
    await QRCode.toCanvas(canvas, uri, {
      width: 300,
      margin: 2,
      color: {
        dark: '#3b82f6', // Blue color instead of black
        light: '#ffffff'
      }
    });

    // Add WalletConnect logo in the center
    await this.addWalletConnectLogo(canvas);
  }

  /**
   * Add WalletConnect logo in the center of the QR code
   * @param canvas Canvas element with QR code
   */
  private static async addWalletConnectLogo(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const logoSize = 60; // Size of the logo background
    const logoRadius = 8; // Rounded corners

    // Create white background with rounded corners for the logo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    this.drawRoundedRect(ctx, centerX - logoSize / 2, centerY - logoSize / 2, logoSize, logoSize, logoRadius);
    ctx.fill();

    // Add a subtle border
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw WalletConnect logo
    this.drawWalletConnectIcon(ctx, centerX, centerY, 32);
  }

  /**
   * Draw rounded rectangle (fallback for browsers that don't support roundRect)
   */
  private static drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    if (typeof (ctx as any).roundRect === 'function') {
      // Use native roundRect if available
      (ctx as any).roundRect(x, y, width, height, radius);
    } else {
      // Fallback implementation
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
    }
  }

  /**
   * Draw WalletConnect icon at specified position
   * @param ctx Canvas 2D context
   * @param centerX Center X position
   * @param centerY Center Y position
   * @param size Size of the icon
   */
  private static drawWalletConnectIcon(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number): void {
    const scale = size / 40; // Scale factor based on original 40x25 viewBox
    const offsetX = centerX - (40 * scale) / 2;
    const offsetY = centerY - (25 * scale) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#3b99fc'; // WalletConnect blue

    // WalletConnect logo path (official SVG path from WalletConnect)
    const path = new Path2D('m8.19180572 4.83416816c6.52149658-6.38508884 17.09493158-6.38508884 23.61642788 0l.7848727.76845565c.3260748.31925442.3260748.83686816 0 1.15612272l-2.6848927 2.62873374c-.1630375.15962734-.4273733.15962734-.5904108 0l-1.0800779-1.05748639c-4.5495589-4.45439756-11.9258514-4.45439756-16.4754105 0l-1.1566741 1.13248068c-.1630376.15962721-.4273735.15962721-.5904108 0l-2.68489263-2.62873375c-.32607483-.31925456-.32607483-.83686829 0-1.15612272zm29.16903948 5.43649934 2.3895596 2.3395862c.3260732.319253.3260751.8368636.0000041 1.1561187l-10.7746894 10.5494845c-.3260726.3192568-.8547443.3192604-1.1808214.0000083-.0000013-.0000013-.0000029-.0000029-.0000042-.0000043l-7.6472191-7.4872762c-.0815187-.0798136-.2136867-.0798136-.2952053 0-.0000006.0000005-.000001.000001-.0000015.0000014l-7.6470562 7.4872708c-.3260715.3192576-.8547434.319263-1.1808215.0000116-.0000019-.0000018-.0000039-.0000037-.0000059-.0000058l-10.7749893-10.5496247c-.32607469-.3192544-.32607469-.8368682 0-1.1561226l2.38956395-2.3395823c.3260747-.31925446.85474652-.31925446 1.18082136 0l7.64733029 7.4873809c.0815188.0798136.2136866.0798136.2952054 0 .0000012-.0000012.0000023-.0000023.0000035-.0000032l7.6469471-7.4873777c.3260673-.31926181.8547392-.31927378 1.1808214-.0000267.0000046.0000045.0000091.000009.0000135.0000135l7.6473203 7.4873909c.0815186.0798135.2136866.0798135.2952053 0l7.6471967-7.4872433c.3260748-.31925458.8547465-.31925458 1.1808213 0z');
    ctx.fill(path);

    ctx.restore();
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