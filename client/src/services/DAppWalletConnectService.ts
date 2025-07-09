import { SignClient } from '@walletconnect/sign-client';
import { SessionTypes } from '@walletconnect/types';
import { WALLETCONNECT_DAPP_PROJECT_ID, WALLETCONNECT_DAPP_METADATA } from '../config/walletconnect';
import { walletConnectionService } from './WalletConnectionService';
import { safeWalletService } from './SafeWalletService';
import { walletConnectManager } from './WalletConnectManager';

/**
 * DApp WalletConnect Service
 * 
 * This service handles WalletConnect connections where our Safe wallet acts as the "wallet"
 * and external dApps connect to us. This is different from the regular WalletConnect service
 * which connects our app to external wallets.
 */
export class DAppWalletConnectService {
  private activeSessions: Map<string, SessionTypes.Struct> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Initialize the DApp WalletConnect service using the unified manager
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing DApp WalletConnect service...');

      // Initialize the unified manager
      await walletConnectManager.initialize();

      // Listen for dApp-specific events from the manager
      walletConnectManager.on('dapp_disconnected', (data: any) => {
        this.handleDAppDisconnected(data);
      });

      walletConnectManager.on('dapp_request', (event: any) => {
        this.handleDAppRequest(event);
      });

      // Load existing dApp sessions from the manager
      this.loadExistingDAppSessions();

      console.log('✅ DApp WalletConnect service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize DApp WalletConnect service:', error);
      throw error;
    }
  }

  /**
   * Load existing dApp sessions from the unified manager
   */
  private loadExistingDAppSessions(): void {
    try {
      // Get dApp sessions from the unified manager
      const dAppSessions = walletConnectManager.getDAppSessions();

      console.log('📋 Loading existing dApp sessions:', dAppSessions.length);

      dAppSessions.forEach((session: SessionTypes.Struct) => {
        if (session.topic && session.peer?.metadata) {
          this.activeSessions.set(session.topic, session);
          console.log('📱 Loaded dApp session:', session.topic, session.peer.metadata.name);
        }
      });

      console.log('✅ Loaded', this.activeSessions.size, 'valid dApp sessions');
    } catch (error) {
      console.error('❌ Error loading existing dApp sessions:', error);
    }
  }

  /**
   * Handle dApp disconnection from unified manager
   */
  private handleDAppDisconnected(data: any): void {
    const { topic, reason } = data;

    if (this.activeSessions.has(topic)) {
      console.log('dApp disconnected via unified manager:', topic);

      // Remove from our local sessions
      this.activeSessions.delete(topic);

      // Emit disconnection event
      this.emit('session_disconnected', { topic, reason });
    }
  }

  /**
   * Handle dApp requests from unified manager
   */
  private handleDAppRequest(event: any): void {
    // Forward the request to our session request handler
    this.handleSessionRequest(event).catch(error => {
      console.error('❌ Error handling dApp request:', error);
    });
  }

  /**
   * Set up WalletConnect event listeners (DEPRECATED - now using unified manager)
   */
  private setupEventListeners(): void {
    // This method is no longer used since we're using the unified manager
    console.log('⚠️ setupEventListeners called but deprecated - using unified manager instead');
  }

  /**
   * Set up global error handler (DEPRECATED - now handled by unified manager)
   */
  private setupGlobalErrorHandler(): void {
    console.log('⚠️ setupGlobalErrorHandler called but deprecated - using unified manager instead');
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
      const signClient = walletConnectManager.getSignClient();
      await signClient?.reject({
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
        const signClient = walletConnectManager.getSignClient();
        await signClient?.reject({
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

      const signClient = walletConnectManager.getSignClient();
      const session = await signClient?.approve({
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
        console.log('✅ Session approved and stored:', session.topic);
        
        // Emit session connected event
        this.emit('session_connected', {
          topic: session.topic,
          dAppName: event.params.proposer.metadata.name,
          dAppUrl: event.params.proposer.metadata.url
        });
      }
    } catch (error) {
      console.error('❌ Failed to handle session proposal:', error);
      
      // Reject the proposal on error
      try {
        const signClient = walletConnectManager.getSignClient();
        await signClient?.reject({
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
          const signClient = walletConnectManager.getSignClient();
          await signClient?.respond({
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
        const signClient = walletConnectManager.getSignClient();
        await signClient?.respond({
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
      const signClient = walletConnectManager.getSignClient();
      await signClient?.respond({
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
      const signClient = walletConnectManager.getSignClient();
      await signClient?.respond({
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
    const signClient = walletConnectManager.getSignClient();
    await signClient?.respond({
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
    const signClient = walletConnectManager.getSignClient();
    await signClient?.respond({
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
    console.log('🗑️ DApp service received session delete event:', event);

    const { topic } = event;

    // Only handle sessions that we actually own (exist in our activeSessions)
    if (this.activeSessions.has(topic)) {
      console.log('🗑️ Cleaning up our dApp session:', topic);
      this.activeSessions.delete(topic);
      this.emit('session_disconnected', { topic });
    } else {
      console.log('🚫 Ignoring session delete for topic we don\'t own:', topic);
    }
  }

  /**
   * Connect to a dApp using a pairing code
   */
  public async connectDApp(pairingCode: string): Promise<void> {
    const signClient = walletConnectManager.getSignClient();
    if (!signClient) {
      throw new Error('WalletConnect client not initialized');
    }

    try {
      console.log('🔗 Connecting to dApp with pairing code...');

      // Pair with the dApp using the provided URI
      await signClient.pair({ uri: pairingCode });
      
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
    const signClient = walletConnectManager.getSignClient();
    if (!signClient) {
      throw new Error('WalletConnect client not initialized');
    }

    try {
      // First check if this session belongs to us
      if (!this.activeSessions.has(topic)) {
        console.log('🚫 Cannot disconnect session that doesn\'t belong to dApp service:', topic);
        return;
      }

      // Check if session exists in WalletConnect client before trying to disconnect
      let sessionExists = false;
      try {
        sessionExists = signClient.session.keys.includes(topic);
      } catch (error) {
        console.warn('⚠️ Error checking session existence:', error);
        sessionExists = false;
      }

      if (sessionExists) {
        try {
          await signClient.disconnect({
            topic,
            reason: {
              code: 6000,
              message: 'User disconnected'
            }
          });
          console.log('✅ Disconnected from WalletConnect session:', topic);
        } catch (disconnectError) {
          console.warn('⚠️ WalletConnect disconnect failed, but continuing with cleanup:', disconnectError);
        }
      } else {
        console.log('⚠️ Session not found in WalletConnect client, cleaning up locally:', topic);
      }

      // Always remove from our local storage regardless of WalletConnect state
      this.activeSessions.delete(topic);

      // Emit disconnection event
      this.emit('session_disconnected', { topic });

      console.log('✅ Cleaned up dApp session:', topic);
    } catch (error) {
      console.error('❌ Failed to disconnect from dApp:', error);

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
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get full session data for a topic
   */
  public getFullSession(topic: string): SessionTypes.Struct | null {
    try {
      const signClient = walletConnectManager.getSignClient();
      if (!signClient) return null;
      return signClient.session.get(topic);
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
