import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { AddressBookService, AddressBookEntry } from '../services/AddressBookService';
import { createAddressBookService } from '../services/AddressBookService';
import { walletConnectionService } from '../services/WalletConnectionService';
import { useToast } from './useToast';

interface UseAddressBookOptions {
  network?: string;
  safeAddress?: string;
  autoRefresh?: boolean;
}

interface UseAddressBookReturn {
  entries: AddressBookEntry[];
  loading: boolean;
  error: string | null;
  addEntry: (walletAddress: string, name: string) => Promise<void>;
  removeEntry: (walletAddress: string) => Promise<void>;
  searchEntries: (query: string) => Promise<AddressBookEntry[]>;
  findByAddress: (walletAddress: string) => Promise<AddressBookEntry | null>;
  getDisplayName: (walletAddress: string) => Promise<string>;
  hasAddress: (walletAddress: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useAddressBook = (options: UseAddressBookOptions = {}): UseAddressBookReturn => {
  const { network = 'ethereum', safeAddress, autoRefresh = true } = options;
  
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [service, setService] = useState<AddressBookService | null>(null);
  
  const { success, error: showError } = useToast();

  // Initialize service
  useEffect(() => {
    const addressBookService = createAddressBookService(network);
    setService(addressBookService);

    return () => {
      addressBookService.cleanup();
    };
  }, [network]);

  // Set up provider and signer when wallet connection state changes
  useEffect(() => {
    if (!service) return;

    const updateProviderAndSigner = () => {
      const connectionState = walletConnectionService.getState();

      // Always try to set up a provider for read operations
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        if (connectionState.signerConnected) {
          // Initialize with both provider and signer
          const signer = provider.getSigner();
          service.initialize(provider, signer);
        } else {
          // Initialize with just provider for read-only operations
          service.initialize(provider);
        }
      }
    };

    updateProviderAndSigner();

    // Listen for connection state changes
    const unsubscribe = walletConnectionService.subscribe(updateProviderAndSigner);

    return unsubscribe;
  }, [service]);

  const loadEntries = useCallback(async () => {
    if (!service || !safeAddress) return;

    setLoading(true);
    setError(null);

    try {
      const addressBookEntries = await service.getEntries(safeAddress);
      setEntries(addressBookEntries);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load address book entries';
      setError(errorMessage);
      console.error('Error loading address book entries:', err);
    } finally {
      setLoading(false);
    }
  }, [service, safeAddress]);

  const setupEventListeners = useCallback(() => {
    if (!service || !safeAddress) return;

    service.setupEventListeners(safeAddress, () => {
      loadEntries();
    });
  }, [service, safeAddress, loadEntries]);

  // Load entries when safe address changes
  useEffect(() => {
    if (service && safeAddress) {
      loadEntries();

      if (autoRefresh) {
        setupEventListeners();
      }
    }
  }, [service, safeAddress, autoRefresh, loadEntries, setupEventListeners]);

  const addEntry = useCallback(async (walletAddress: string, name: string) => {
    if (!service || !safeAddress) {
      throw new Error('Service not initialized or Safe address not provided');
    }

    setLoading(true);
    setError(null);

    try {
      await service.addEntry(safeAddress, walletAddress, name);
      success('Address book entry added successfully');
      await loadEntries(); // Refresh the list
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to add address book entry';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, safeAddress, success, showError, loadEntries]);

  const removeEntry = useCallback(async (walletAddress: string) => {
    if (!service || !safeAddress) {
      throw new Error('Service not initialized or Safe address not provided');
    }

    setLoading(true);
    setError(null);

    try {
      await service.removeEntry(safeAddress, walletAddress);
      success('Address book entry removed successfully');
      await loadEntries(); // Refresh the list
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to remove address book entry';
      setError(errorMessage);
      showError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [service, safeAddress, success, showError, loadEntries]);

  const searchEntries = useCallback(async (query: string): Promise<AddressBookEntry[]> => {
    if (!service || !safeAddress) {
      return [];
    }

    try {
      return await service.searchEntries(safeAddress, query);
    } catch (err: any) {
      console.error('Error searching address book entries:', err);
      return [];
    }
  }, [service, safeAddress]);

  const findByAddress = useCallback(async (walletAddress: string): Promise<AddressBookEntry | null> => {
    if (!service || !safeAddress) {
      return null;
    }

    try {
      return await service.findByAddress(safeAddress, walletAddress);
    } catch (err: any) {
      console.error('Error finding address book entry:', err);
      return null;
    }
  }, [service, safeAddress]);

  const getDisplayName = useCallback(async (walletAddress: string): Promise<string> => {
    if (!service || !safeAddress) {
      // Return shortened address as fallback
      return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    }

    try {
      return await service.getDisplayName(safeAddress, walletAddress);
    } catch (err: any) {
      console.error('Error getting display name:', err);
      // Return shortened address as fallback
      return `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    }
  }, [service, safeAddress]);

  const hasAddress = useCallback(async (walletAddress: string): Promise<boolean> => {
    if (!service || !safeAddress) {
      return false;
    }

    try {
      return await service.hasAddress(safeAddress, walletAddress);
    } catch (err: any) {
      console.error('Error checking if address exists:', err);
      return false;
    }
  }, [service, safeAddress]);

  const refresh = useCallback(async () => {
    await loadEntries();
  }, [loadEntries]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    entries,
    loading,
    error,
    addEntry,
    removeEntry,
    searchEntries,
    findByAddress,
    getDisplayName,
    hasAddress,
    refresh,
    clearError
  };
};
