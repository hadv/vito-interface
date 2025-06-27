/**
 * Wallet connection state persistence utilities
 */

export interface PersistedWalletState {
  isConnected: boolean
  address?: string
  chainId?: number
  connector?: string
  lastConnected?: number
  autoReconnect?: boolean
}

const STORAGE_KEY = 'vito_wallet_state'
const STORAGE_VERSION = '1.0'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours

export class WalletStorage {
  /**
   * Save wallet state to localStorage
   */
  static saveState(state: PersistedWalletState): void {
    try {
      const dataToStore = {
        version: STORAGE_VERSION,
        timestamp: Date.now(),
        state: {
          ...state,
          lastConnected: Date.now()
        }
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore))
    } catch (error) {
      console.warn('Failed to save wallet state to localStorage:', error)
    }
  }

  /**
   * Load wallet state from localStorage
   */
  static loadState(): PersistedWalletState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return null

      const data = JSON.parse(stored)
      
      // Check version compatibility
      if (data.version !== STORAGE_VERSION) {
        this.clearState()
        return null
      }

      // Check if data is too old
      const age = Date.now() - (data.timestamp || 0)
      if (age > MAX_AGE_MS) {
        this.clearState()
        return null
      }

      return data.state || null
    } catch (error) {
      console.warn('Failed to load wallet state from localStorage:', error)
      this.clearState()
      return null
    }
  }

  /**
   * Clear stored wallet state
   */
  static clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.warn('Failed to clear wallet state from localStorage:', error)
    }
  }

  /**
   * Check if auto-reconnect is enabled and valid
   */
  static shouldAutoReconnect(): boolean {
    const state = this.loadState()
    if (!state) return false

    // Only auto-reconnect if explicitly enabled and recently connected
    const recentlyConnected = state.lastConnected && 
      (Date.now() - state.lastConnected) < (60 * 60 * 1000) // 1 hour

    return !!(state.autoReconnect && state.isConnected && recentlyConnected)
  }

  /**
   * Get last connected wallet type for auto-reconnect
   */
  static getLastConnectedWallet(): { connector?: string; address?: string } | null {
    const state = this.loadState()
    if (!state || !this.shouldAutoReconnect()) return null

    return {
      connector: state.connector,
      address: state.address
    }
  }

  /**
   * Update auto-reconnect preference
   */
  static setAutoReconnect(enabled: boolean): void {
    const currentState = this.loadState()
    if (currentState) {
      this.saveState({
        ...currentState,
        autoReconnect: enabled
      })
    }
  }

  /**
   * Mark wallet as disconnected
   */
  static markDisconnected(): void {
    const currentState = this.loadState()
    if (currentState) {
      this.saveState({
        ...currentState,
        isConnected: false,
        autoReconnect: false
      })
    } else {
      this.clearState()
    }
  }
}

/**
 * Session storage for temporary wallet data
 */
export class WalletSessionStorage {
  private static readonly SESSION_KEY = 'vito_wallet_session'

  /**
   * Save temporary session data
   */
  static saveSession(data: any): void {
    try {
      sessionStorage.setItem(this.SESSION_KEY, JSON.stringify({
        timestamp: Date.now(),
        data
      }))
    } catch (error) {
      console.warn('Failed to save wallet session:', error)
    }
  }

  /**
   * Load session data
   */
  static loadSession(): any {
    try {
      const stored = sessionStorage.getItem(this.SESSION_KEY)
      if (!stored) return null

      const parsed = JSON.parse(stored)
      return parsed.data || null
    } catch (error) {
      console.warn('Failed to load wallet session:', error)
      return null
    }
  }

  /**
   * Clear session data
   */
  static clearSession(): void {
    try {
      sessionStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear wallet session:', error)
    }
  }
}

/**
 * Utility to detect if running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

/**
 * Safe storage operations that handle SSR
 */
export const safeStorage = {
  save: (state: PersistedWalletState) => {
    if (isBrowser()) {
      WalletStorage.saveState(state)
    }
  },
  
  load: (): PersistedWalletState | null => {
    if (isBrowser()) {
      return WalletStorage.loadState()
    }
    return null
  },
  
  clear: () => {
    if (isBrowser()) {
      WalletStorage.clearState()
    }
  },
  
  shouldAutoReconnect: (): boolean => {
    if (isBrowser()) {
      return WalletStorage.shouldAutoReconnect()
    }
    return false
  },

  getLastConnected: () => {
    if (isBrowser()) {
      return WalletStorage.getLastConnectedWallet()
    }
    return null
  },

  markDisconnected: () => {
    if (isBrowser()) {
      WalletStorage.markDisconnected()
    }
  },

  setAutoReconnect: (enabled: boolean) => {
    if (isBrowser()) {
      WalletStorage.setAutoReconnect(enabled)
    }
  }
}
