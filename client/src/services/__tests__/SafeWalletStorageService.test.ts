/**
 * Tests for SafeWalletStorageService
 */

import { SafeWalletStorageService, RecentSafeWallet } from '../SafeWalletStorageService';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SafeWalletStorageService', () => {
  let service: SafeWalletStorageService;

  beforeEach(() => {
    localStorageMock.clear();
    service = SafeWalletStorageService.getInstance();
  });

  describe('addRecentWallet', () => {
    it('should add a new wallet to recent list', () => {
      const wallet = {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        name: 'Test Wallet'
      };

      service.addRecentWallet(wallet);
      const recentWallets = service.getRecentWallets();

      expect(recentWallets).toHaveLength(1);
      expect(recentWallets[0]).toMatchObject(wallet);
      expect(recentWallets[0].lastConnected).toBeDefined();
    });

    it('should update existing wallet instead of duplicating', () => {
      const wallet = {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        name: 'Test Wallet'
      };

      service.addRecentWallet(wallet);
      service.addRecentWallet({ ...wallet, name: 'Updated Wallet' });

      const recentWallets = service.getRecentWallets();
      expect(recentWallets).toHaveLength(1);
      expect(recentWallets[0].name).toBe('Updated Wallet');
    });

    it('should maintain order by last connected (most recent first)', () => {
      const wallet1 = {
        address: '0x1111111111111111111111111111111111111111',
        network: 'ethereum',
        name: 'Wallet 1'
      };

      const wallet2 = {
        address: '0x2222222222222222222222222222222222222222',
        network: 'ethereum',
        name: 'Wallet 2'
      };

      service.addRecentWallet(wallet1);
      // Add a small delay to ensure different timestamps
      setTimeout(() => {
        service.addRecentWallet(wallet2);
        
        const recentWallets = service.getRecentWallets();
        expect(recentWallets[0].name).toBe('Wallet 2'); // Most recent first
        expect(recentWallets[1].name).toBe('Wallet 1');
      }, 10);
    });
  });

  describe('removeRecentWallet', () => {
    it('should remove wallet from recent list', () => {
      const wallet = {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        name: 'Test Wallet'
      };

      service.addRecentWallet(wallet);
      expect(service.getRecentWallets()).toHaveLength(1);

      service.removeRecentWallet(wallet.address, wallet.network);
      expect(service.getRecentWallets()).toHaveLength(0);
    });

    it('should be case insensitive for address matching', () => {
      const wallet = {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        name: 'Test Wallet'
      };

      service.addRecentWallet(wallet);
      service.removeRecentWallet(wallet.address.toUpperCase(), wallet.network);
      expect(service.getRecentWallets()).toHaveLength(0);
    });
  });

  describe('getRecentWallet', () => {
    it('should return specific wallet if exists', () => {
      const wallet = {
        address: '0x1234567890123456789012345678901234567890',
        network: 'ethereum',
        name: 'Test Wallet'
      };

      service.addRecentWallet(wallet);
      const found = service.getRecentWallet(wallet.address, wallet.network);

      expect(found).toBeTruthy();
      expect(found?.name).toBe(wallet.name);
    });

    it('should return null if wallet does not exist', () => {
      const found = service.getRecentWallet('0x1111111111111111111111111111111111111111', 'ethereum');
      expect(found).toBeNull();
    });
  });

  describe('clearRecentWallets', () => {
    it('should clear all recent wallets', () => {
      const wallet1 = {
        address: '0x1111111111111111111111111111111111111111',
        network: 'ethereum',
        name: 'Wallet 1'
      };

      const wallet2 = {
        address: '0x2222222222222222222222222222222222222222',
        network: 'sepolia',
        name: 'Wallet 2'
      };

      service.addRecentWallet(wallet1);
      service.addRecentWallet(wallet2);
      expect(service.getRecentWallets()).toHaveLength(2);

      service.clearRecentWallets();
      expect(service.getRecentWallets()).toHaveLength(0);
    });
  });

  describe('getMostRecentWallet', () => {
    it('should return the most recently connected wallet', () => {
      const wallet1 = {
        address: '0x1111111111111111111111111111111111111111',
        network: 'ethereum',
        name: 'Wallet 1'
      };

      const wallet2 = {
        address: '0x2222222222222222222222222222222222222222',
        network: 'ethereum',
        name: 'Wallet 2'
      };

      service.addRecentWallet(wallet1);
      service.addRecentWallet(wallet2);

      const mostRecent = service.getMostRecentWallet();
      expect(mostRecent?.name).toBe('Wallet 2');
    });

    it('should return null if no wallets exist', () => {
      const mostRecent = service.getMostRecentWallet();
      expect(mostRecent).toBeNull();
    });
  });
});
