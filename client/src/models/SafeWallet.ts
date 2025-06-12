import { safeWalletService } from '../services/SafeWalletService';
import { transactionService } from '../services/TransactionService';
import { walletConnectionService } from '../services/WalletConnectionService';

export interface WalletAccount {
  address: string;
  balance: string;
  name: string;
  owners?: string[];
  threshold?: number;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'confirmed' | 'executed';
  timestamp: number;
  safeTxHash?: string;
  executionTxHash?: string;
  confirmations?: number;
  threshold?: number;
  token?: string;
  gasUsed?: string;
  gasPrice?: string;
}

export interface SafeWallet {
  accounts: WalletAccount[];
  transactions: Transaction[];
}

/**
 * Create Safe wallet data from actual Safe services
 */
export const createSafeWallet = async (): Promise<SafeWallet> => {
  try {
    const connectionState = walletConnectionService.getState();

    if (!connectionState.isConnected || !connectionState.safeAddress) {
      throw new Error('Safe wallet not connected');
    }

    // Get Safe info
    const safeInfo = await safeWalletService.getSafeInfo();

    // Create account data
    const account: WalletAccount = {
      address: safeInfo.address,
      balance: safeInfo.balance,
      name: 'Safe Account',
      owners: safeInfo.owners,
      threshold: safeInfo.threshold
    };

    // Get transaction history
    const txHistory = await transactionService.getTransactionHistory();
    const pendingTxs = await transactionService.getPendingTransactions();

    // Convert to our transaction format
    const transactions: Transaction[] = [
      ...pendingTxs.map(tx => convertSafeTransactionToTransaction(tx, 'pending')),
      ...txHistory.map(tx => convertSafeTransactionToTransaction(tx, tx.isExecuted ? 'executed' : 'confirmed'))
    ];

    return {
      accounts: [account],
      transactions
    };
  } catch (error) {
    console.error('Error creating Safe wallet:', error);
    // Return empty wallet on error
    return {
      accounts: [],
      transactions: []
    };
  }
};

/**
 * Convert Safe API transaction to our Transaction interface
 */
function convertSafeTransactionToTransaction(safeTx: any, defaultStatus: Transaction['status']): Transaction {
  return {
    id: safeTx.safeTxHash || safeTx.transactionHash || `tx_${Date.now()}`,
    from: safeTx.safe || safeTx.from || '',
    to: safeTx.to || '',
    amount: safeTx.value || '0',
    status: safeTx.isExecuted ? 'executed' : defaultStatus,
    timestamp: safeTx.submissionDate ? new Date(safeTx.submissionDate).getTime() : Date.now(),
    safeTxHash: safeTx.safeTxHash,
    executionTxHash: safeTx.transactionHash,
    confirmations: safeTx.confirmations?.length || 0,
    threshold: safeTx.confirmationsRequired || 1,
    token: safeTx.tokenAddress ? 'ERC20' : 'ETH',
    gasUsed: safeTx.gasUsed?.toString(),
    gasPrice: safeTx.gasPrice?.toString()
  };
}

/**
 * Send a transaction using the Safe Wallet
 */
export const sendTransaction = async (
  from: string,
  to: string,
  amount: string,
  token?: string
): Promise<Transaction> => {
  try {
    const result = await transactionService.sendTransaction({
      to,
      amount,
      token
    });

    return {
      id: result.safeTxHash,
      from,
      to,
      amount,
      status: result.isExecuted ? 'executed' : 'pending',
      timestamp: Date.now(),
      safeTxHash: result.safeTxHash,
      confirmations: result.confirmations,
      threshold: result.threshold,
      token: token ? 'ERC20' : 'ETH'
    };
  } catch (error) {
    console.error('Error sending transaction:', error);
    throw error;
  }
};

/**
 * Get wallet balance from Safe
 */
export const getWalletBalance = async (address: string): Promise<string> => {
  try {
    const safeInfo = await safeWalletService.getSafeInfo();
    return safeInfo.balance;
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return '0';
  }
};

/**
 * Connect to Safe Wallet
 */
export const connectSafeWallet = async (
  safeAddress: string,
  network: string = 'ethereum'
): Promise<void> => {
  try {
    await walletConnectionService.connectWallet({
      safeAddress,
      network
    });
  } catch (error) {
    console.error('Error connecting to Safe wallet:', error);
    throw error;
  }
};

/**
 * Disconnect from Safe Wallet
 */
export const disconnectSafeWallet = async (): Promise<void> => {
  try {
    await walletConnectionService.disconnectWallet();
  } catch (error) {
    console.error('Error disconnecting from Safe wallet:', error);
    throw error;
  }
};

/**
 * Check if address is a Safe owner
 */
export const isOwner = async (address: string): Promise<boolean> => {
  try {
    return await safeWalletService.isOwner(address);
  } catch (error) {
    console.error('Error checking owner status:', error);
    return false;
  }
};