import { ethers } from 'ethers';
import { SafeTxPoolService, AddressBookEntry } from './SafeTxPoolService';
import { createSafeTxPoolService } from './SafeTxPoolService';

// Re-export the AddressBookEntry interface for convenience
export { AddressBookEntry };

export interface AddressBookEntryWithValidation extends AddressBookEntry {
  isValid: boolean;
  error?: string;
}

export class AddressBookService {
  private safeTxPoolService: SafeTxPoolService;
  private cache: Map<string, AddressBookEntry[]> = new Map();
  private eventListeners: Array<() => void> = [];

  constructor(network: string = 'ethereum') {
    this.safeTxPoolService = createSafeTxPoolService(network);
  }

  /**
   * Set the signer for write operations
   */
  setSigner(signer: ethers.Signer | null): void {
    this.safeTxPoolService.setSigner(signer);
  }

  /**
   * Check if the service is properly initialized
   */
  isInitialized(): boolean {
    return this.safeTxPoolService.isInitialized();
  }

  /**
   * Validate an address book entry
   */
  validateEntry(name: string, walletAddress: string): { isValid: boolean; error?: string } {
    // Validate name
    if (!name || name.trim().length === 0) {
      return { isValid: false, error: 'Name is required' };
    }

    if (name.trim().length > 31) {
      return { isValid: false, error: 'Name must be 31 characters or less' };
    }

    // Validate address
    if (!walletAddress) {
      return { isValid: false, error: 'Wallet address is required' };
    }

    if (!ethers.utils.isAddress(walletAddress)) {
      return { isValid: false, error: 'Invalid wallet address format' };
    }

    if (walletAddress === ethers.constants.AddressZero) {
      return { isValid: false, error: 'Cannot use zero address' };
    }

    return { isValid: true };
  }

  /**
   * Add an entry to the address book
   */
  async addEntry(safe: string, walletAddress: string, name: string): Promise<void> {
    const validation = this.validateEntry(name, walletAddress);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      await this.safeTxPoolService.addAddressBookEntry(safe, walletAddress, name.trim());
      
      // Update cache
      this.invalidateCache(safe);
      
      // Refresh cache
      await this.getEntries(safe);
    } catch (error) {
      console.error('Error adding address book entry:', error);
      throw error;
    }
  }

  /**
   * Remove an entry from the address book
   */
  async removeEntry(safe: string, walletAddress: string): Promise<void> {
    try {
      await this.safeTxPoolService.removeAddressBookEntry(safe, walletAddress);
      
      // Update cache
      this.invalidateCache(safe);
      
      // Refresh cache
      await this.getEntries(safe);
    } catch (error) {
      console.error('Error removing address book entry:', error);
      throw error;
    }
  }

  /**
   * Get all address book entries for a Safe (with caching)
   */
  async getEntries(safe: string, useCache: boolean = true): Promise<AddressBookEntry[]> {
    const cacheKey = safe.toLowerCase();
    
    if (useCache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const entries = await this.safeTxPoolService.getAddressBookEntries(safe);
      
      // Sort entries by name
      entries.sort((a, b) => a.name.localeCompare(b.name));
      
      // Update cache
      this.cache.set(cacheKey, entries);
      
      return entries;
    } catch (error) {
      console.error('Error getting address book entries:', error);
      return [];
    }
  }

  /**
   * Search entries by name or address
   */
  async searchEntries(safe: string, query: string): Promise<AddressBookEntry[]> {
    const entries = await this.getEntries(safe);
    
    if (!query || query.trim().length === 0) {
      return entries;
    }

    const searchTerm = query.toLowerCase().trim();
    
    return entries.filter(entry => 
      entry.name.toLowerCase().includes(searchTerm) ||
      entry.walletAddress.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Find an entry by wallet address
   */
  async findByAddress(safe: string, walletAddress: string): Promise<AddressBookEntry | null> {
    const entries = await this.getEntries(safe);
    return entries.find(entry => 
      entry.walletAddress.toLowerCase() === walletAddress.toLowerCase()
    ) || null;
  }

  /**
   * Check if an address exists in the address book
   */
  async hasAddress(safe: string, walletAddress: string): Promise<boolean> {
    const entry = await this.findByAddress(safe, walletAddress);
    return entry !== null;
  }

  /**
   * Get a display name for an address (returns name if in address book, otherwise shortened address)
   */
  async getDisplayName(safe: string, walletAddress: string): Promise<string> {
    const entry = await this.findByAddress(safe, walletAddress);
    if (entry) {
      return entry.name;
    }
    
    // Return shortened address
    return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
  }

  /**
   * Invalidate cache for a specific Safe
   */
  private invalidateCache(safe: string): void {
    const cacheKey = safe.toLowerCase();
    this.cache.delete(cacheKey);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Set up event listeners for real-time updates
   */
  setupEventListeners(safe: string, onUpdate: () => void): void {
    // Listen for address book events
    this.safeTxPoolService.onAddressBookEntryAdded((eventSafe, walletAddress, name) => {
      if (eventSafe.toLowerCase() === safe.toLowerCase()) {
        this.invalidateCache(safe);
        onUpdate();
      }
    });

    this.safeTxPoolService.onAddressBookEntryRemoved((eventSafe, walletAddress) => {
      if (eventSafe.toLowerCase() === safe.toLowerCase()) {
        this.invalidateCache(safe);
        onUpdate();
      }
    });
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    this.safeTxPoolService.removeAllListeners();
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners = [];
    this.clearCache();
  }
}

// Create singleton instances for different networks
export const addressBookService = new AddressBookService();
export const createAddressBookService = (network: string) => new AddressBookService(network);
