import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { walletService } from '../services/WalletService'
import type { WalletState, WalletType, ConnectWalletParams } from '../types/wallet'
import type { Address } from 'viem'

interface WalletContextType {
  // State
  state: WalletState
  
  // Modal state
  isModalOpen: boolean
  showWalletModal: () => void
  hideWalletModal: () => void
  
  // Connection actions
  connectSafe: (params: ConnectWalletParams) => Promise<void>
  connectSigner: (walletType: WalletType) => Promise<void>
  disconnect: () => Promise<void>
  disconnectSigner: () => Promise<void>
  
  // Utilities
  switchChain: (chainId: number) => Promise<void>
  getBalance: (address: Address, chainId: number) => Promise<string>
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}

interface WalletProviderProps {
  children: React.ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>(walletService.getState())
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Subscribe to wallet state changes
  useEffect(() => {
    const unsubscribe = walletService.subscribe((newState) => {
      setState(newState)
      
      // Auto-close modal when signer connects
      if (newState.signerConnected && isModalOpen) {
        setIsModalOpen(false)
      }
    })

    return unsubscribe
  }, [isModalOpen])

  // Modal controls
  const showWalletModal = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const hideWalletModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  // Connection actions
  const connectSafe = useCallback(async (params: ConnectWalletParams) => {
    try {
      await walletService.connect(params)
    } catch (error) {
      console.error('Failed to connect to Safe:', error)
      throw error
    }
  }, [])

  const connectSigner = useCallback(async (walletType: WalletType) => {
    try {
      // If already connected to a different wallet type, disconnect first
      if (state.signerConnected && state.walletType !== walletType) {
        console.log(`🔄 Switching from ${state.walletType} to ${walletType}`)
        await walletService.disconnectSigner()
        // Small delay to ensure clean disconnect
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await walletService.connectSigner(walletType)
    } catch (error) {
      console.error('Failed to connect signer:', error)
      // Handle WalletError objects properly
      if (error && typeof error === 'object' && 'userMessage' in error) {
        throw new Error((error as any).userMessage)
      } else if (error && typeof error === 'object' && 'message' in error) {
        throw new Error((error as any).message)
      } else {
        throw new Error('Failed to connect wallet')
      }
    }
  }, [state.signerConnected, state.walletType])

  const disconnect = useCallback(async () => {
    try {
      await walletService.disconnect()
    } catch (error) {
      console.error('Failed to disconnect:', error)
      throw error
    }
  }, [])

  const disconnectSigner = useCallback(async () => {
    try {
      await walletService.disconnectSigner()
    } catch (error) {
      console.error('Failed to disconnect signer:', error)
      throw error
    }
  }, [])

  // Utilities
  const switchChain = useCallback(async (chainId: number) => {
    try {
      await walletService.switchChain(chainId)
    } catch (error) {
      console.error('Failed to switch chain:', error)
      throw error
    }
  }, [])

  const getBalance = useCallback(async (address: Address, chainId: number) => {
    try {
      return await walletService.getBalance(address, chainId)
    } catch (error) {
      console.error('Failed to get balance:', error)
      throw error
    }
  }, [])

  const contextValue: WalletContextType = {
    state,
    isModalOpen,
    showWalletModal,
    hideWalletModal,
    connectSafe,
    connectSigner,
    disconnect,
    disconnectSigner,
    switchChain,
    getBalance,
  }

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  )
}
