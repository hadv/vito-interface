/**
 * Web3Auth Configuration
 *
 * This file contains the configuration for Web3Auth social login integration,
 * following the official Web3Auth demo pattern.
 */

import { WEB3AUTH_NETWORK } from "@web3auth/base";

// Web3Auth Client ID - Get this from Web3Auth Dashboard
// Create a project at https://dashboard.web3auth.io/
export const WEB3AUTH_CLIENT_ID = process.env.REACT_APP_WEB3AUTH_CLIENT_ID || 'BNJiiG6wVmiMMzApYoCbfD2xU0xxh3cp-t94tgKdwWEuf8Z5DOufWs4SnYiTqdqdA6-pTReQkaiI6z-y9rHxTIM';

// Web3Auth Network Configuration
export const WEB3AUTH_NETWORK_TYPE = process.env.NODE_ENV === 'production'
  ? WEB3AUTH_NETWORK.SAPPHIRE_MAINNET
  : WEB3AUTH_NETWORK.SAPPHIRE_DEVNET;

// Supported chains configuration for Web3Auth
export const SUPPORTED_CHAINS = {
  ethereum: {
    chainNamespace: "eip155",
    chainId: "0x1", // Ethereum Mainnet
    rpcTarget: "https://mainnet.infura.io/v3/YOUR_INFURA_KEY",
    displayName: "Ethereum Mainnet",
    blockExplorer: "https://etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  sepolia: {
    chainNamespace: "eip155",
    chainId: "0xaa36a7", // Sepolia Testnet
    rpcTarget: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
    displayName: "Sepolia Testnet",
    blockExplorer: "https://sepolia.etherscan.io",
    ticker: "ETH",
    tickerName: "Ethereum",
  },
  arbitrum: {
    chainNamespace: "eip155",
    chainId: "0xa4b1", // Arbitrum One
    rpcTarget: "https://arb1.arbitrum.io/rpc",
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
