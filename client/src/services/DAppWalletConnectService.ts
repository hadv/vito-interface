import { SignClient } from '@walletconnect/sign-client';
import { SessionTypes } from '@walletconnect/types';
import { WALLETCONNECT_PROJECT_ID, WALLETCONNECT_METADATA } from '../config/walletconnect';
import { walletConnectionService } from './WalletConnectionService';
import { safeWalletService } from './SafeWalletService';

/**
 * DApp WalletConnect Service
 * 
 * This service handles WalletConnect connections where our Safe wallet acts as the "wallet"
 * and external dApps connect to us. This is different from the regular WalletConnect service
 * which connects our app to external wallets.
 */
export class DAppWalletConnectService {
  private signClient: any = null;
  private activeSessions: Map<string, SessionTypes.Struct> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the WalletConnect SignClient for dApp connections
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing DApp WalletConnect service...');
      
      this.signClient = await SignClient.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        metadata: {
          ...WALLETCONNECT_METADATA,
          name: 'Vito Safe Wallet',
          description: 'Safe wallet interface for dApp connections'
        },
        // Use separate storage key to avoid conflicts with signer service
        storageOptions: {
          database: 'vito-dapp-walletconnect'
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      // Clean up any orphaned sessions from previous runs
      await this.cleanupOrphanedSessions();

      // Load existing sessions (only legitimate dApp sessions)
      this.loadExistingSessions();

      console.log('✅ DApp WalletConnect service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize DApp WalletConnect service:', error);
      throw error;
    }
  }









  /**
   * Validate if a dApp session exists and is not expired
   */
  private async validateSession(topic: string): Promise<boolean> {
    if (!this.signClient || !topic) {
      return false;
    }

    try {
      // Check if session exists in the client's session store
      const sessionKeys = this.signClient.session.keys;
      if (!sessionKeys.includes(topic)) {
        console.log('dApp session not found in client session store:', topic);
        return false;
      }

      // Get the session and check expiry
      const session = await this.signClient.session.get(topic);
      const isValid = !!session && session.expiry * 1000 > Date.now();
      console.log('dApp session validation:', {
        exists: isValid,
        topic,
        expiry: session?.expiry ? new Date(session.expiry * 1000).toISOString() : 'unknown'
      });
      return isValid;
    } catch (error) {
      console.warn('dApp session validation failed:', error);
      return false;
    }
  }

  /**
   * Clean up orphaned sessions that might cause "no matching pair key" errors
   */
  private async cleanupOrphanedSessions(): Promise<void> {
    if (!this.signClient) return;

    try {
      console.log('🧹 Cleaning up orphaned dApp WalletConnect sessions...');

      // Get all sessions from the client
      const allSessions = this.signClient.session.getAll();
      console.log(`Found ${allSessions.length} dApp sessions in WalletConnect client`);

      // Check each session and remove expired or invalid ones
      for (const session of allSessions) {
        try {
          // Check if session is expired
          if (session.expiry * 1000 <= Date.now()) {
            console.log(`Removing expired dApp session: ${session.topic}`);
            await this.signClient.disconnect({
              topic: session.topic,
              reason: {
                code: 6000,
                message: 'dApp session expired during cleanup'
              }
            }).catch((error: any) => {
              // Ignore disconnect errors during cleanup
              console.warn(`Failed to disconnect expired dApp session ${session.topic}:`, error);
            });
          }
        } catch (error) {
          console.warn(`Error checking dApp session ${session.topic}:`, error);
          // Try to remove problematic sessions
          try {
            await this.signClient.disconnect({
              topic: session.topic,
              reason: {
                code: 6000,
                message: 'dApp session cleanup due to error'
              }
            }).catch(() => {
              // Ignore errors during cleanup
            });
          } catch {
            // Ignore cleanup errors
          }
        }
      }

      console.log('✅ Orphaned dApp session cleanup completed');
    } catch (error) {
      console.warn('⚠️ Error during orphaned dApp session cleanup:', error);
      // Don't throw - cleanup is best effort
    }
  }

  /**
   * Load existing sessions from WalletConnect client
   * For dApp connections, we don't load existing sessions on app restart
   * to avoid confusion with signer wallet sessions
   */
  private loadExistingSessions(): void {
    console.log('📋 DApp service: Not loading existing sessions on app restart to prevent confusion with signer wallet sessions');
    console.log('✅ DApp service initialized with clean session state');
    // Note: dApp connections will be re-established when users explicitly connect via pairing codes
  }

  /**
   * Set up WalletConnect event listeners
   */
  private setupEventListeners(): void {
    if (!this.signClient) return;

    // Handle session proposals from dApps
    this.signClient.on('session_proposal', this.handleSessionProposal.bind(this));
    
    // Handle session requests (transaction signing, etc.)
    this.signClient.on('session_request', this.handleSessionRequest.bind(this));
    
    // Handle session deletions
    this.signClient.on('session_delete', this.handleSessionDelete.bind(this));
  }

  /**
   * Handle incoming session proposals from dApps
   */
  private async handleSessionProposal(event: any): Promise<void> {
    console.log('📥 Received session proposal from dApp:', event);

    // Check if we already have a session with this dApp
    const existingSession = Array.from(this.activeSessions.values()).find(
      session => session.peer?.metadata?.url === event.params.proposer.metadata.url
    );

    if (existingSession) {
      console.log('⚠️ Session already exists for this dApp, rejecting duplicate');
      await this.signClient?.reject({
        id: event.id,
        reason: {
          code: 5001,
          message: 'Session already exists for this dApp'
        }
      });
      return;
    }

    try {
      // Get current Safe wallet state
      const walletState = walletConnectionService.getState();
      
      if (!walletState.isConnected || !walletState.safeAddress) {
        console.error('❌ No Safe wallet connected, rejecting proposal');
        await this.signClient?.reject({
          id: event.id,
          reason: {
            code: 5000,
            message: 'No Safe wallet connected'
          }
        });
        return;
      }

      // Auto-approve the session with Safe wallet details
      const chainId = walletState.chainId || 11155111; // Default to Sepolia
      const accounts = [`eip155:${chainId}:${walletState.safeAddress}`];

      const session = await this.signClient?.approve({
        id: event.id,
        namespaces: {
          eip155: {
            accounts,
            methods: [
              'eth_sendTransaction',
              'eth_signTransaction', 
              'eth_sign',
              'personal_sign',
              'eth_signTypedData',
              'eth_signTypedData_v4'
            ],
            events: ['accountsChanged', 'chainChanged']
          }
        }
      });

      if (session) {
        this.activeSessions.set(session.topic, session);
        console.log('✅ dApp session approved and stored:', session.topic);

        // Emit session connected event
        this.emit('session_connected', {
          topic: session.topic,
          dAppName: event.params.proposer.metadata.name,
          dAppUrl: event.params.proposer.metadata.url
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle dApp session proposal:', error);

      // Reject the proposal on error
      try {
        await this.signClient?.reject({
          id: event.id,
          reason: {
            code: 5001,
            message: 'Failed to process session proposal'
          }
        });
      } catch (rejectError) {
        console.error('❌ Failed to reject proposal:', rejectError);
      }
    }
  }

  /**
   * Handle incoming session requests (transactions, signing, etc.)
   */
  private async handleSessionRequest(event: any): Promise<void> {
    console.log('📥 Received session request:', event);
    
    try {
      const { topic, params, id } = event;
      const { request } = params;
      
      // Get the session
      const session = this.activeSessions.get(topic);
      if (!session) {
        throw new Error('Session not found');
      }

      // Handle different request methods
      switch (request.method) {
        case 'eth_sendTransaction':
          await this.handleTransactionRequest(topic, id, request.params[0]);
          break;
          
        case 'personal_sign':
          await this.handlePersonalSignRequest(topic, id, request.params);
          break;
          
        case 'eth_signTypedData_v4':
          await this.handleTypedDataSignRequest(topic, id, request.params);
          break;
          
        default:
          console.warn('⚠️ Unsupported request method:', request.method);
          await this.signClient?.respond({
            topic,
            response: {
              id,
              error: {
                code: 4001,
                message: `Unsupported method: ${request.method}`
              }
            }
          });
      }
    } catch (error) {
      console.error('❌ Failed to handle session request:', error);
      
      // Send error response
      try {
        await this.signClient?.respond({
          topic: event.topic,
          response: {
            id: event.id,
            error: {
              code: 5000,
              message: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        });
      } catch (responseError) {
        console.error('❌ Failed to send error response:', responseError);
      }
    }
  }

  /**
   * Handle transaction requests from dApps
   */
  private async handleTransactionRequest(topic: string, id: number, transaction: any): Promise<void> {
    console.log('💰 Handling transaction request from dApp:', transaction);

    try {
      // Get current wallet state
      const walletState = walletConnectionService.getState();

      if (!walletState.isConnected || !walletState.safeAddress) {
        throw new Error('No Safe wallet connected');
      }

      if (!walletState.signerConnected) {
        throw new Error('No signer wallet connected. Please connect a signer wallet first.');
      }

      // Create Safe transaction from dApp request
      const safeTransaction = {
        to: transaction.to,
        value: transaction.value || '0',
        data: transaction.data || '0x',
        operation: 0 // CALL operation
      };

      console.log('🔄 Creating Safe transaction for dApp request:', safeTransaction);

      // Create and propose the transaction through Safe
      const result = await safeWalletService.createTransaction(safeTransaction);

      console.log('✅ Safe transaction created:', result);

      // Respond with the Safe transaction hash
      await this.signClient?.respond({
        topic,
        response: {
          id,
          result: result.txHash
        }
      });

      // Emit success event
      this.emit('transaction_success', {
        topic,
        id,
        transaction: safeTransaction,
        result
      });

    } catch (error: any) {
      console.error('❌ Failed to handle transaction request:', error);

      // Respond with error
      await this.signClient?.respond({
        topic,
        response: {
          id,
          error: {
            code: 4001,
            message: error.message || 'Transaction failed'
          }
        }
      });

      // Emit error event
      this.emit('transaction_error', {
        topic,
        id,
        transaction,
        error: error.message
      });
    }
  }

  /**
   * Handle personal sign requests from dApps
   */
  private async handlePersonalSignRequest(topic: string, id: number, params: any[]): Promise<void> {
    console.log('✍️ Handling personal sign request:', params);
    
    // For now, auto-reject signing requests as they need signer wallet
    await this.signClient?.respond({
      topic,
      response: {
        id,
        error: {
          code: 4001,
          message: 'Personal signing not supported in Safe wallet mode'
        }
      }
    });
  }

  /**
   * Handle typed data sign requests from dApps
   */
  private async handleTypedDataSignRequest(topic: string, id: number, params: any[]): Promise<void> {
    console.log('📝 Handling typed data sign request:', params);
    
    // For now, auto-reject signing requests as they need signer wallet
    await this.signClient?.respond({
      topic,
      response: {
        id,
        error: {
          code: 4001,
          message: 'Typed data signing not supported in Safe wallet mode'
        }
      }
    });
  }

  /**
   * Handle session deletions
   */
  private async handleSessionDelete(event: any): Promise<void> {
    console.log('🗑️ Session deleted:', event);

    const { topic } = event;

    // Only process session deletions for sessions we own
    if (!this.ownsSession(topic)) {
      console.log(`Ignoring session deletion for topic not owned by DAppWalletConnectService: ${topic}`);
      return;
    }

    this.activeSessions.delete(topic);

    this.emit('session_disconnected', { topic });
  }

  /**
   * Check if this service owns a specific session topic
   * This prevents processing session events from WalletConnectService
   */
  private ownsSession(topic: string): boolean {
    if (!this.signClient) return false;

    try {
      // Try different methods to check session ownership
      if (typeof this.signClient.getActiveSessions === 'function') {
        const activeSessions = this.signClient.getActiveSessions();
        return activeSessions.hasOwnProperty(topic);
      }

      // Fallback: check if we have a session store
      if (this.signClient.session?.store) {
        try {
          const session = this.signClient.session.store.get(topic);
          return !!session;
        } catch {
          return false;
        }
      }

      // Fallback: check our active sessions map
      if (this.activeSessions.has(topic)) {
        return true;
      }

      console.warn('DApp WalletConnect: No method available to check session ownership, defaulting to false');
      return false;
    } catch (error) {
      console.warn('Error checking dApp session ownership:', error);
      return false;
    }
  }



  /**
   * Connect to a dApp using a pairing code
   */
  public async connectDApp(pairingCode: string): Promise<void> {
    if (!this.signClient) {
      throw new Error('WalletConnect client not initialized');
    }

    try {
      console.log('🔗 Connecting to dApp with pairing code...');

      // Pair with the dApp using the provided URI
      await this.signClient.pair({ uri: pairingCode });

      console.log('✅ Pairing initiated, waiting for session proposal...');
    } catch (error) {
      console.error('❌ Failed to connect to dApp:', error);
      throw error;
    }
  }

  /**
   * Disconnect from a specific dApp session
   */
  public async disconnectDApp(topic: string): Promise<void> {
    if (!this.signClient) {
      throw new Error('WalletConnect client not initialized');
    }

    try {
      // Check if session exists using WalletConnect's recommended method
      const activeSessions = this.signClient.getActiveSessions();
      const sessionExists = activeSessions[topic];

      if (sessionExists) {
        console.log('Session exists in active sessions, attempting disconnect...');

        // Use WalletConnect's recommended disconnectSession method
        await this.signClient.disconnectSession({
          topic,
          reason: {
            code: 6000,
            message: 'User disconnected'
          }
        });

        console.log('✅ Disconnected from WalletConnect session:', topic);
      } else {
        console.log('⚠️ Session not found in active sessions, cleaning up locally:', topic);
      }

      // Always remove from our local storage regardless of WalletConnect state
      this.activeSessions.delete(topic);

      // Emit disconnection event
      this.emit('session_disconnected', { topic });

      console.log('✅ Cleaned up dApp session:', topic);
    } catch (error) {
      console.error('❌ Failed to disconnect from dApp:', error);

      // Handle "no matching key" error as documented by WalletConnect
      const errorMessage = (error as any)?.message?.toLowerCase() || '';
      if (errorMessage.includes('no matching key') && errorMessage.includes('session topic')) {
        console.warn('Session topic does not exist (already disconnected), cleaning up locally:', error);
      }

      // Even if disconnect fails, clean up locally to prevent UI issues
      this.activeSessions.delete(topic);
      this.emit('session_disconnected', { topic });

      // Don't throw the error to prevent UI crashes
      console.log('🧹 Cleaned up session locally despite disconnect error');
    }
  }

  /**
   * Get all active dApp sessions
   */
  public getActiveSessions(): SessionTypes.Struct[] {
    const sessions = Array.from(this.activeSessions.values());
    console.log(`📋 DApp service has ${sessions.length} active sessions`);
    return sessions;
  }

  /**
   * Get full session data for a topic
   */
  public getFullSession(topic: string): SessionTypes.Struct | null {
    try {
      if (!this.signClient) return null;
      return this.signClient.session.get(topic);
    } catch (error) {
      console.error('Error getting full session:', error);
      return null;
    }
  }



  /**
   * Event emitter methods
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }
}

// Export singleton instance
export const dAppWalletConnectService = new DAppWalletConnectService();
