import { safeWalletService } from '../services/SafeWalletService';
import { transactionService } from '../services/TransactionService';
import { walletService } from '../services/WalletService';

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
  // Enhanced on-chain data fields
  blockNumber?: number;
  blockHash?: string;
  nonce?: number;
  operation?: number;
  data?: string;
  executor?: string;
  isExecuted?: boolean;
  submissionDate?: string;
  proposer?: string;
  txId?: number;
  signatures?: string[];
  value?: string;
  gasToken?: string;
  safeTxGas?: string;
  baseGas?: string;
  refundReceiver?: string;
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
    const walletState = walletService.getState();

    if (!walletState.isConnected || !walletState.safeAddress) {
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
    timestamp: safeTx.timestamp || (safeTx.submissionDate ? new Date(safeTx.submissionDate).getTime() / 1000 : Date.now() / 1000),
    safeTxHash: safeTx.safeTxHash,
    executionTxHash: safeTx.transactionHash || safeTx.executionTxHash,
    confirmations: safeTx.confirmations?.length || safeTx.confirmations || 0,
    threshold: safeTx.confirmationsRequired || safeTx.threshold || 1,
    token: safeTx.tokenAddress ? 'ERC20' : 'ETH',
    gasUsed: safeTx.gasUsed?.toString(),
    gasPrice: safeTx.gasPrice?.toString(),
    // Enhanced on-chain data
    blockNumber: safeTx.blockNumber,
    blockHash: safeTx.blockHash,
    nonce: safeTx.nonce,
    operation: safeTx.operation,
    data: safeTx.data,
    executor: safeTx.executor,
    isExecuted: safeTx.isExecuted,
    submissionDate: safeTx.submissionDate,
    proposer: safeTx.proposer,
    txId: safeTx.txId,
    signatures: safeTx.signatures,
    value: safeTx.value,
    gasToken: safeTx.gasToken,
    safeTxGas: safeTx.safeTxGas,
    baseGas: safeTx.baseGas,
    refundReceiver: safeTx.refundReceiver
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
    await walletService.connect({
      safeAddress: safeAddress as `0x${string}`,
      network,
      readOnlyMode: true  // Always use read-only mode to prevent MetaMask popup
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
    await walletService.disconnect();
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