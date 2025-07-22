import { ethers } from 'ethers';
import { SafeMessagePoolService } from './SafeMessagePoolService';
import { SAFE_ABI, getRpcUrl } from '../contracts/abis';

export interface SafeMessageSigningConfig {
  safeAddress: string;
  network: string;
  rpcUrl?: string;
}

export interface MessageSigningRequest {
  message: string;
  dAppTopic: string;
  dAppRequestId: number;
}

export interface MessageSigningResult {
  messageHash: string;
  message: string;
  signatures: string[];
  isExecuted: boolean;
  confirmations: number;
  threshold: number;
}

export class SafeMessageSigningService {
  private config?: SafeMessageSigningConfig;
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;
  private safeContract?: ethers.Contract;
  private messagePoolService: SafeMessagePoolService;

  constructor(network: string) {
    const rpcUrl = getRpcUrl(network);
    this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    this.messagePoolService = new SafeMessagePoolService(network);
  }

  /**
   * Configure the service with Safe wallet details
   */
  configure(config: SafeMessageSigningConfig): void {
    this.config = config;
    
    // Initialize Safe contract
    this.safeContract = new ethers.Contract(
      config.safeAddress,
      SAFE_ABI,
      this.provider
    );

    console.log('✅ SafeMessageSigningService configured for Safe:', config.safeAddress);
  }

  /**
   * Set the signer for signing operations
   */
  setSigner(signer: ethers.Signer): void {
    this.signer = signer;
    this.messagePoolService.setSigner(signer);
    
    if (this.safeContract) {
      this.safeContract = this.safeContract.connect(signer);
    }
  }

  /**
   * Create and propose a message for signing
   */
  async createMessageSigningRequest(request: MessageSigningRequest): Promise<MessageSigningResult> {
    if (!this.config || !this.signer) {
      throw new Error('Service not configured or signer not set');
    }

    console.log('🔐 Creating Safe message signing request...');
    console.log('📋 Message:', request.message);

    try {
      // Get network info
      const network = await this.provider.getNetwork();
      
      // Propose message to SafeMessagePool contract
      const messageHash = await this.messagePoolService.proposeMessage({
        safe: this.config.safeAddress,
        message: request.message,
        dAppTopic: request.dAppTopic,
        dAppRequestId: request.dAppRequestId
      }, network.chainId);

      // Get Safe threshold
      const threshold = await this.safeContract!.getThreshold();

      console.log('✅ Message signing request created');
      console.log('📋 Message hash:', messageHash);

      return {
        messageHash,
        message: request.message,
        signatures: [],
        isExecuted: false,
        confirmations: 0,
        threshold: threshold.toNumber()
      };
    } catch (error: any) {
      console.error('❌ Error creating message signing request:', error);
      throw new Error(`Failed to create message signing request: ${error.message}`);
    }
  }

  /**
   * Sign a Safe message using EIP-1271 format
   */
  async signSafeMessage(messageHash: string, message: string): Promise<string> {
    if (!this.config || !this.signer) {
      throw new Error('Service not configured or signer not set');
    }

    console.log('🔐 Signing Safe message...');
    console.log('📋 Message hash:', messageHash);
    console.log('📋 Message:', message);

    try {
      // Get network info for domain
      const network = await this.provider.getNetwork();
      
      // Generate the Safe message hash that should be signed
      const safeMessageHash = this.messagePoolService.generateSafeMessageHash(
        this.config.safeAddress,
        message,
        network.chainId
      );

      console.log('📋 Safe message hash to sign:', safeMessageHash);

      // Sign the Safe message hash
      const signature = await this.signer.signMessage(ethers.utils.arrayify(safeMessageHash));
      console.log('📋 Generated signature:', signature);

      // Submit signature to message pool
      await this.messagePoolService.signMessage(messageHash, signature);

      console.log('✅ Safe message signed successfully');
      return signature;
    } catch (error: any) {
      console.error('❌ Error signing Safe message:', error);
      throw new Error(`Failed to sign Safe message: ${error.message}`);
    }
  }

  /**
   * Sign a message and propose it to the pool in one step
   */
  async signAndProposeMessage(request: MessageSigningRequest): Promise<{ messageHash: string; signature: string }> {
    if (!this.config || !this.signer) {
      throw new Error('Service not configured or signer not set');
    }

    try {
      // Get network info
      const network = await this.provider.getNetwork();

      // Generate message hash
      const messageHash = this.messagePoolService.generateSafeMessageHash(
        this.config.safeAddress,
        request.message,
        network.chainId
      );

      // Sign the message first
      const signature = await this.signSafeMessage(messageHash, request.message);

      // Propose the message to the pool (this will include our signature)
      await this.messagePoolService.proposeMessage({
        safe: this.config.safeAddress,
        message: request.message,
        dAppTopic: request.dAppTopic,
        dAppRequestId: request.dAppRequestId
      }, network.chainId);

      return { messageHash, signature };
    } catch (error: any) {
      console.error('❌ Error signing and proposing message:', error);
      throw error;
    }
  }

  /**
   * Get message signing status
   */
  async getMessageSigningStatus(messageHash: string): Promise<MessageSigningResult | null> {
    if (!this.config) {
      throw new Error('Service not configured');
    }

    try {
      const messageDetails = await this.messagePoolService.getMessageDetails(messageHash);
      if (!messageDetails) {
        return null;
      }

      // Get Safe threshold
      const threshold = await this.safeContract!.getThreshold();
      const signatureCount = await this.messagePoolService.getMessageSignatureCount(messageHash);

      // Check if message is executed (has enough signatures)
      const isExecuted = signatureCount >= threshold.toNumber();

      return {
        messageHash,
        message: messageDetails.message,
        signatures: messageDetails.signatures.map(s => s.signature),
        isExecuted,
        confirmations: signatureCount,
        threshold: threshold.toNumber()
      };
    } catch (error: any) {
      console.error('❌ Error getting message signing status:', error);
      return null;
    }
  }

  /**
   * Get pending messages for the configured Safe
   */
  async getPendingMessages(): Promise<MessageSigningResult[]> {
    if (!this.config) {
      throw new Error('Service not configured');
    }

    try {
      const pendingMessages = await this.messagePoolService.getPendingMessages(this.config.safeAddress);
      const results: MessageSigningResult[] = [];

      // Get Safe threshold once
      const threshold = await this.safeContract!.getThreshold();

      for (const messageDetails of pendingMessages) {
        const signatureCount = messageDetails.signatures.length;
        const isExecuted = signatureCount >= threshold.toNumber();

        results.push({
          messageHash: messageDetails.messageHash,
          message: messageDetails.message,
          signatures: messageDetails.signatures.map(s => s.signature),
          isExecuted,
          confirmations: signatureCount,
          threshold: threshold.toNumber()
        });
      }

      return results;
    } catch (error: any) {
      console.error('❌ Error getting pending messages:', error);
      return [];
    }
  }

  /**
   * Get all messages for the configured Safe (including executed ones for history)
   */
  async getAllMessages(): Promise<MessageSigningResult[]> {
    if (!this.config) {
      throw new Error('Service not configured');
    }

    try {
      const allMessages = await this.messagePoolService.getAllMessages(this.config.safeAddress);
      const results: MessageSigningResult[] = [];

      // Get Safe threshold once
      const threshold = await this.safeContract!.getThreshold();

      for (const messageDetails of allMessages) {
        const signatureCount = messageDetails.signatures.length;
        const isExecuted = signatureCount >= threshold.toNumber();

        results.push({
          messageHash: messageDetails.messageHash,
          message: messageDetails.message,
          signatures: messageDetails.signatures.map(s => s.signature),
          isExecuted,
          confirmations: signatureCount,
          threshold: threshold.toNumber()
        });
      }

      return results;
    } catch (error: any) {
      console.error('❌ Error getting all messages:', error);
      return [];
    }
  }

  /**
   * Execute a message signing (mark as executed when threshold is met)
   */
  async executeMessageSigning(messageHash: string): Promise<void> {
    if (!this.config || !this.signer) {
      throw new Error('Service not configured or signer not set');
    }

    try {
      // Check if message has enough signatures
      const status = await this.getMessageSigningStatus(messageHash);
      if (!status) {
        throw new Error('Message not found');
      }

      if (!status.isExecuted) {
        throw new Error(`Message needs ${status.threshold} signatures, only has ${status.confirmations}`);
      }

      // Mark message as executed in the pool
      await this.messagePoolService.markMessageAsExecuted(messageHash);

      console.log('✅ Message signing executed successfully');
    } catch (error: any) {
      console.error('❌ Error executing message signing:', error);
      throw new Error(`Failed to execute message signing: ${error.message}`);
    }
  }

  /**
   * Check if current signer has signed a message
   */
  async hasCurrentSignerSigned(messageHash: string): Promise<boolean> {
    if (!this.signer) {
      return false;
    }

    try {
      const signerAddress = await this.signer.getAddress();
      return await this.messagePoolService.hasSignedMessage(messageHash, signerAddress);
    } catch (error: any) {
      console.error('❌ Error checking if current signer has signed:', error);
      return false;
    }
  }

  /**
   * Delete a message from the pool
   */
  async deleteMessage(messageHash: string): Promise<void> {
    if (!this.signer) {
      throw new Error('Signer not set');
    }

    try {
      await this.messagePoolService.deleteMessage(messageHash);
      console.log('✅ Message deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting message:', error);
      throw new Error(`Failed to delete message: ${error.message}`);
    }
  }
}
