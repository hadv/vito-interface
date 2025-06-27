import type { Address, Chain } from 'viem'
import type { Connector } from '@wagmi/core'

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any
  }
}

export interface WalletState {
  // Connection status
  isConnected: boolean
  isConnecting: boolean
  
  // Safe wallet info
  safeAddress?: Address
  safeBalance?: string
  network?: string
  chainId?: number
  
  // Signer wallet info
  signerConnected: boolean
  signerAddress?: Address
  signerBalance?: string
  walletType?: WalletType
  
  // Mode
  readOnlyMode: boolean
  
  // Error state
  error?: string
}

export type WalletType = 'metamask' | 'walletconnect' | 'injected'

export interface ConnectWalletParams {
  safeAddress: Address
  network: string
  readOnlyMode?: boolean
}

export interface WalletConnector {
  id: string
  name: string
  type: WalletType
  icon?: string
  connector: Connector
}

export interface SafeInfo {
  address: Address
  owners: Address[]
  threshold: number
  nonce: number
  balance: string
  chainId: number
}

export interface TransactionData {
  to: Address
  value?: bigint
  data?: `0x${string}`
  operation?: number
}

export interface SafeTransaction {
  to: Address
  value: string
  data: string
  operation: number
  safeTxGas: string
  baseGas: string
  gasPrice: string
  gasToken: Address
  refundReceiver: Address
  nonce: number
  safeTxHash: string
}

export interface WalletConnectionEvents {
  stateChange: (state: WalletState) => void
  connect: (params: { address: Address; chainId: number }) => void
  disconnect: () => void
  accountsChanged: (accounts: Address[]) => void
  chainChanged: (chainId: number) => void
  error: (error: Error) => void
}

export interface WalletService {
  // State
  getState(): WalletState
  subscribe(callback: (state: WalletState) => void): () => void
  
  // Connection
  connect(params: ConnectWalletParams): Promise<void>
  connectSigner(walletType: WalletType): Promise<void>
  disconnect(): Promise<void>
  disconnectSigner(): Promise<void>
  
  // Safe operations
  getSafeInfo(address: Address, chainId: number): Promise<SafeInfo>
  createTransaction(transaction: TransactionData): Promise<SafeTransaction>
  signTransaction(safeTxHash: string): Promise<string>
  executeTransaction(safeTxHash: string): Promise<string>
  
  // Utilities
  switchChain(chainId: number): Promise<void>
  getBalance(address: Address, chainId: number): Promise<string>
}
