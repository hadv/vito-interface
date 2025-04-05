export interface WalletAccount {
  address: string;
  balance: string;
  name: string;
}

export interface Transaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
}

export interface SafeWallet {
  accounts: WalletAccount[];
  transactions: Transaction[];
}

// This is a mock implementation - in a real app, you would connect to actual Safe wallet API
export const createMockSafeWallet = (): SafeWallet => {
  return {
    accounts: [
      {
        address: '0x1234567890123456789012345678901234567890',
        balance: '10.5',
        name: 'Main Safe',
      },
      {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        balance: '5.2',
        name: 'Team Safe',
      },
    ],
    transactions: [
      {
        id: 'tx1',
        from: '0x1234567890123456789012345678901234567890',
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        amount: '1.5',
        status: 'completed',
        timestamp: Date.now() - 86400000, // 1 day ago
      },
      {
        id: 'tx2',
        from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        to: '0x1234567890123456789012345678901234567890',
        amount: '0.5',
        status: 'pending',
        timestamp: Date.now() - 3600000, // 1 hour ago
      },
    ],
  };
};

// Helper functions for safe wallet operations
export const sendTransaction = async (
  from: string,
  to: string,
  amount: string
): Promise<Transaction> => {
  // This would be replaced with actual API call to Safe Wallet
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: `tx${Date.now()}`,
        from,
        to,
        amount,
        status: 'pending',
        timestamp: Date.now(),
      });
    }, 1000);
  });
};

export const getWalletBalance = async (address: string): Promise<string> => {
  // This would be replaced with actual API call to Safe Wallet
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Math.random() * 10 + 1 + '');
    }, 500);
  });
}; 