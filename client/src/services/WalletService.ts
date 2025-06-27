import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
  getPublicClient,
  getWalletClient
} from '@wagmi/core'
import { createPublicClient, http, formatEther, parseEther, type Address, type Chain } from 'viem'
import { viemConfig, getChainByName, getRpcUrl, SAFE_NETWORKS, type NetworkName } from '../config/viem'
import { viemWalletService, type ViemWalletState } from './ViemWalletService'
import type {
  WalletState,
  WalletType,
  ConnectWalletParams,
  SafeInfo,
  TransactionData,
  SafeTransaction,
  WalletService as IWalletService
} from '../types/wallet'

// Safe contract ABI (minimal)
const SAFE_ABI = [
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'isOwner',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getOwners',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getThreshold',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nonce',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

class WalletService implements IWalletService {
  private state: WalletState = {
    isConnected: false,
    isConnecting: false,
    signerConnected: false,
    readOnlyMode: true,
  }

  private listeners: ((state: WalletState) => void)[] = []
  private viemWalletUnsubscribe?: () => void

  constructor() {
    this.setupEventListeners()
  }

  private setupEventListeners() {
    // Subscribe to ViemWalletService state changes
    this.viemWalletUnsubscribe = viemWalletService.subscribe((viemState) => {
      this.handleViemStateChange(viemState)
    })
  }

  private handleViemStateChange(viemState: ViemWalletState) {
    if (viemState.isConnected && viemState.address) {
      this.updateState({
        signerConnected: true,
        signerAddress: viemState.address,
        signerBalance: viemState.balance,
        chainId: viemState.chainId,
        walletType: this.mapConnectorToWalletType(viemState.connector),
        readOnlyMode: false,
        error: viemState.error,
      })
    } else {
      this.updateState({
        signerConnected: false,
        signerAddress: undefined,
        signerBalance: undefined,
        walletType: undefined,
        readOnlyMode: this.state.isConnected, // Keep read-only if Safe is connected
        error: viemState.error,
      })
    }
  }

  private mapConnectorToWalletType(connector?: string): WalletType | undefined {
    if (!connector) return undefined

    switch (connector.toLowerCase()) {
      case 'metamask':
      case 'injected':
        return 'metamask'
      case 'walletconnect':
        return 'walletconnect'
      default:
        return 'injected'
    }
  }

  private updateState(updates: Partial<WalletState>) {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.state))
  }

  // Public API
  getState(): WalletState {
    return { ...this.state }
  }

  subscribe(callback: (state: WalletState) => void): () => void {
    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  async connect(params: ConnectWalletParams): Promise<void> {
    try {
      this.updateState({ isConnecting: true, error: undefined })

      const chain = getChainByName(params.network)
      const networkConfig = SAFE_NETWORKS[params.network as NetworkName]

      // Create public client for read-only operations
      const publicClient = createPublicClient({
        chain,
        transport: http(networkConfig.rpcUrl),
      })

      // Get Safe info
      const safeInfo = await this.getSafeInfo(params.safeAddress, chain.id)
      const safeBalance = await publicClient.getBalance({ address: params.safeAddress })

      this.updateState({
        isConnected: true,
        isConnecting: false,
        safeAddress: params.safeAddress,
        safeBalance: formatEther(safeBalance),
        network: params.network,
        chainId: chain.id,
        readOnlyMode: params.readOnlyMode ?? true,
      })

    } catch (error) {
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Safe',
      })
      throw error
    }
  }

  async connectSigner(walletType: WalletType): Promise<void> {
    try {
      this.updateState({ isConnecting: true, error: undefined })

      // Use ViemWalletService for wallet connections
      switch (walletType) {
        case 'metamask':
        case 'injected':
          await viemWalletService.connectMetaMask()
          break
        case 'walletconnect':
          await viemWalletService.connectWalletConnect()
          break
        default:
          throw new Error(`Unsupported wallet type: ${walletType}`)
      }

      // State will be updated automatically via ViemWalletService subscription

    } catch (error) {
      this.updateState({
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect signer',
      })
      throw error
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Disconnect both Safe and signer
      await viemWalletService.disconnectWallet()
      this.updateState({
        isConnected: false,
        safeAddress: undefined,
        safeBalance: undefined,
        network: undefined,
        chainId: undefined,
        signerConnected: false,
        signerAddress: undefined,
        signerBalance: undefined,
        walletType: undefined,
        readOnlyMode: true,
        error: undefined,
      })
    } catch (error) {
      // Silent fail for disconnect
    }
  }

  async disconnectSigner(): Promise<void> {
    try {
      // Use ViemWalletService for disconnection
      await viemWalletService.disconnectWallet()
      // State will be updated automatically via subscription
    } catch (error) {
      // Silent fail for signer disconnect
    }
  }

  async getSafeInfo(address: Address, chainId: number): Promise<SafeInfo> {
    const publicClient = getPublicClient(viemConfig, { chainId: chainId as any })
    if (!publicClient) {
      throw new Error('Failed to get public client')
    }

    const [owners, threshold, nonce, balance] = await Promise.all([
      readContract(viemConfig, {
        address,
        abi: SAFE_ABI,
        functionName: 'getOwners',
        chainId: chainId as any,
      }) as Promise<Address[]>,
      readContract(viemConfig, {
        address,
        abi: SAFE_ABI,
        functionName: 'getThreshold',
        chainId: chainId as any,
      }) as Promise<bigint>,
      readContract(viemConfig, {
        address,
        abi: SAFE_ABI,
        functionName: 'nonce',
        chainId: chainId as any,
      }) as Promise<bigint>,
      publicClient.getBalance({ address }),
    ])

    return {
      address,
      owners,
      threshold: Number(threshold),
      nonce: Number(nonce),
      balance: formatEther(balance),
      chainId,
    }
  }

  async createTransaction(transaction: TransactionData): Promise<SafeTransaction> {
    // This would integrate with Safe's transaction service
    // For now, return a mock implementation
    throw new Error('Transaction creation not implemented yet')
  }

  async signTransaction(safeTxHash: string): Promise<string> {
    // This would use the connected signer to sign the transaction
    throw new Error('Transaction signing not implemented yet')
  }

  async executeTransaction(safeTxHash: string): Promise<string> {
    // This would execute the transaction on-chain
    throw new Error('Transaction execution not implemented yet')
  }

  async switchChain(chainId: number): Promise<void> {
    try {
      await viemWalletService.switchChain(chainId)
    } catch (error) {
      throw new Error(`Failed to switch chain: ${error}`)
    }
  }

  async getBalance(address: Address, chainId: number): Promise<string> {
    return await viemWalletService.getBalance(address)
  }

  // Cleanup method
  destroy(): void {
    this.viemWalletUnsubscribe?.()
    this.listeners = []
  }
}

// Singleton instance
export const walletService = new WalletService()
