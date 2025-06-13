import { ethers } from 'ethers';
import { TokenService } from './TokenService';
import { TokenTransferParser } from '../utils/tokenTransferParser';
import { Transaction } from '../components/wallet/types';

export class TransactionEnhancementService {
  private tokenService: TokenService;
  private transferParser: TokenTransferParser;

  constructor(provider: ethers.providers.Provider, network: string) {
    this.tokenService = new TokenService(provider, network);
    this.transferParser = new TokenTransferParser(this.tokenService);
  }

  /**
   * Enhance a single transaction with token transfer information
   */
  async enhanceTransaction(transaction: Transaction, safeAddress: string): Promise<Transaction> {
    try {
      console.log('🔍 Enhancing transaction:', transaction.id, 'value:', transaction.value, 'data:', transaction.data?.slice(0, 20));
      const tokenTransfer = await this.transferParser.parseTokenTransfer(transaction, safeAddress);

      if (tokenTransfer) {
        console.log('✅ Token transfer detected:', tokenTransfer.tokenSymbol, tokenTransfer.formattedAmount, tokenTransfer.direction);
      } else {
        console.log('❌ No token transfer detected for transaction:', transaction.id);
      }

      return {
        ...transaction,
        tokenTransfer: tokenTransfer || undefined
      };
    } catch (error) {
      console.error('Error enhancing transaction:', error);
      return transaction;
    }
  }

  /**
   * Enhance multiple transactions with token transfer information
   */
  async enhanceTransactions(transactions: Transaction[], safeAddress: string): Promise<Transaction[]> {
    const enhancedTransactions: Transaction[] = [];
    
    // Process transactions in batches to avoid overwhelming the provider
    const batchSize = 10;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const enhancedBatch = await Promise.all(
        batch.map(tx => this.enhanceTransaction(tx, safeAddress))
      );
      enhancedTransactions.push(...enhancedBatch);
    }

    return enhancedTransactions;
  }

  /**
   * Get token service instance for direct access
   */
  getTokenService(): TokenService {
    return this.tokenService;
  }

  /**
   * Get transfer parser instance for direct access
   */
  getTransferParser(): TokenTransferParser {
    return this.transferParser;
  }
}
