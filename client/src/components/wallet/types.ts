export interface Asset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  type: 'native' | 'erc20' | 'erc721';
  contractAddress?: string; // For ERC-20 tokens
  decimals?: number; // For ERC-20 tokens
  isTrusted?: boolean; // True if this token is in the Safe's trusted contracts list
}

export interface TokenTransferInfo {
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenDecimals: number;
  amount: string;
  formattedAmount: string;
  direction: 'in' | 'out';
  isNative: boolean; // true for ETH, false for ERC20
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed' | 'confirmed' | 'executed';
  timestamp: number;
  type?: 'send' | 'receive' | 'swap' | 'contract';
  token?: string;
  gasUsed?: string;
  gasPrice?: string;
  description?: string;
  hash?: string;
  safeTxHash?: string;
  executionTxHash?: string;
  confirmations?: number;
  threshold?: number;
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
  // Token transfer information
  tokenTransfer?: TokenTransferInfo;
}

export type MenuSection = 'home' | 'assets' | 'transactions' | 'addressbook' | 'settings';

export interface WalletPageProps {
  walletAddress?: string;
  ensName?: string;
  network?: string;
  isLoadingEns?: boolean;
} 