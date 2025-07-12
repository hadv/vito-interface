/**
 * Transaction Proposal Service
 * Handles transaction creation and proposal without requiring signatures
 */

import { ethers } from 'ethers';
import { SafeTxPoolService } from './SafeTxPoolService';
import { walletConnectionService } from './WalletConnectionService';
import { ErrorHandler } from '../utils/errorHandling';

export interface TransactionProposalRequest {
  to: string;
  value: string;
  data?: string;
  operation?: number;
}

export interface ProposedTransaction {
  txHash: string;
  safe: string;
  to: string;
  value: string;
  data: string;
  operation: number;
  nonce: number;
  proposer: string;
  timestamp: number;
  network: string;
}

export class TransactionProposalService {
  private safeTxPoolService: SafeTxPoolService;

  constructor() {
    this.safeTxPoolService = new SafeTxPoolService('ethereum');
  }

  /**
   * Initialize the service with network and signer
   */
  async initialize(network: string): Promise<void> {
    try {
      // Initialize SafeTxPool service for the network
      this.safeTxPoolService = new SafeTxPoolService(network);
      
      // Get current signer from wallet connection service
      const connectionState = walletConnectionService.getConnectionState();
      if (!connectionState.signerConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      const signer = walletConnectionService.getSigner();
      if (!signer) {
        throw new Error('No signer available. Please connect your wallet first.');
      }

      this.safeTxPoolService.setSigner(signer);
      console.log('TransactionProposalService initialized for network:', network);
    } catch (error) {
      console.error('Failed to initialize TransactionProposalService:', error);
      throw error;
    }
  }

  /**
   * Propose a transaction without requiring signature
   * This creates a pending transaction that can be signed later
   */
  async proposeTransaction(
    safeAddress: string,
    request: TransactionProposalRequest,
    network: string
  ): Promise<ProposedTransaction> {
    try {
      // Ensure service is initialized for the correct network
      await this.initialize(network);

      // Get current network chain ID
      const provider = walletConnectionService.getProvider();
      if (!provider) {
        throw new Error('No provider available');
      }

      const networkInfo = await provider.getNetwork();
      const chainId = networkInfo.chainId;

      // Get next nonce for the Safe
      const nonce = await this.getNextNonce(safeAddress, chainId);

      // Prepare transaction parameters
      const proposalParams = {
        safe: safeAddress,
        to: request.to,
        value: request.value,
        data: request.data || '0x',
        operation: request.operation || 0,
        nonce
      };

      console.log('Proposing transaction:', proposalParams);

      // Propose transaction to SafeTxPool (no signature required)
      const txHash = await this.safeTxPoolService.proposeTx(proposalParams, chainId);

      // Get proposer address
      const signer = walletConnectionService.getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }
      const proposerAddress = await signer.getAddress();

      // Return proposed transaction details
      const proposedTransaction: ProposedTransaction = {
        txHash,
        safe: safeAddress,
        to: request.to,
        value: request.value,
        data: request.data || '0x',
        operation: request.operation || 0,
        nonce,
        proposer: proposerAddress,
        timestamp: Date.now(),
        network
      };

      console.log('Transaction proposed successfully:', proposedTransaction);
      return proposedTransaction;

    } catch (error) {
      console.error('Error proposing transaction:', error);
      const errorDetails = ErrorHandler.classifyError(error);
      throw new Error(`Failed to propose transaction: ${errorDetails.message}`);
    }
  }

  /**
   * Get the next nonce for a Safe address
   */
  private async getNextNonce(safeAddress: string, chainId: number): Promise<number> {
    try {
      // For now, we'll use a simple approach to get the next nonce
      // In a production system, this would query the Safe contract or SafeTxPool
      // to get the actual next nonce
      
      // Get current timestamp as a simple nonce (this is a simplified approach)
      // In production, you'd want to query the Safe contract's nonce
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime;
    } catch (error) {
      console.error('Error getting next nonce:', error);
      // Fallback to timestamp-based nonce
      return Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Validate transaction proposal request
   */
  validateProposalRequest(request: TransactionProposalRequest): { isValid: boolean; error?: string } {
    if (!request.to || !ethers.utils.isAddress(request.to)) {
      return { isValid: false, error: 'Invalid recipient address' };
    }

    if (!request.value || parseFloat(request.value) < 0) {
      return { isValid: false, error: 'Invalid transaction value' };
    }

    try {
      // Validate value can be parsed as BigNumber
      ethers.BigNumber.from(request.value);
    } catch {
      return { isValid: false, error: 'Invalid value format' };
    }

    if (request.data && !ethers.utils.isHexString(request.data)) {
      return { isValid: false, error: 'Invalid data format (must be hex string)' };
    }

    return { isValid: true };
  }

  /**
   * Check if SafeTxPool is configured for the network
   */
  isSafeTxPoolConfigured(network: string): boolean {
    try {
      const service = new SafeTxPoolService(network);
      return service.isConfigured();
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const transactionProposalService = new TransactionProposalService();
