import { 
  WalletStorage, 
  WalletSessionStorage, 
  safeStorage,
  isBrowser,
  type PersistedWalletState 
} from '../walletStorage'

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
}

const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
})

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
})

describe('WalletStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(1000000)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('saveState', () => {
    it('should save wallet state to localStorage', () => {
      const state: PersistedWalletState = {
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
        chainId: 1,
        connector: 'MetaMask',
        autoReconnect: true
      }

      WalletStorage.saveState(state)

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vito_wallet_state',
        JSON.stringify({
          version: '1.0',
          timestamp: 1000000,
          state: {
            ...state,
            lastConnected: 1000000
          }
        })
      )
    })

    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded')
      })

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const state: PersistedWalletState = {
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890'
      }

      expect(() => WalletStorage.saveState(state)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('loadState', () => {
    it('should load valid wallet state from localStorage', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          address: '0x1234567890123456789012345678901234567890',
          chainId: 1,
          connector: 'MetaMask',
          autoReconnect: true,
          lastConnected: 999000
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.loadState()

      expect(result).toEqual(storedData.state)
    })

    it('should return null for non-existent data', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      const result = WalletStorage.loadState()

      expect(result).toBeNull()
    })

    it('should clear and return null for incompatible version', () => {
      const storedData = {
        version: '0.9',
        timestamp: 1000000,
        state: { isConnected: true }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.loadState()

      expect(result).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vito_wallet_state')
    })

    it('should clear and return null for expired data', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000 - (25 * 60 * 60 * 1000), // 25 hours ago
        state: { isConnected: true }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.loadState()

      expect(result).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vito_wallet_state')
    })

    it('should handle JSON parse errors', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json')
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = WalletStorage.loadState()

      expect(result).toBeNull()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vito_wallet_state')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('shouldAutoReconnect', () => {
    it('should return true for valid auto-reconnect state', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          autoReconnect: true,
          lastConnected: 1000000 - (30 * 60 * 1000) // 30 minutes ago
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.shouldAutoReconnect()

      expect(result).toBe(true)
    })

    it('should return false for old connection', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          autoReconnect: true,
          lastConnected: 1000000 - (2 * 60 * 60 * 1000) // 2 hours ago
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.shouldAutoReconnect()

      expect(result).toBe(false)
    })

    it('should return false when autoReconnect is disabled', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          autoReconnect: false,
          lastConnected: 1000000 - (30 * 60 * 1000)
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.shouldAutoReconnect()

      expect(result).toBe(false)
    })
  })

  describe('getLastConnectedWallet', () => {
    it('should return last connected wallet info', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          address: '0x1234567890123456789012345678901234567890',
          connector: 'MetaMask',
          autoReconnect: true,
          lastConnected: 1000000 - (30 * 60 * 1000)
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.getLastConnectedWallet()

      expect(result).toEqual({
        connector: 'MetaMask',
        address: '0x1234567890123456789012345678901234567890'
      })
    })

    it('should return null when auto-reconnect not allowed', () => {
      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: {
          isConnected: true,
          autoReconnect: false
        }
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      const result = WalletStorage.getLastConnectedWallet()

      expect(result).toBeNull()
    })
  })

  describe('markDisconnected', () => {
    it('should update existing state to disconnected', () => {
      const existingState = {
        isConnected: true,
        address: '0x1234567890123456789012345678901234567890',
        connector: 'MetaMask'
      }

      const storedData = {
        version: '1.0',
        timestamp: 1000000,
        state: existingState
      }

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedData))

      WalletStorage.markDisconnected()

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vito_wallet_state',
        JSON.stringify({
          version: '1.0',
          timestamp: 1000000,
          state: {
            ...existingState,
            isConnected: false,
            autoReconnect: false,
            lastConnected: 1000000
          }
        })
      )
    })

    it('should clear storage when no existing state', () => {
      mockLocalStorage.getItem.mockReturnValue(null)

      WalletStorage.markDisconnected()

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('vito_wallet_state')
    })
  })
})

describe('WalletSessionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(1000000)
  })

  it('should save and load session data', () => {
    const testData = { test: 'value' }

    WalletSessionStorage.saveSession(testData)

    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
      'vito_wallet_session',
      JSON.stringify({
        timestamp: 1000000,
        data: testData
      })
    )

    mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
      timestamp: 1000000,
      data: testData
    }))

    const result = WalletSessionStorage.loadSession()

    expect(result).toEqual(testData)
  })

  it('should clear session data', () => {
    WalletSessionStorage.clearSession()

    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('vito_wallet_session')
  })
})

describe('isBrowser', () => {
  it('should return true in browser environment', () => {
    expect(isBrowser()).toBe(true)
  })
})

describe('safeStorage', () => {
  it('should delegate to WalletStorage methods', () => {
    const state: PersistedWalletState = {
      isConnected: true,
      address: '0x1234567890123456789012345678901234567890'
    }

    const saveStateSpy = jest.spyOn(WalletStorage, 'saveState')
    const loadStateSpy = jest.spyOn(WalletStorage, 'loadState')
    const clearStateSpy = jest.spyOn(WalletStorage, 'clearState')

    safeStorage.save(state)
    safeStorage.load()
    safeStorage.clear()

    expect(saveStateSpy).toHaveBeenCalledWith(state)
    expect(loadStateSpy).toHaveBeenCalled()
    expect(clearStateSpy).toHaveBeenCalled()

    saveStateSpy.mockRestore()
    loadStateSpy.mockRestore()
    clearStateSpy.mockRestore()
  })
})
