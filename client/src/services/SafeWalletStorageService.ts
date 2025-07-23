/**
 * Service for managing recent Safe wallets in local storage
 */

export interface RecentSafeWallet {
  address: string;
  network: string;
  name: string;
  lastConnected: number; // timestamp
}

export class SafeWalletStorageService {
  private static instance: SafeWalletStorageService;
  private readonly STORAGE_KEY = 'vito_recent_safe_wallets';
  private readonly MAX_RECENT_WALLETS = 10;

  private constructor() {}

  public static getInstance(): SafeWalletStorageService {
    if (!SafeWalletStorageService.instance) {
      SafeWalletStorageService.instance = new SafeWalletStorageService();
    }
    return SafeWalletStorageService.instance;
  }

  /**
   * Get all recent Safe wallets, sorted by last connected (most recent first)
   */
  public getRecentWallets(): RecentSafeWallet[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const wallets: RecentSafeWallet[] = JSON.parse(stored);
      
      // Sort by lastConnected timestamp (most recent first)
      return wallets.sort((a, b) => b.lastConnected - a.lastConnected);
    } catch (error) {
      console.warn('Failed to load recent Safe wallets from storage:', error);
      return [];
    }
  }

  /**
   * Add or update a Safe wallet in recent list
   */
  public addRecentWallet(wallet: Omit<RecentSafeWallet, 'lastConnected'>): void {
    try {
      const wallets = this.getRecentWallets();
      const now = Date.now();

      // Check if wallet already exists (same address and network)
      const existingIndex = wallets.findIndex(
        w => w.address.toLowerCase() === wallet.address.toLowerCase() && 
             w.network === wallet.network
      );

      if (existingIndex >= 0) {
        // Update existing wallet
        wallets[existingIndex] = {
          ...wallet,
          lastConnected: now
        };
      } else {
        // Add new wallet
        wallets.unshift({
          ...wallet,
          lastConnected: now
        });
      }

      // Keep only the most recent wallets
      const trimmedWallets = wallets.slice(0, this.MAX_RECENT_WALLETS);

      this.saveToStorage(trimmedWallets);
    } catch (error) {
      console.error('Failed to add recent Safe wallet to storage:', error);
    }
  }

  /**
   * Remove a Safe wallet from recent list
   */
  public removeRecentWallet(address: string, network: string): void {
    try {
      const wallets = this.getRecentWallets();
      const filteredWallets = wallets.filter(
        w => !(w.address.toLowerCase() === address.toLowerCase() && w.network === network)
      );

      this.saveToStorage(filteredWallets);
    } catch (error) {
      console.error('Failed to remove recent Safe wallet from storage:', error);
    }
  }

  /**
   * Clear all recent Safe wallets
   */
  public clearRecentWallets(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recent Safe wallets from storage:', error);
    }
  }

  /**
   * Check if a Safe wallet exists in recent list
   */
  public hasRecentWallet(address: string, network: string): boolean {
    const wallets = this.getRecentWallets();
    return wallets.some(
      w => w.address.toLowerCase() === address.toLowerCase() && w.network === network
    );
  }

  /**
   * Get a specific recent Safe wallet
   */
  public getRecentWallet(address: string, network: string): RecentSafeWallet | null {
    const wallets = this.getRecentWallets();
    return wallets.find(
      w => w.address.toLowerCase() === address.toLowerCase() && w.network === network
    ) || null;
  }

  /**
   * Save wallets to localStorage
   */
  private saveToStorage(wallets: RecentSafeWallet[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(wallets));
    } catch (error) {
      console.error('Failed to save recent Safe wallets to storage:', error);
    }
  }

  /**
   * Get the most recently connected wallet
   */
  public getMostRecentWallet(): RecentSafeWallet | null {
    const wallets = this.getRecentWallets();
    return wallets.length > 0 ? wallets[0] : null;
  }

  /**
   * Update the name of an existing recent wallet
   */
  public updateWalletName(address: string, network: string, newName: string): void {
    try {
      const wallets = this.getRecentWallets();
      const walletIndex = wallets.findIndex(
        w => w.address.toLowerCase() === address.toLowerCase() && w.network === network
      );

      if (walletIndex >= 0) {
        wallets[walletIndex].name = newName;
        this.saveToStorage(wallets);
      }
    } catch (error) {
      console.error('Failed to update wallet name in storage:', error);
    }
  }
}

// Export singleton instance
export const safeWalletStorageService = SafeWalletStorageService.getInstance();
