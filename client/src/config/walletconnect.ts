/**
 * WalletConnect v2 Configuration
 */

// For development, you can use a demo project ID
// For production, get your own project ID from https://cloud.walletconnect.com/
export const WALLETCONNECT_PROJECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'demo-project-id-for-development';

export const WALLETCONNECT_METADATA = {
  name: 'Vito Interface',
  description: 'A secure and efficient application designed to interact with Safe wallets',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://localhost:3000',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/favicon.ico` : 'https://localhost:3000/favicon.ico']
};

// Get configured RPC URL for WalletConnect
const getConfiguredRpcUrl = (network: string): string => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { rpcConfigService } = require('../services/RpcConfigService');
    return rpcConfigService.getRpcUrl(network);
  } catch (error) {
    // Fallback to default URLs
    switch (network) {
      case 'ethereum':
        return 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
      case 'sepolia':
        return 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
      case 'arbitrum':
        return 'https://arb1.arbitrum.io/rpc';
      default:
        return 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY';
    }
  }
};

export const SUPPORTED_CHAINS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: getConfiguredRpcUrl('ethereum')
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: getConfiguredRpcUrl('sepolia')
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: getConfiguredRpcUrl('arbitrum')
  }
};

export const WALLETCONNECT_REQUIRED_NAMESPACES = {
  eip155: {
    methods: [
      'eth_sendTransaction',
      'eth_signTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData',
      'eth_signTypedData_v4'
    ],
    chains: [
      'eip155:1',      // Ethereum
      'eip155:11155111', // Sepolia
      'eip155:42161'   // Arbitrum
    ],
    events: ['accountsChanged', 'chainChanged']
  }
};

export const WALLETCONNECT_MODAL_CONFIG = {
  themeMode: 'dark' as const,
  themeVariables: {
    '--wcm-z-index': '1060',
    '--wcm-accent-color': '#3b82f6',
    '--wcm-background-color': '#1e293b',
    '--wcm-background-border-radius': '16px'
  }
};
