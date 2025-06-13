import React from 'react';
import { Transaction } from '../wallet/types';
import EnhancedTransactionItem from '../wallet/components/EnhancedTransactionItem';

// Demo data showing different types of token transfers
const demoTransactions: Transaction[] = [
  {
    id: 'demo-1',
    from: '0x1234567890123456789012345678901234567890',
    to: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    amount: '1000000000000000000',
    value: '1000000000000000000',
    status: 'executed',
    timestamp: Date.now() / 1000 - 3600,
    type: 'receive',
    hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    tokenTransfer: {
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenDecimals: 18,
      amount: '1000000000000000000',
      formattedAmount: '1.0000',
      direction: 'in',
      isNative: true
    }
  },
  {
    id: 'demo-2',
    from: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    to: '0x1234567890123456789012345678901234567890',
    amount: '500000000',
    value: '0',
    status: 'executed',
    timestamp: Date.now() / 1000 - 7200,
    type: 'send',
    hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    tokenTransfer: {
      tokenAddress: '0xA0b86a33E6441b8C4505B4afDcA7aBB2B6e1B4B4',
      tokenSymbol: 'USDC',
      tokenName: 'USD Coin',
      tokenDecimals: 6,
      amount: '500000000',
      formattedAmount: '500.0000',
      direction: 'out',
      isNative: false
    }
  },
  {
    id: 'demo-3',
    from: '0x9876543210987654321098765432109876543210',
    to: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    amount: '1000000000000000000000',
    value: '0',
    status: 'executed',
    timestamp: Date.now() / 1000 - 10800,
    type: 'receive',
    hash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    tokenTransfer: {
      tokenAddress: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      tokenSymbol: 'DAI',
      tokenName: 'Dai Stablecoin',
      tokenDecimals: 18,
      amount: '1000000000000000000000',
      formattedAmount: '1,000.0000',
      direction: 'in',
      isNative: false
    }
  },
  {
    id: 'demo-4',
    from: '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4',
    to: '0x5555666677778888999900001111222233334444',
    amount: '50000000000000000',
    value: '50000000000000000',
    status: 'executed',
    timestamp: Date.now() / 1000 - 14400,
    type: 'send',
    hash: '0xaaaa1111bbbb2222cccc3333dddd4444eeee5555ffff6666000077778888999',
    tokenTransfer: {
      tokenAddress: '0x0000000000000000000000000000000000000000',
      tokenSymbol: 'ETH',
      tokenName: 'Ethereum',
      tokenDecimals: 18,
      amount: '50000000000000000',
      formattedAmount: '0.0500',
      direction: 'out',
      isNative: true
    }
  }
];

const TokenTransferDemo: React.FC = () => {
  const safeAddress = '0x742d35Cc6634C0532925a3b8D4C9db96c4b4c4c4';
  const network = 'ethereum';

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">
          Enhanced Token Transfer Display Demo
        </h1>
        <p className="text-gray-400 mb-6">
          This demo shows how token transfers are now displayed with improved user-friendly information:
        </p>
        <ul className="text-gray-300 space-y-2 mb-6">
          <li>• <strong>Token Symbol:</strong> Shows the actual token (ETH, USDC, DAI) instead of generic "ETH"</li>
          <li>• <strong>Direction:</strong> Clear "in" (+) or "out" (-) indicators</li>
          <li>• <strong>Proper Decimals:</strong> Amounts formatted with correct token decimals</li>
          <li>• <strong>Token Names:</strong> Full token names in transaction titles</li>
        </ul>
      </div>

      <div className="bg-gray-800/30 rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700/50">
          <h3 className="font-medium text-white">Recent Transactions</h3>
        </div>
        
        <div className="divide-y divide-gray-700/30">
          {demoTransactions.map((transaction) => (
            <EnhancedTransactionItem
              key={transaction.id}
              transaction={transaction}
              safeAddress={safeAddress}
              network={network}
              onClick={(tx) => console.log('Transaction clicked:', tx)}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <h3 className="text-blue-300 font-medium mb-2">Implementation Features:</h3>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>✓ Automatic token detection from transaction data</li>
          <li>✓ ERC20 token metadata fetching (symbol, name, decimals)</li>
          <li>✓ Proper amount formatting based on token decimals</li>
          <li>✓ Clear visual indicators for incoming/outgoing transfers</li>
          <li>✓ Support for both native ETH and ERC20 tokens</li>
          <li>✓ Caching of token information for performance</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
        <h3 className="text-green-300 font-medium mb-2">How to Use:</h3>
        <ul className="text-green-200 text-sm space-y-1">
          <li>• Type <code className="bg-gray-800 px-2 py-1 rounded">:demo</code> to toggle this demo view</li>
          <li>• Click on any transaction to see console output</li>
          <li>• Notice the different token symbols and amounts</li>
          <li>• Observe the + and - indicators for direction</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenTransferDemo;
