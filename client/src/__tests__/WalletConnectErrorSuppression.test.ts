/**
 * Unit tests for WalletConnect Error Suppression Service
 */

import { WalletConnectErrorSuppression, walletConnectErrorSuppression } from '../services/WalletConnectErrorSuppression';

describe('WalletConnectErrorSuppression', () => {
  let errorSuppression: WalletConnectErrorSuppression;
  let originalConsoleError: typeof console.error;
  let originalWindowError: typeof window.onerror;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Get fresh instance for each test
    errorSuppression = WalletConnectErrorSuppression.getInstance();
    
    // Store original handlers
    originalConsoleError = console.error;
    originalWindowError = window.onerror;
    
    // Create spy for console.error
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Reset stats
    errorSuppression.resetStats();
    
    // Ensure suppression is deactivated before each test
    errorSuppression.deactivate();
  });

  afterEach(() => {
    // Restore original handlers
    console.error = originalConsoleError;
    window.onerror = originalWindowError;
    
    // Deactivate suppression
    errorSuppression.deactivate();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Error Pattern Detection', () => {
    test('should detect "No matching key" errors', () => {
      const testCases = [
        {
          message: 'No matching key. session or pairing topic doesn\'t exist: abc123',
          stack: 'at isValidSessionOrPairingTopic',
          shouldSuppress: true
        },
        {
          message: 'No matching key. session: def456',
          stack: 'at isValidDisconnect',
          shouldSuppress: true
        },
        {
          message: 'No matching key. pairing: ghi789',
          stack: 'at onSessionDeleteRequest',
          shouldSuppress: true
        },
        {
          message: 'session or pairing topic doesn\'t exist',
          stack: 'at processRequest',
          shouldSuppress: true
        },
        {
          message: 'Some other error message',
          stack: 'at someOtherFunction',
          shouldSuppress: false
        }
      ];

      testCases.forEach(({ message, stack, shouldSuppress }) => {
        const result = errorSuppression.shouldSuppressError({ message, stack });
        expect(result).toBe(shouldSuppress);
      });
    });

    test('should detect session/pairing topic validation errors', () => {
      const testCases = [
        {
          message: 'Session or pairing topic not found',
          stack: 'at SignClient',
          shouldSuppress: true
        },
        {
          message: 'Invalid session topic',
          stack: 'at WalletConnect',
          shouldSuppress: true
        },
        {
          message: 'Invalid pairing topic',
          stack: 'at SignClient',
          shouldSuppress: true
        }
      ];

      testCases.forEach(({ message, stack, shouldSuppress }) => {
        const result = errorSuppression.shouldSuppressError({ message, stack });
        expect(result).toBe(shouldSuppress);
      });
    });

    test('should detect store access errors', () => {
      const testCases = [
        {
          message: 'Cannot read properties of undefined (reading \'getData\')',
          stack: 'at WalletConnect',
          shouldSuppress: true
        },
        {
          message: 'Cannot read properties of undefined (reading \'get\')',
          stack: 'at SignClient',
          shouldSuppress: true
        }
      ];

      testCases.forEach(({ message, stack, shouldSuppress }) => {
        const result = errorSuppression.shouldSuppressError({ message, stack });
        expect(result).toBe(shouldSuppress);
      });
    });

    test('should not suppress non-WalletConnect errors', () => {
      const testCases = [
        {
          message: 'Network error',
          stack: 'at fetch',
          shouldSuppress: false
        },
        {
          message: 'User rejected transaction',
          stack: 'at MetaMask',
          shouldSuppress: false
        },
        {
          message: 'No matching key. session: abc123',
          stack: 'at someOtherLibrary', // Wrong stack pattern
          shouldSuppress: false
        }
      ];

      testCases.forEach(({ message, stack, shouldSuppress }) => {
        const result = errorSuppression.shouldSuppressError({ message, stack });
        expect(result).toBe(shouldSuppress);
      });
    });
  });

  describe('Console Error Suppression', () => {
    test('should suppress console.error for WalletConnect errors', () => {
      // Create a mock to track actual console.error calls
      const actualConsoleErrorCalls: any[][] = [];
      const mockOriginalConsoleError = jest.fn((...args: any[]) => {
        actualConsoleErrorCalls.push(args);
      });

      // Replace the original console.error in the suppression service
      (errorSuppression as any).originalConsoleError = mockOriginalConsoleError;

      errorSuppression.activate();

      // This should be suppressed
      console.error('No matching key. session or pairing topic doesn\'t exist: abc123');

      // This should not be suppressed
      console.error('Some other error');

      // Check that only the non-suppressed error was logged to original console.error
      expect(mockOriginalConsoleError).toHaveBeenCalledTimes(1);
      expect(mockOriginalConsoleError).toHaveBeenCalledWith('Some other error');

      // Check suppression stats
      const stats = errorSuppression.getStats();
      expect(stats.suppressedCount).toBe(1);
    });

    test('should track suppressed error count', () => {
      errorSuppression.activate();

      // Suppress multiple errors
      console.error('No matching key. session: abc123');
      console.error('No matching key. pairing: def456');
      console.error('session or pairing topic doesn\'t exist');

      const stats = errorSuppression.getStats();
      expect(stats.suppressedCount).toBe(3);
      expect(stats.isActive).toBe(true);
    });
  });

  describe('Window Error Handling', () => {
    test('should suppress window errors for WalletConnect', () => {
      errorSuppression.activate();

      const mockError = new Error('No matching key. session: abc123');
      mockError.stack = 'at isValidSessionOrPairingTopic';

      // Simulate window error
      const result = window.onerror?.('No matching key. session: abc123', 'test.js', 1, 1, mockError);

      expect(result).toBe(true); // Should prevent default handling
      
      const stats = errorSuppression.getStats();
      expect(stats.suppressedCount).toBe(1);
    });

    test('should not suppress non-WalletConnect window errors', () => {
      errorSuppression.activate();

      const mockError = new Error('Some other error');
      mockError.stack = 'at someOtherFunction';

      // Simulate window error
      const result = window.onerror?.('Some other error', 'test.js', 1, 1, mockError);

      expect(result).toBe(false); // Should allow default handling
      
      const stats = errorSuppression.getStats();
      expect(stats.suppressedCount).toBe(0);
    });
  });

  describe('Activation and Deactivation', () => {
    test('should activate and deactivate properly', () => {
      expect(errorSuppression.getStats().isActive).toBe(false);

      errorSuppression.activate();
      expect(errorSuppression.getStats().isActive).toBe(true);

      errorSuppression.deactivate();
      expect(errorSuppression.getStats().isActive).toBe(false);
    });

    test('should not activate multiple times', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      errorSuppression.activate();
      errorSuppression.activate(); // Second activation should be ignored

      // Should only log activation once
      expect(consoleSpy).toHaveBeenCalledWith('🔇 Activating WalletConnect error suppression...');
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Activation message + success message

      consoleSpy.mockRestore();
    });

    test('should restore original console.error after deactivation', () => {
      errorSuppression.activate();
      errorSuppression.deactivate();

      expect(console.error).toBe(originalConsoleError);
    });
  });

  describe('Custom Suppression Rules', () => {
    test('should allow adding custom suppression rules', () => {
      const customRule = {
        messagePatterns: ['Custom error pattern'],
        stackPatterns: ['CustomLibrary'],
        description: 'Custom test rule',
        severity: 'low' as const
      };

      errorSuppression.addSuppressionRule(customRule);

      const shouldSuppress = errorSuppression.shouldSuppressError({
        message: 'Custom error pattern occurred',
        stack: 'at CustomLibrary.function'
      });

      expect(shouldSuppress).toBe(true);
    });
  });

  describe('Statistics and Testing', () => {
    test('should provide accurate statistics', () => {
      const initialStats = errorSuppression.getStats();
      expect(initialStats.suppressedCount).toBe(0);
      expect(initialStats.isActive).toBe(false);
      expect(initialStats.rules).toBeGreaterThan(0);
    });

    test('should reset statistics', () => {
      // Mock the original console.error to avoid interference
      const mockOriginalConsoleError = jest.fn();
      (errorSuppression as any).originalConsoleError = mockOriginalConsoleError;

      errorSuppression.activate();
      console.error('No matching key. session: test');

      expect(errorSuppression.getStats().suppressedCount).toBe(1);

      errorSuppression.resetStats();
      expect(errorSuppression.getStats().suppressedCount).toBe(0);
    });

    test('should provide test method for error suppression', () => {
      const shouldSuppress1 = errorSuppression.testErrorSuppression(
        'No matching key. session: test',
        'at isValidSessionOrPairingTopic'
      );
      expect(shouldSuppress1).toBe(true);

      const shouldSuppress2 = errorSuppression.testErrorSuppression(
        'Some other error',
        'at someOtherFunction'
      );
      expect(shouldSuppress2).toBe(false);
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = WalletConnectErrorSuppression.getInstance();
      const instance2 = WalletConnectErrorSuppression.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(walletConnectErrorSuppression);
    });
  });
});
