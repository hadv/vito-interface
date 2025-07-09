import { SignClient } from '@walletconnect/sign-client';
import { SessionTypes } from '@walletconnect/types';
import { WALLETCONNECT_SIGNER_PROJECT_ID, WALLETCONNECT_SIGNER_METADATA } from '../config/walletconnect';

/**
 * Unified WalletConnect Manager
 * 
 * This service manages all WalletConnect connections using a single SignClient instance
 * to avoid conflicts between multiple clients. It distinguishes between signer wallet
 * connections and dApp connections based on session metadata and usage context.
 */
export class WalletConnectManager {
  private static instance: WalletConnectManager;
  private signClient: any = null;
  private signerSessionTopic: string | null = null;
  private dAppSessions: Map<string, SessionTypes.Struct> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): WalletConnectManager {
    if (!WalletConnectManager.instance) {
      WalletConnectManager.instance = new WalletConnectManager();
    }
    return WalletConnectManager.instance;
  }

  /**
   * Initialize the WalletConnect SignClient
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing unified WalletConnect manager...');
      
      this.signClient = await SignClient.init({
        projectId: WALLETCONNECT_SIGNER_PROJECT_ID,
        metadata: WALLETCONNECT_SIGNER_METADATA
      });

      // Set up event listeners
      this.setupEventListeners();

      // Load existing sessions and categorize them
      this.loadAndCategorizeExistingSessions();

      this.isInitialized = true;
      console.log('✅ Unified WalletConnect manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize WalletConnect manager:', error);
      throw error;
    }
  }

  /**
   * Set up WalletConnect event listeners
   */
  private setupEventListeners(): void {
    if (!this.signClient) return;

    // Handle session proposals
    this.signClient.on('session_proposal', (event: any) => {
      setTimeout(() => {
        try {
          this.handleSessionProposal(event).catch(error => {
            console.error('❌ Error handling session proposal:', error);
          });
        } catch (error) {
          console.error('❌ Synchronous error in session proposal handler:', error);
        }
      }, 0);
    });

    // Handle session requests
    this.signClient.on('session_request', (event: any) => {
      setTimeout(() => {
        try {
          this.handleSessionRequest(event).catch(error => {
            console.error('❌ Error handling session request:', error);
          });
        } catch (error) {
          console.error('❌ Synchronous error in session request handler:', error);
        }
      }, 0);
    });

    // Handle session deletions
    this.signClient.on('session_delete', (event: any) => {
      setTimeout(() => {
        try {
          this.handleSessionDelete(event);
        } catch (error) {
          console.error('❌ Error handling session delete:', error);
        }
      }, 0);
    });

    // Handle session expiry
    this.signClient.on('session_expire', (event: any) => {
      setTimeout(() => {
        try {
          this.handleSessionExpire(event);
        } catch (error) {
          console.error('❌ Error handling session expire:', error);
        }
      }, 0);
    });

    // Global error handler
    this.signClient.on('error', (error: any) => {
      console.error('🚨 WalletConnect global error (swallowed):', error);
    });
  }

  /**
   * Load existing sessions and categorize them
   */
  private loadAndCategorizeExistingSessions(): void {
    try {
      if (!this.signClient) return;

      setTimeout(() => {
        try {
          const sessions = this.signClient.session.getAll();
          console.log('📋 Loading and categorizing existing sessions:', sessions.length);

          sessions.forEach((session: SessionTypes.Struct) => {
            if (session.topic && session.peer?.metadata) {
              if (this.isSignerWalletSession(session)) {
                // This is a signer wallet connection
                this.signerSessionTopic = session.topic;
                console.log('📱 Loaded signer wallet session:', session.topic, session.peer.metadata.name);
              } else {
                // This is a dApp connection
                this.dAppSessions.set(session.topic, session);
                console.log('🔗 Loaded dApp session:', session.topic, session.peer.metadata.name);
              }
            }
          });

          console.log('✅ Categorized sessions - Signer:', !!this.signerSessionTopic, 'dApps:', this.dAppSessions.size);
        } catch (error) {
          console.error('❌ Error loading existing sessions:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('❌ Error in loadAndCategorizeExistingSessions:', error);
    }
  }

  /**
   * Determine if a session is a signer wallet connection
   */
  private isSignerWalletSession(session: SessionTypes.Struct): boolean {
    const peerName = session.peer?.metadata?.name?.toLowerCase() || '';
    const walletKeywords = ['wallet', 'metamask', 'trust', 'coinbase', 'rainbow', 'argent', 'uniswap wallet'];
    return walletKeywords.some(keyword => peerName.includes(keyword));
  }

  /**
   * Handle session proposals
   */
  private async handleSessionProposal(event: any): Promise<void> {
    console.log('📥 Received session proposal:', event);
    
    // For now, auto-reject all proposals since we're focusing on fixing the disconnect issue
    // This can be expanded later to handle dApp connections properly
    try {
      await this.signClient?.reject({
        id: event.id,
        reason: {
          code: 5001,
          message: 'Session proposals temporarily disabled during migration'
        }
      });
    } catch (error) {
      console.error('❌ Failed to reject proposal:', error);
    }
  }

  /**
   * Handle session requests
   */
  private async handleSessionRequest(event: any): Promise<void> {
    console.log('📨 Received session request:', event);
    
    // Forward to appropriate handler based on session type
    const { topic } = event;
    
    if (topic === this.signerSessionTopic) {
      // This is a signer wallet request - emit for WalletConnectService to handle
      this.emit('signer_request', event);
    } else if (this.dAppSessions.has(topic)) {
      // This is a dApp request - emit for DAppWalletConnectService to handle
      this.emit('dapp_request', event);
    } else {
      console.warn('⚠️ Received request for unknown session:', topic);
    }
  }

  /**
   * Handle session deletions
   */
  private handleSessionDelete(event: any): void {
    console.log('🗑️ Session deleted:', event);
    
    const { topic } = event;
    
    if (topic === this.signerSessionTopic) {
      // Signer wallet disconnected
      this.signerSessionTopic = null;
      this.emit('signer_disconnected', { topic });
      console.log('📱 Signer wallet session deleted:', topic);
    } else if (this.dAppSessions.has(topic)) {
      // dApp disconnected
      this.dAppSessions.delete(topic);
      this.emit('dapp_disconnected', { topic });
      console.log('🔗 dApp session deleted:', topic);
    } else {
      console.log('🚫 Ignoring session delete for unknown topic:', topic);
    }
  }

  /**
   * Handle session expiry
   */
  private handleSessionExpire(event: any): void {
    console.log('⏰ Session expired:', event);
    
    const { topic } = event;
    
    if (topic === this.signerSessionTopic) {
      // Signer wallet session expired
      this.signerSessionTopic = null;
      this.emit('signer_disconnected', { topic, reason: 'expired' });
      console.log('📱 Signer wallet session expired:', topic);
    } else if (this.dAppSessions.has(topic)) {
      // dApp session expired
      this.dAppSessions.delete(topic);
      this.emit('dapp_disconnected', { topic, reason: 'expired' });
      console.log('🔗 dApp session expired:', topic);
    } else {
      console.log('🚫 Ignoring session expire for unknown topic:', topic);
    }
  }

  /**
   * Get the SignClient instance
   */
  public getSignClient(): any {
    return this.signClient;
  }

  /**
   * Get signer session topic
   */
  public getSignerSessionTopic(): string | null {
    return this.signerSessionTopic;
  }

  /**
   * Set signer session topic
   */
  public setSignerSessionTopic(topic: string | null): void {
    this.signerSessionTopic = topic;
  }

  /**
   * Get dApp sessions
   */
  public getDAppSessions(): SessionTypes.Struct[] {
    return Array.from(this.dAppSessions.values());
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

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const walletConnectManager = WalletConnectManager.getInstance();
