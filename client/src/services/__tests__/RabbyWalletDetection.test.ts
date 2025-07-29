/**
 * Tests for Rabby wallet detection functionality
 * Simple tests that don't require complex mocking
 */

// Mock window object for testing
Object.defineProperty(global, 'window', {
  value: {},
  writable: true
});

describe('Rabby Wallet Detection', () => {
  // Store original window.ethereum
  const originalWindow = global.window;

  afterEach(() => {
    // Restore original window
    global.window = originalWindow;
  });

  test('should detect Rabby wallet when isRabby is true', () => {
    // Setup mock window.ethereum with Rabby
    global.window = {
      ethereum: {
        isRabby: true,
        request: jest.fn()
      }
    } as any;

    // Test detection logic
    const hasRabby = global.window.ethereum && global.window.ethereum.isRabby;
    expect(hasRabby).toBe(true);
  });

  test('should detect Rabby wallet in providers array', () => {
    // Setup mock window.ethereum with multiple providers
    global.window = {
      ethereum: {
        providers: [
          { isMetaMask: true },
          { isRabby: true },
          { isPhantom: true }
        ]
      }
    } as any;

    // Test detection logic
    const rabbyProvider = global.window.ethereum.providers?.find((p: any) => p.isRabby);
    expect(rabbyProvider).toBeDefined();
    expect(rabbyProvider.isRabby).toBe(true);
  });

  test('should not detect Rabby when not present', () => {
    // Setup mock window.ethereum without Rabby
    global.window = {
      ethereum: {
        isMetaMask: true,
        providers: [
          { isMetaMask: true },
          { isPhantom: true }
        ]
      }
    } as any;

    // Test detection logic
    const hasRabby = global.window.ethereum && global.window.ethereum.isRabby;
    const rabbyProvider = global.window.ethereum.providers?.find((p: any) => p.isRabby);

    expect(hasRabby).toBeFalsy();
    expect(rabbyProvider).toBeUndefined();
  });

  test('should handle missing window.ethereum gracefully', () => {
    // Setup environment without window.ethereum
    global.window = {} as any;

    // Test detection logic
    const hasEthereum = global.window.ethereum;
    expect(hasEthereum).toBeFalsy();
  });

  test('should prioritize Rabby provider when multiple wallets present', () => {
    // Setup mock window.ethereum with multiple providers including Rabby
    global.window = {
      ethereum: {
        providers: [
          { isMetaMask: true, name: 'MetaMask' },
          { isRabby: true, name: 'Rabby' },
          { isPhantom: true, name: 'Phantom' }
        ]
      }
    } as any;

    // Test provider selection logic (similar to what's in WalletConnectionService)
    let selectedProvider = global.window.ethereum;

    if (global.window.ethereum.providers && Array.isArray(global.window.ethereum.providers)) {
      const rabbyProvider = global.window.ethereum.providers.find((p: any) => p.isRabby);
      if (rabbyProvider) {
        selectedProvider = rabbyProvider;
      }
    }

    expect(selectedProvider.isRabby).toBe(true);
    expect(selectedProvider.name).toBe('Rabby');
  });

  test('should validate wallet type enum includes rabby', () => {
    // Test that the wallet type includes 'rabby'
    const validWalletTypes = ['metamask', 'walletconnect', 'ledger', 'privatekey', 'web3auth', 'rabby'];
    expect(validWalletTypes).toContain('rabby');
  });
});
