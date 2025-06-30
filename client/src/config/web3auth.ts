/**
 * Web3Auth Configuration
 *
 * This file contains the configuration for Web3Auth social login integration,
 * following the official Web3Auth demo pattern.
 */

import { WEB3AUTH_NETWORK } from "@web3auth/base";

// Web3Auth Client ID - Get this from Web3Auth Dashboard
// Create a project at https://dashboard.web3auth.io/
export const WEB3AUTH_CLIENT_ID = process.env.REACT_APP_WEB3AUTH_CLIENT_ID || '';

// Web3Auth Network Configuration
export const WEB3AUTH_NETWORK_TYPE = process.env.NODE_ENV === 'production'
  ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
  : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;

// Get RPC URL with Infura key fallback
const getInfuraRpcUrl = (network: string): string => {
  const INFURA_KEY = process.env.REACT_APP_INFURA_KEY;

  if (!INFURA_KEY || INFURA_KEY === 'YOUR_INFURA_KEY') {
    // Fallback to public RPC endpoints if Infura key not configured
    switch (network) {
      case 'ethereum':
        return 'https://ethereum.publicnode.com';
      case 'sepolia':
        return 'https://ethereum-sepolia.publicnode.com';
      case 'arbitrum':
        return 'https://arb1.arbitrum.io/rpc';
      default:
        return 'https://ethereum-sepolia.publicnode.com';
    }
  }

  // Use Infura with the configured key
  switch (network) {
    case 'ethereum':
      return `https://mainnet.infura.io/v3/${INFURA_KEY}`;
    case 'sepolia':
      return `https://sepolia.infura.io/v3/${INFURA_KEY}`;
    case 'arbitrum':
      return 'https://arb1.arbitrum.io/rpc'; // Arbitrum doesn't use Infura
    default:
      return `https://sepolia.infura.io/v3/${INFURA_KEY}`;
  }
};

// Supported chains configuration for Web3Auth
export const SUPPORTED_CHAINS = {
  ethereum: {
    chainNamespace: "eip155",
    chainId: "0x1", // Ethereum Mainnet
    rpcTarget: getInfuraRpcUrl('ethereum'),
    displayName: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  sepolia: {
    chainNamespace: "eip155",
    chainId: "0xaa36a7", // Sepolia Testnet
    rpcTarget: getInfuraRpcUrl('sepolia'),
    displayName: "Sepolia Testnet",
    blockExplorer: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  arbitrum: {
    chainNamespace: "eip155",
    chainId: "0xa4b1", // Arbitrum One
    rpcTarget: getInfuraRpcUrl('arbitrum'),
    displayName: "Arbitrum One",
    blockExplorer: "https://arbiscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  }
};

// Web3Auth Configuration
export const WEB3AUTH_CONFIG = {
  clientId: WEB3AUTH_CLIENT_ID,
  web3AuthNetwork: WEB3AUTH_NETWORK_TYPE,
  chainConfig: SUPPORTED_CHAINS.sepolia, // Default to Sepolia for development
  enableLogging: true,
};

// Helper function to get chain config by network name
export const getChainConfigByNetwork = (network: string) => {
  switch (network.toLowerCase()) {
    case 'ethereum':
    case 'mainnet':
      return SUPPORTED_CHAINS.ethereum;
    case 'sepolia':
      return SUPPORTED_CHAINS.sepolia;
    case 'arbitrum':
      return SUPPORTED_CHAINS.arbitrum;
    default:
      return SUPPORTED_CHAINS.sepolia; // Default fallback
  }
};
