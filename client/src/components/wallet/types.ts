export interface Asset {
  symbol: string;
  name: string;
  balance: string;
  value: string;
  type: 'native' | 'erc20' | 'erc721';
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  type?: 'send' | 'receive' | 'swap' | 'contract';
  token?: string;
  gasUsed?: string;
  gasPrice?: string;
  description?: string;
  hash?: string;
}

export type MenuSection = 'home' | 'assets' | 'transactions' | 'settings';

export interface WalletPageProps {
  walletAddress?: string;
  ensName?: string;
  network?: string;
  isLoadingEns?: boolean;
} 