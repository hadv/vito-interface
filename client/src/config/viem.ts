import { createConfig, http } from '@wagmi/core'
import { mainnet, sepolia, polygon, arbitrum, optimism } from '@wagmi/core/chains'
import { injected, walletConnect } from '@wagmi/connectors'

// WalletConnect project ID - replace with your actual project ID
const WALLETCONNECT_PROJECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || 'your-project-id'

// Supported chains
export const supportedChains = [mainnet, sepolia, polygon, arbitrum, optimism] as const

// Chain configurations
export const chainConfig = {
  ethereum: mainnet,
  sepolia: sepolia,
  polygon: polygon,
  arbitrum: arbitrum,
  optimism: optimism,
} as const

// RPC URLs
const rpcUrls = {
  [mainnet.id]: process.env.REACT_APP_ETHEREUM_RPC_URL || 'https://eth.llamarpc.com',
  [sepolia.id]: process.env.REACT_APP_SEPOLIA_RPC_URL || 'https://sepolia.gateway.tenderly.co',
  [polygon.id]: process.env.REACT_APP_POLYGON_RPC_URL || 'https://polygon.llamarpc.com',
  [arbitrum.id]: process.env.REACT_APP_ARBITRUM_RPC_URL || 'https://arbitrum.llamarpc.com',
  [optimism.id]: process.env.REACT_APP_OPTIMISM_RPC_URL || 'https://optimism.llamarpc.com',
}

// Create Viem config
export const viemConfig = createConfig({
  chains: supportedChains,
  connectors: [
    // MetaMask and other injected wallets
    injected({
      target: 'metaMask',
    }),
    
    // WalletConnect v2
    walletConnect({
      projectId: WALLETCONNECT_PROJECT_ID,
      metadata: {
        name: 'Vito',
        description: 'Vito Safe Wallet Interface',
        url: 'https://vito.app',
        icons: ['https://vito.app/icon.png'],
      },
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'light',
        themeVariables: {
          '--wcm-z-index': '9999',
        },
      },
    }),
  ],
  transports: {
    [mainnet.id]: http(rpcUrls[mainnet.id]),
    [sepolia.id]: http(rpcUrls[sepolia.id]),
    [polygon.id]: http(rpcUrls[polygon.id]),
    [arbitrum.id]: http(rpcUrls[arbitrum.id]),
    [optimism.id]: http(rpcUrls[optimism.id]),
  },
})

// Helper function to get chain by name
export function getChainByName(chainName: string) {
  const chain = chainConfig[chainName as keyof typeof chainConfig]
  if (!chain) {
    throw new Error(`Unsupported chain: ${chainName}`)
  }
  return chain
}

// Helper function to get RPC URL
export function getRpcUrl(chainId: number): string {
  return rpcUrls[chainId as keyof typeof rpcUrls] || rpcUrls[mainnet.id]
}

// Network configurations for Safe
export const SAFE_NETWORKS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    rpcUrl: rpcUrls[mainnet.id],
    safeService: 'https://safe-transaction-mainnet.safe.global',
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: rpcUrls[sepolia.id],
    safeService: 'https://safe-transaction-sepolia.safe.global',
  },
  polygon: {
    chainId: 137,
    name: 'Polygon',
    rpcUrl: rpcUrls[polygon.id],
    safeService: 'https://safe-transaction-polygon.safe.global',
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    rpcUrl: rpcUrls[arbitrum.id],
    safeService: 'https://safe-transaction-arbitrum.safe.global',
  },
  optimism: {
    chainId: 10,
    name: 'Optimism',
    rpcUrl: rpcUrls[optimism.id],
    safeService: 'https://safe-transaction-optimism.safe.global',
  },
} as const

export type NetworkName = keyof typeof SAFE_NETWORKS
export type SafeNetwork = typeof SAFE_NETWORKS[NetworkName]
