import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WalletProvider, useWallet } from '../contexts/WalletContext'
import { viemWalletService } from '../services/ViemWalletService'
import { walletService } from '../services/WalletService'

// Mock the wallet services
jest.mock('../services/ViemWalletService')
jest.mock('../services/WalletService')
jest.mock('../config/viem', () => ({
  viemConfig: {
    connectors: [
      { id: 'injected', name: 'MetaMask' },
      { id: 'walletConnect', name: 'WalletConnect' }
    ]
  },
  supportedChains: [
    { id: 1, name: 'Ethereum' },
    { id: 11155111, name: 'Sepolia' }
  ]
}))

const mockViemWalletService = viemWalletService as jest.Mocked<typeof viemWalletService>
const mockWalletService = walletService as jest.Mocked<typeof walletService>

// Test component that uses wallet context
const TestWalletComponent: React.FC = () => {
  const { 
    state, 
    connectSafe, 
    connectSigner, 
    disconnect, 
    disconnectSigner,
    showWalletModal,
    hideWalletModal,
    isModalOpen
  } = useWallet()

  return (
    <div>
      <div data-testid="connection-status">
        {state.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="signer-status">
        {state.signerConnected ? 'Signer Connected' : 'Signer Disconnected'}
      </div>
      <div data-testid="wallet-address">
        {state.safeAddress || 'No Address'}
      </div>
      <div data-testid="signer-address">
        {state.signerAddress || 'No Signer'}
      </div>
      <div data-testid="modal-status">
        {isModalOpen ? 'Modal Open' : 'Modal Closed'}
      </div>
      
      <button 
        data-testid="connect-safe"
        onClick={() => connectSafe({
          safeAddress: '0x1234567890123456789012345678901234567890',
          network: 'ethereum'
        })}
      >
        Connect Safe
      </button>
      
      <button 
        data-testid="connect-metamask"
        onClick={() => connectSigner('metamask')}
      >
        Connect MetaMask
      </button>
      
      <button 
        data-testid="connect-walletconnect"
        onClick={() => connectSigner('walletconnect')}
      >
        Connect WalletConnect
      </button>
      
      <button 
        data-testid="disconnect"
        onClick={disconnect}
      >
        Disconnect
      </button>
      
      <button 
        data-testid="disconnect-signer"
        onClick={disconnectSigner}
      >
        Disconnect Signer
      </button>
      
      <button 
        data-testid="show-modal"
        onClick={showWalletModal}
      >
        Show Modal
      </button>
      
      <button 
        data-testid="hide-modal"
        onClick={hideWalletModal}
      >
        Hide Modal
      </button>
    </div>
  )
}

describe('Wallet Integration', () => {
  let mockSubscribe: jest.Mock
  let mockStateCallback: (state: any) => void

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock wallet service subscription
    mockSubscribe = jest.fn((callback) => {
      mockStateCallback = callback
      // Call immediately with initial state
      callback({
        isConnected: false,
        isConnecting: false,
        signerConnected: false,
        readOnlyMode: true,
        error: undefined
      })
      return jest.fn() // unsubscribe function
    })
    
    mockWalletService.subscribe = mockSubscribe
    mockWalletService.getState = jest.fn().mockReturnValue({
      isConnected: false,
      isConnecting: false,
      signerConnected: false,
      readOnlyMode: true,
      error: undefined
    })
    
    // Mock wallet service methods
    mockWalletService.connect = jest.fn()
    mockWalletService.connectSigner = jest.fn()
    mockWalletService.disconnect = jest.fn()
    mockWalletService.disconnectSigner = jest.fn()
    mockWalletService.switchChain = jest.fn()
    mockWalletService.getBalance = jest.fn()
  })

  const renderWithProvider = () => {
    return render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    )
  }

  describe('Initial State', () => {
    it('should render with disconnected state', () => {
      renderWithProvider()
      
      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected')
      expect(screen.getByTestId('signer-status')).toHaveTextContent('Signer Disconnected')
      expect(screen.getByTestId('wallet-address')).toHaveTextContent('No Address')
      expect(screen.getByTestId('signer-address')).toHaveTextContent('No Signer')
      expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Closed')
    })

    it('should subscribe to wallet service on mount', () => {
      renderWithProvider()
      
      expect(mockWalletService.subscribe).toHaveBeenCalled()
    })
  })

  describe('Safe Connection', () => {
    it('should connect to Safe wallet', async () => {
      mockWalletService.connect.mockResolvedValue(undefined)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('connect-safe'))
      
      await waitFor(() => {
        expect(mockWalletService.connect).toHaveBeenCalledWith({
          safeAddress: '0x1234567890123456789012345678901234567890',
          network: 'ethereum'
        })
      })
    })

    it('should update state when Safe connects', async () => {
      renderWithProvider()
      
      // Simulate state change from wallet service
      mockStateCallback({
        isConnected: true,
        safeAddress: '0x1234567890123456789012345678901234567890',
        signerConnected: false,
        readOnlyMode: true,
        error: undefined
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected')
        expect(screen.getByTestId('wallet-address')).toHaveTextContent('0x1234567890123456789012345678901234567890')
      })
    })
  })

  describe('Signer Connection', () => {
    it('should connect MetaMask signer', async () => {
      mockWalletService.connectSigner.mockResolvedValue(undefined)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('connect-metamask'))
      
      await waitFor(() => {
        expect(mockWalletService.connectSigner).toHaveBeenCalledWith('metamask')
      })
    })

    it('should connect WalletConnect signer', async () => {
      mockWalletService.connectSigner.mockResolvedValue(undefined)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('connect-walletconnect'))
      
      await waitFor(() => {
        expect(mockWalletService.connectSigner).toHaveBeenCalledWith('walletconnect')
      })
    })

    it('should update state when signer connects', async () => {
      renderWithProvider()
      
      // Simulate signer connection
      mockStateCallback({
        isConnected: true,
        safeAddress: '0x1234567890123456789012345678901234567890',
        signerConnected: true,
        signerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        readOnlyMode: false,
        error: undefined
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('signer-status')).toHaveTextContent('Signer Connected')
        expect(screen.getByTestId('signer-address')).toHaveTextContent('0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef')
      })
    })

    it('should close modal when signer connects', async () => {
      renderWithProvider()
      
      // Open modal first
      fireEvent.click(screen.getByTestId('show-modal'))
      expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Open')
      
      // Simulate signer connection
      mockStateCallback({
        isConnected: false,
        signerConnected: true,
        signerAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        readOnlyMode: false,
        error: undefined
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Closed')
      })
    })
  })

  describe('Disconnection', () => {
    it('should disconnect wallet', async () => {
      mockWalletService.disconnect.mockResolvedValue(undefined)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('disconnect'))
      
      await waitFor(() => {
        expect(mockWalletService.disconnect).toHaveBeenCalled()
      })
    })

    it('should disconnect signer only', async () => {
      mockWalletService.disconnectSigner.mockResolvedValue(undefined)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('disconnect-signer'))
      
      await waitFor(() => {
        expect(mockWalletService.disconnectSigner).toHaveBeenCalled()
      })
    })
  })

  describe('Modal Management', () => {
    it('should show and hide modal', () => {
      renderWithProvider()
      
      // Initially closed
      expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Closed')
      
      // Show modal
      fireEvent.click(screen.getByTestId('show-modal'))
      expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Open')
      
      // Hide modal
      fireEvent.click(screen.getByTestId('hide-modal'))
      expect(screen.getByTestId('modal-status')).toHaveTextContent('Modal Closed')
    })
  })

  describe('Error Handling', () => {
    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')
      mockWalletService.connectSigner.mockRejectedValue(error)
      
      renderWithProvider()
      
      fireEvent.click(screen.getByTestId('connect-metamask'))
      
      // Should not throw and should handle error gracefully
      await waitFor(() => {
        expect(mockWalletService.connectSigner).toHaveBeenCalled()
      })
    })
  })
})
