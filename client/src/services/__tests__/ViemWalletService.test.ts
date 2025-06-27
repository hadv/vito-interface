import { ViemWalletService, type WalletState } from '../ViemWalletService'
import { connect, disconnect, getAccount, getChainId } from '@wagmi/core'
import { safeStorage } from '../../utils/walletStorage'

// Mock dependencies
jest.mock('@wagmi/core')
jest.mock('../../utils/walletStorage')
jest.mock('../../config/viem', () => ({
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

const mockConnect = connect as jest.MockedFunction<typeof connect>
const mockDisconnect = disconnect as jest.MockedFunction<typeof disconnect>
const mockGetAccount = getAccount as jest.MockedFunction<typeof getAccount>
const mockGetChainId = getChainId as jest.MockedFunction<typeof getChainId>
const mockSafeStorage = safeStorage as jest.Mocked<typeof safeStorage>

describe('ViemWalletService', () => {
  let walletService: ViemWalletService
  let stateListener: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    walletService = new ViemWalletService()
    stateListener = jest.fn()
    
    // Mock initial state
    mockGetAccount.mockReturnValue({
      isConnected: false,
      address: undefined,
      chainId: undefined,
      connector: undefined
    } as any)
    
    mockGetChainId.mockReturnValue(1)
    mockSafeStorage.shouldAutoReconnect.mockReturnValue(false)
  })

  afterEach(() => {
    walletService.destroy()
  })

  describe('Initial State', () => {
    it('should initialize with disconnected state', () => {
      const state = walletService.getState()
      expect(state.isConnected).toBe(false)
      expect(state.isConnecting).toBe(false)
      expect(state.address).toBeUndefined()
    })

    it('should call state listener immediately on subscription', () => {
      walletService.subscribe(stateListener)
      expect(stateListener).toHaveBeenCalledWith(walletService.getState())
    })
  })

  describe('MetaMask Connection', () => {
    it('should connect to MetaMask successfully', async () => {
      const mockResult = {
        accounts: ['0x1234567890123456789012345678901234567890'],
        chainId: 1
      }
      mockConnect.mockResolvedValue(mockResult as any)

      walletService.subscribe(stateListener)
      await walletService.connectMetaMask()

      expect(mockConnect).toHaveBeenCalledWith(
        expect.anything(),
        { connector: expect.objectContaining({ id: 'injected' }) }
      )
    })

    it('should handle MetaMask connection failure', async () => {
      const error = new Error('MetaMask not installed')
      mockConnect.mockRejectedValue(error)

      walletService.subscribe(stateListener)
      
      await expect(walletService.connectMetaMask()).rejects.toThrow()
      
      // Should update state with error
      const calls = stateListener.mock.calls
      const lastCall = calls[calls.length - 1][0]
      expect(lastCall.isConnecting).toBe(false)
      expect(lastCall.error).toBeDefined()
    })

    it('should set connecting state during connection', async () => {
      let resolveConnect: (value: any) => void
      const connectPromise = new Promise(resolve => {
        resolveConnect = resolve
      })
      mockConnect.mockReturnValue(connectPromise as any)

      walletService.subscribe(stateListener)
      const connectionPromise = walletService.connectMetaMask()

      // Check that connecting state is set
      const connectingCall = stateListener.mock.calls.find(call => 
        call[0].isConnecting === true
      )
      expect(connectingCall).toBeDefined()

      // Resolve the connection
      resolveConnect!({
        accounts: ['0x1234567890123456789012345678901234567890'],
        chainId: 1
      })
      await connectionPromise
    })
  })

  describe('WalletConnect Connection', () => {
    it('should connect to WalletConnect successfully', async () => {
      const mockResult = {
        accounts: ['0x1234567890123456789012345678901234567890'],
        chainId: 1
      }
      mockConnect.mockResolvedValue(mockResult as any)

      await walletService.connectWalletConnect()

      expect(mockConnect).toHaveBeenCalledWith(
        expect.anything(),
        { connector: expect.objectContaining({ id: 'walletConnect' }) }
      )
    })

    it('should handle WalletConnect connection failure', async () => {
      const error = new Error('WalletConnect connection failed')
      mockConnect.mockRejectedValue(error)

      await expect(walletService.connectWalletConnect()).rejects.toThrow()
    })
  })

  describe('Disconnection', () => {
    it('should disconnect wallet successfully', async () => {
      mockDisconnect.mockResolvedValue(undefined)

      await walletService.disconnectWallet()

      expect(mockDisconnect).toHaveBeenCalled()
      expect(mockSafeStorage.markDisconnected).toHaveBeenCalled()
    })

    it('should clear persisted state even if disconnect fails', async () => {
      mockDisconnect.mockRejectedValue(new Error('Disconnect failed'))

      await expect(walletService.disconnectWallet()).rejects.toThrow()
      expect(mockSafeStorage.markDisconnected).toHaveBeenCalled()
    })
  })

  describe('State Persistence', () => {
    it('should save state when connected', () => {
      // Simulate connection state update
      const mockState: WalletState = {
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        connector: 'MetaMask',
        isConnecting: false
      }

      // Access private method through any cast for testing
      ;(walletService as any).updateState(mockState)

      expect(mockSafeStorage.save).toHaveBeenCalledWith({
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        connector: 'MetaMask',
        autoReconnect: true
      })
    })

    it('should mark disconnected when wallet disconnects', () => {
      const mockState: WalletState = {
        isConnected: false,
        isConnecting: false
      }

      ;(walletService as any).updateState(mockState)

      expect(mockSafeStorage.markDisconnected).toHaveBeenCalled()
    })
  })

  describe('Auto-reconnection', () => {
    it('should attempt auto-reconnection when enabled', async () => {
      mockSafeStorage.shouldAutoReconnect.mockReturnValue(true)
      mockSafeStorage.getLastConnected.mockReturnValue({
        connector: 'MetaMask',
        address: '0x1234567890123456789012345678901234567890'
      })
      mockGetAccount.mockReturnValue({
        isConnected: false,
        address: undefined
      } as any)

      const connectSpy = jest.spyOn(walletService, 'connectMetaMask')
      connectSpy.mockResolvedValue()

      // Create new instance to trigger auto-reconnection
      const newService = new ViemWalletService()
      
      // Wait for auto-reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(connectSpy).toHaveBeenCalled()
      
      newService.destroy()
      connectSpy.mockRestore()
    })

    it('should not auto-reconnect when disabled', async () => {
      mockSafeStorage.shouldAutoReconnect.mockReturnValue(false)

      const connectSpy = jest.spyOn(walletService, 'connectMetaMask')
      
      // Create new instance
      const newService = new ViemWalletService()
      
      // Wait for potential auto-reconnection
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(connectSpy).not.toHaveBeenCalled()
      
      newService.destroy()
      connectSpy.mockRestore()
    })
  })

  describe('Error Handling', () => {
    it('should handle listener errors gracefully', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error')
      })
      const goodListener = jest.fn()

      walletService.subscribe(errorListener)
      walletService.subscribe(goodListener)

      // Trigger state update
      ;(walletService as any).updateState({ isConnecting: true })

      // Good listener should still be called despite error in first listener
      expect(goodListener).toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    it('should set auto-reconnect preference', () => {
      walletService.setAutoReconnect(true)
      expect(mockSafeStorage.setAutoReconnect).toHaveBeenCalledWith(true)
    })

    it('should check auto-reconnect status', () => {
      mockSafeStorage.shouldAutoReconnect.mockReturnValue(true)
      expect(walletService.isAutoReconnectEnabled()).toBe(true)
    })

    it('should unsubscribe listeners correctly', () => {
      const unsubscribe = walletService.subscribe(stateListener)
      unsubscribe()

      // Trigger state update
      ;(walletService as any).updateState({ isConnecting: true })

      // Listener should not be called after unsubscribe
      expect(stateListener).toHaveBeenCalledTimes(1) // Only initial call
    })
  })
})
