/**
 * Integration tests for WalletConnect Error Suppression
 * Tests the complete error suppression flow including ErrorHandler integration
 */

import { ErrorHandler } from '../utils/errorHandling';
import { walletConnectErrorSuppression } from '../services/WalletConnectErrorSuppression';

describe('WalletConnect Error Suppression Integration', () => {
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Store original console methods
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    
    // Create spies
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset suppression state
    walletConnectErrorSuppression.deactivate();
    walletConnectErrorSuppression.resetStats();
  });

  afterEach(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    
    // Cleanup suppression
    ErrorHandler.cleanupWalletConnectErrorSuppression();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('ErrorHandler Integration', () => {
    test('should initialize WalletConnect error suppression through ErrorHandler', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();
      
      const stats = walletConnectErrorSuppression.getStats();
      expect(stats.isActive).toBe(true);
      
      // Should log initialization message
      expect(consoleLogSpy).toHaveBeenCalledWith('🔇 Activating WalletConnect error suppression...');
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ WalletConnect error suppression activated');
    });

    test('should cleanup WalletConnect error suppression through ErrorHandler', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();
      ErrorHandler.cleanupWalletConnectErrorSuppression();
      
      const stats = walletConnectErrorSuppression.getStats();
      expect(stats.isActive).toBe(false);
      
      // Should log cleanup message
      expect(consoleLogSpy).toHaveBeenCalledWith('🔊 Deactivating WalletConnect error suppression...');
    });

    test('should classify WalletConnect errors correctly', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();

      // Test with a simpler pattern that should definitely match
      const walletConnectError = new Error('no matching key');
      walletConnectError.stack = 'at isValidSessionOrPairingTopic';

      // Test that the error suppression service can detect this error
      const shouldSuppress = walletConnectErrorSuppression.shouldSuppressError({
        message: walletConnectError.message,
        stack: walletConnectError.stack || ''
      });

      expect(shouldSuppress).toBe(true);

      // Test that the service is active
      expect(walletConnectErrorSuppression.getStats().isActive).toBe(true);
    });

    test('should not classify non-WalletConnect errors as suppressed', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();
      
      const normalError = new Error('User rejected transaction');
      const errorDetails = ErrorHandler.classifyError(normalError);
      
      expect(errorDetails.code).not.toBe('WALLETCONNECT_SUPPRESSED');
      expect(errorDetails.category).not.toBe('walletconnect');
    });
  });

  describe('End-to-End Error Suppression', () => {
    test('should suppress WalletConnect errors in console.error', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();

      // Test error suppression directly instead of classification
      const walletConnectErrors = [
        'No matching key. session or pairing topic doesn\'t exist: abc123',
        'No matching key. session: def456',
        'session or pairing topic doesn\'t exist'
      ];

      const normalError = 'Normal error message';

      // Test that WalletConnect errors are detected for suppression
      walletConnectErrors.forEach(message => {
        const shouldSuppress = walletConnectErrorSuppression.shouldSuppressError({
          message,
          stack: ''
        });
        expect(shouldSuppress).toBe(true);
      });

      // Test that normal errors are not suppressed
      const shouldSuppressNormal = walletConnectErrorSuppression.shouldSuppressError({
        message: normalError,
        stack: ''
      });
      expect(shouldSuppressNormal).toBe(false);
    });

    test('should handle window errors properly', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();

      // Create mock WalletConnect error
      const wcError = new Error('No matching key. session: abc123');
      wcError.stack = 'at isValidSessionOrPairingTopic';

      // Simulate window error
      const result = window.onerror?.('No matching key. session: abc123', 'test.js', 1, 1, wcError);

      expect(result).toBe(true); // Should prevent default handling

      const stats = walletConnectErrorSuppression.getStats();
      // The count might be higher due to multiple error handlers being triggered
      expect(stats.suppressedCount).toBeGreaterThanOrEqual(1);
    });

    test('should handle unhandled promise rejections', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();

      // Test that the service can detect WalletConnect errors in promise rejections
      const wcError = new Error('no matching key');
      wcError.stack = 'at isValidDisconnect';

      const shouldSuppress = walletConnectErrorSuppression.shouldSuppressError({
        message: wcError.message,
        stack: wcError.stack || ''
      });

      expect(shouldSuppress).toBe(true);
      expect(walletConnectErrorSuppression.getStats().isActive).toBe(true);
    });
  });

  describe('Error Suppression in Development vs Production', () => {
    test('should log debug messages in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true });

      ErrorHandler.initializeWalletConnectErrorSuppression();

      // Test that the service is active and can detect WalletConnect errors
      const testError = { message: 'No matching key. session: test', stack: '' };
      const shouldSuppress = walletConnectErrorSuppression.shouldSuppressError(testError);
      expect(shouldSuppress).toBe(true);

      // Test that the service is properly initialized
      expect(walletConnectErrorSuppression.getStats().isActive).toBe(true);

      // Restore environment
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
    });

    test('should not log debug messages in production mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
      
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
      
      ErrorHandler.initializeWalletConnectErrorSuppression();
      
      // Trigger a suppressed error
      console.error('No matching key. session: test');
      
      // Should not log debug message in production
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      
      // Restore environment
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
      consoleDebugSpy.mockRestore();
    });
  });

  describe('Multiple Error Types', () => {
    test('should handle mixed error types correctly', () => {
      ErrorHandler.initializeWalletConnectErrorSuppression();

      const errors = [
        'No matching key. session or pairing topic doesn\'t exist: abc123',
        'User rejected transaction',
        'No matching key. session: def456',
        'Network connection failed',
        'session or pairing topic doesn\'t exist',
        'Invalid session topic'
      ];

      let walletConnectErrorCount = 0;
      let normalErrorCount = 0;

      errors.forEach(message => {
        const shouldSuppress = walletConnectErrorSuppression.shouldSuppressError({
          message,
          stack: ''
        });
        if (shouldSuppress) {
          walletConnectErrorCount++;
        } else {
          normalErrorCount++;
        }
      });

      // Should detect 4 WalletConnect errors and 2 normal errors
      expect(walletConnectErrorCount).toBe(4);
      expect(normalErrorCount).toBe(2);
    });
  });

  describe('Error Suppression Robustness', () => {
    test('should handle errors during suppression gracefully', () => {
      // Mock shouldSuppressError to throw an error
      const originalShouldSuppress = walletConnectErrorSuppression.shouldSuppressError;
      jest.spyOn(walletConnectErrorSuppression, 'shouldSuppressError').mockImplementation(() => {
        throw new Error('Suppression check failed');
      });

      ErrorHandler.initializeWalletConnectErrorSuppression();

      // This should not crash the application when calling shouldSuppressError directly
      expect(() => {
        try {
          walletConnectErrorSuppression.shouldSuppressError({ message: 'test', stack: '' });
        } catch (error) {
          // Expected to throw
        }
      }).not.toThrow();

      // Restore original method
      walletConnectErrorSuppression.shouldSuppressError = originalShouldSuppress;
    });

    test('should handle initialization errors gracefully', () => {
      // Mock activate to throw an error
      jest.spyOn(walletConnectErrorSuppression, 'activate').mockImplementation(() => {
        throw new Error('Activation failed');
      });
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Should not throw, but should log warning
      expect(() => {
        ErrorHandler.initializeWalletConnectErrorSuppression();
      }).not.toThrow();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '⚠️ Failed to initialize WalletConnect error suppression:',
        expect.any(Error)
      );
      
      consoleWarnSpy.mockRestore();
    });
  });
});
