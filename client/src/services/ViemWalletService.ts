/**
 * Simple Wallet Service
 * Clean MetaMask connection without complex dependencies
 */

import { EventEmitter } from 'events'

export type WalletConnector = 'MetaMask' | 'WalletConnect'

export interface ViemWalletState {
  isConnected: boolean
  isConnecting: boolean
  address?: `0x${string}`
  chainId?: number
  connector?: WalletConnector
  error?: string
  balance?: string
}

declare global {
  interface Window {
    ethereum?: any
  }
}

export class ViemWalletService extends EventEmitter {
  private state: ViemWalletState = {
    isConnected: false,
    isConnecting: false
  }

  constructor() {
    super()
    this.setupMetaMaskListeners()
  }

  getState(): ViemWalletState {
    return { ...this.state }
  }

  // Subscribe to state changes
  subscribe(callback: (state: ViemWalletState) => void): () => void {
    this.on('stateChange', callback)
    return () => this.off('stateChange', callback)
  }

  // Connect to MetaMask
  async connectMetaMask(): Promise<void> {
    console.log('🦊 Connecting to MetaMask...')

    if (this.state.isConnecting) {
      console.log('⏳ Already connecting...')
      return
    }

    this.updateState({ isConnecting: true, error: undefined })

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed')
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }

      const chainId = await window.ethereum.request({
        method: 'eth_chainId'
      })

      const address = accounts[0] as `0x${string}`
      const numericChainId = parseInt(chainId, 16)

      this.updateState({
        isConnected: true,
        isConnecting: false,
        address,
        chainId: numericChainId,
        connector: 'MetaMask',
        error: undefined
      })

      console.log('✅ MetaMask connected:', { address, chainId: numericChainId })
      this.emit('connected', { address, chainId: numericChainId, connector: 'MetaMask' })

    } catch (error: any) {
      console.error('❌ MetaMask connection failed:', error)
      this.updateState({
        isConnecting: false,
        error: error.message || 'Failed to connect MetaMask'
      })
      throw error
    }
  }

  // Connect to WalletConnect (placeholder)
  async connectWalletConnect(): Promise<void> {
    throw new Error('WalletConnect not implemented yet')
  }

  // Disconnect wallet
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting wallet...')

    this.cleanupMetaMaskListeners()

    this.updateState({
      isConnected: false,
      isConnecting: false,
      address: undefined,
      chainId: undefined,
      connector: undefined,
      error: undefined,
      balance: undefined
    })

    console.log('✅ Wallet disconnected')
    this.emit('disconnected')
  }

  // Private helper methods
  private updateState(newState: Partial<ViemWalletState>): void {
    this.state = { ...this.state, ...newState }
    this.emit('stateChange', this.state)
  }

  private setupMetaMaskListeners(): void {
    if (!window.ethereum) return

    const handleAccountsChanged = (accounts: string[]) => {
      console.log('🦊 MetaMask accounts changed:', accounts)
      if (accounts.length === 0) {
        this.disconnect()
      } else if (accounts[0] !== this.state.address) {
        this.updateState({ address: accounts[0] as `0x${string}` })
        this.emit('accountChanged', accounts[0])
      }
    }

    const handleChainChanged = (chainId: string) => {
      console.log('🦊 MetaMask chain changed:', chainId)
      const numericChainId = parseInt(chainId, 16)
      this.updateState({ chainId: numericChainId })
      this.emit('chainChanged', numericChainId)
    }

    window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
    window.ethereum.removeListener('chainChanged', handleChainChanged)
    window.ethereum.on('accountsChanged', handleAccountsChanged)
    window.ethereum.on('chainChanged', handleChainChanged)
  }

  private cleanupMetaMaskListeners(): void {
    if (!window.ethereum) return
    try {
      window.ethereum.removeAllListeners('accountsChanged')
      window.ethereum.removeAllListeners('chainChanged')
    } catch (error) {
      console.warn('Failed to clean up MetaMask listeners:', error)
    }
  }

  // Additional methods needed by WalletService
  async disconnectWallet(): Promise<void> {
    await this.disconnect()
  }

  async switchChain(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask not available')
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
    } catch (error: any) {
      throw new Error(`Failed to switch chain: ${error.message}`)
    }
  }

  async getBalance(address: `0x${string}`): Promise<string> {
    // Simple implementation - return "0" for now
    return "0"
  }
}

// Create singleton instance
export const viemWalletService = new ViemWalletService()


