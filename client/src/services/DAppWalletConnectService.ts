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
  private expectingDAppConnection: boolean = false;

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
        }
      });

      // Set up event listeners
      this.setupEventListeners();

      // Load existing sessions (only legitimate dApp sessions)
      this.loadExistingSessions();

      console.log('✅ DApp WalletConnect service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize DApp WalletConnect service:', error);
      throw error;
    }
  }

  /**
   * Load existing sessions from WalletConnect client
   * Only loads sessions that are likely to be dApp connections, not signer wallet connections
   */
  private loadExistingSessions(): void {
    try {
      if (!this.signClient) return;

      // Add a small delay to ensure client is fully initialized
      setTimeout(() => {
        try {
          const sessions = this.signClient.session.getAll();
          console.log('📋 DApp service checking existing sessions:', sessions.length);

          let loadedCount = 0;
          sessions.forEach((session: SessionTypes.Struct) => {
            // Only load valid sessions that appear to be dApp connections
            if (session.topic && session.peer?.metadata) {
              // Skip sessions that look like signer wallet connections
              if (this.isLikelySignerWalletSession(session)) {
                console.log('🚫 Skipping likely signer wallet session:', session.topic, session.peer.metadata.name);
                return;
              }

              this.activeSessions.set(session.topic, session);
              console.log('📱 Loaded dApp session:', session.topic, session.peer.metadata.name);
              loadedCount++;
            }
          });

          console.log(`✅ DApp service loaded ${loadedCount} valid dApp sessions (skipped ${sessions.length - loadedCount} likely signer sessions)`);
        } catch (error) {
          console.error('❌ Error loading existing sessions:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error in loadExistingSessions:', error);
    }
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

    // IMPORTANT: Only handle proposals that were initiated through connectDApp()
    // This prevents interference with signer wallet connections
    if (!this.expectingDAppConnection) {
      console.log('🚫 Ignoring session proposal - not expecting dApp connection (likely signer wallet connection)');
      return;
    }

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
    } finally {
      // Reset the flag after handling the proposal
      this.expectingDAppConnection = false;
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
    this.activeSessions.delete(topic);
    
    this.emit('session_disconnected', { topic });
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

      // Set flag to indicate we're expecting a dApp connection
      this.expectingDAppConnection = true;

      // Pair with the dApp using the provided URI
      await this.signClient.pair({ uri: pairingCode });

      console.log('✅ Pairing initiated, waiting for session proposal...');
    } catch (error) {
      console.error('❌ Failed to connect to dApp:', error);
      // Reset flag on error
      this.expectingDAppConnection = false;
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
      // Check if session exists in WalletConnect client before trying to disconnect
      const sessionExists = this.signClient.session.keys.includes(topic);

      if (sessionExists) {
        await this.signClient.disconnect({
          topic,
          reason: {
            code: 6000,
            message: 'User disconnected'
          }
        });
        console.log('✅ Disconnected from WalletConnect session:', topic);
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
   * Determine if a session is likely a signer wallet connection rather than a dApp connection
   * This helps prevent signer wallet sessions from being loaded as dApp connections on app restart
   */
  private isLikelySignerWalletSession(session: SessionTypes.Struct): boolean {
    if (!session.peer?.metadata) return false;

    const metadata = session.peer.metadata;
    const name = metadata.name?.toLowerCase() || '';
    const description = metadata.description?.toLowerCase() || '';
    const url = metadata.url?.toLowerCase() || '';

    // Common signer wallet identifiers
    const signerWalletIndicators = [
      // Wallet names
      'metamask', 'trust wallet', 'coinbase wallet', 'rainbow', 'walletconnect',
      'phantom', 'exodus', 'atomic wallet', 'ledger', 'trezor', 'safe wallet',
      'argent', 'gnosis safe', 'multisig', 'hardware wallet',
      // Mobile wallet apps
      'mobile', 'ios', 'android', 'app wallet', 'crypto wallet',
      // Wallet-specific terms
      'wallet', 'signer', 'keystore', 'private key', 'seed phrase',
      // URLs that indicate wallets
      'wallet.', 'metamask.', 'trustwallet.', 'coinbase.', 'rainbow.',
      'phantom.', 'exodus.', 'atomic.', 'ledger.', 'trezor.'
    ];

    // Check if any indicator is present in name, description, or URL
    const textToCheck = `${name} ${description} ${url}`;
    const isLikelyWallet = signerWalletIndicators.some(indicator =>
      textToCheck.includes(indicator)
    );

    // Additional heuristics:
    // 1. If the session only supports signing methods (no dApp-specific methods)
    const supportedMethods = session.namespaces?.eip155?.methods || [];
    const hasOnlySigningMethods = supportedMethods.length > 0 &&
      supportedMethods.every(method =>
        ['eth_sign', 'personal_sign', 'eth_signTypedData', 'eth_signTypedData_v4', 'eth_sendTransaction'].includes(method)
      );

    // 2. If the metadata looks generic or wallet-like
    const hasGenericMetadata = !metadata.icons || metadata.icons.length === 0 ||
      !metadata.url || metadata.url === '' || metadata.url === 'https://';

    if (isLikelyWallet || hasOnlySigningMethods || hasGenericMetadata) {
      console.log(`🔍 Session ${session.topic} identified as likely signer wallet:`, {
        name: metadata.name,
        url: metadata.url,
        isLikelyWallet,
        hasOnlySigningMethods,
        hasGenericMetadata
      });
      return true;
    }

    return false;
  }

  /**
   * Clear any incorrectly stored signer wallet sessions
   * This helps fix the issue where signer connections were mistakenly stored as dApp connections
   */
  public clearIncorrectSignerSessions(): void {
    console.log('🧹 Clearing any incorrectly stored signer wallet sessions...');
    const sessionsBefore = this.activeSessions.size;

    // Clear all sessions since they should only be dApp-initiated connections
    // Any legitimate dApp connections will be re-established when needed
    this.activeSessions.clear();

    console.log(`✅ Cleared ${sessionsBefore} sessions from dApp service`);
  }

  /**
   * Clean up any currently loaded sessions that appear to be signer wallet sessions
   * This can be called to fix sessions that were incorrectly loaded
   */
  public cleanupIncorrectlyLoadedSessions(): void {
    console.log('🧹 Cleaning up incorrectly loaded signer wallet sessions...');
    const sessionsBefore = this.activeSessions.size;
    let removedCount = 0;

    // Check each loaded session and remove if it looks like a signer wallet
    for (const [topic, session] of this.activeSessions.entries()) {
      if (this.isLikelySignerWalletSession(session)) {
        this.activeSessions.delete(topic);
        removedCount++;
        console.log(`🗑️ Removed likely signer wallet session: ${topic} (${session.peer?.metadata?.name})`);
      }
    }

    console.log(`✅ Cleanup complete: removed ${removedCount} signer sessions, ${this.activeSessions.size} dApp sessions remain`);
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
