/**
 * WalletConnect Error Suppression Service
 * 
 * This service handles the suppression of known WalletConnect v2 errors that occur
 * during session cleanup, particularly the "No matching key" errors that appear
 * when mobile wallets disconnect and WalletConnect's internal validation methods
 * fail to find already-deleted sessions.
 */

export interface WalletConnectError {
  message: string;
  stack?: string;
  code?: string | number;
  source?: string;
}

export interface ErrorSuppressionRule {
  messagePatterns: string[];
  stackPatterns?: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export class WalletConnectErrorSuppression {
  private static instance: WalletConnectErrorSuppression;
  private suppressionRules: ErrorSuppressionRule[] = [];
  private suppressedErrorCount = 0;
  private originalConsoleError: typeof console.error;
  private originalConsoleWarn: typeof console.warn;
  private originalWindowErrorHandler: OnErrorEventHandler = null;
  private isActive = false;

  private constructor() {
    this.originalConsoleError = console.error;
    this.originalConsoleWarn = console.warn;
    this.setupSuppressionRules();
  }

  public static getInstance(): WalletConnectErrorSuppression {
    if (!WalletConnectErrorSuppression.instance) {
      WalletConnectErrorSuppression.instance = new WalletConnectErrorSuppression();
    }
    return WalletConnectErrorSuppression.instance;
  }

  /**
   * Setup known WalletConnect error patterns that should be suppressed
   */
  private setupSuppressionRules(): void {
    this.suppressionRules = [
      {
        messagePatterns: [
          'no matching key',
          'session or pairing topic doesn\'t exist',
          'session topic doesn\'t exist',
          'pairing topic doesn\'t exist',
          'no matching key. session or pairing topic doesn\'t exist:',
          'no matching key. session:',
          'suppressed walletconnect error'
        ],
        description: 'WalletConnect session validation errors during cleanup',
        severity: 'low'
      },
      {
        messagePatterns: [
          'session or pairing topic not found',
          'invalid session topic',
          'invalid pairing topic'
        ],
        description: 'WalletConnect topic validation errors',
        severity: 'low'
      },
      {
        messagePatterns: [
          'cannot read properties of undefined (reading \'getdata\')',
          'cannot read properties of undefined (reading \'get\')'
        ],
        description: 'WalletConnect store access errors during cleanup',
        severity: 'low'
      }
    ];
  }

  /**
   * Check if an error should be suppressed based on the suppression rules
   */
  public shouldSuppressError(error: WalletConnectError): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';

    return this.suppressionRules.some(rule => {
      // Check message patterns
      const messageMatch = rule.messagePatterns.some(pattern =>
        errorMessage.includes(pattern.toLowerCase())
      );

      // If no stack patterns are defined, only check message
      if (!rule.stackPatterns || rule.stackPatterns.length === 0) {
        return messageMatch;
      }

      // Check stack patterns if provided
      const stackMatch = rule.stackPatterns.some(pattern =>
        errorStack.includes(pattern.toLowerCase())
      );

      return messageMatch && stackMatch;
    });
  }

  /**
   * Activate error suppression by overriding console.error and window.onerror
   */
  public activate(): void {
    if (this.isActive) {
      return;
    }

    console.log('🔇 Activating WalletConnect error suppression...');

    // Override console.error
    console.error = (...args: any[]) => {
      try {
        const errorMessage = args[0]?.toString() || '';
        const errorStack = args[1]?.stack || new Error().stack || '';

        const error: WalletConnectError = {
          message: errorMessage,
          stack: errorStack
        };

        if (this.shouldSuppressError(error)) {
          this.suppressedErrorCount++;
          // Log suppressed error in development for debugging
          if (process.env.NODE_ENV === 'development') {
            this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect error:', errorMessage);
          }
          return;
        }
      } catch (suppressionError) {
        // If suppression check fails, log the original error anyway
        this.originalConsoleError.call(console, 'Error in suppression check:', suppressionError);
      }

      // Call original console.error for non-suppressed errors
      this.originalConsoleError.apply(console, args);
    };

    // Override console.warn as well since some WalletConnect errors appear as warnings
    console.warn = (...args: any[]) => {
      try {
        const errorMessage = args[0]?.toString() || '';
        const error: WalletConnectError = {
          message: errorMessage,
          stack: ''
        };

        if (this.shouldSuppressError(error)) {
          this.suppressedErrorCount++;
          if (process.env.NODE_ENV === 'development') {
            this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect warning:', errorMessage);
          }
          return;
        }
      } catch (suppressionError) {
        this.originalConsoleWarn.call(console, 'Error in warning suppression check:', suppressionError);
      }

      this.originalConsoleWarn.apply(console, args);
    };



    // Override window.onerror
    this.originalWindowErrorHandler = window.onerror;
    window.onerror = (message: Event | string, source?: string, lineno?: number, colno?: number, error?: Error): boolean => {
      const wcError: WalletConnectError = {
        message: message?.toString() || '',
        stack: error?.stack || '',
        source: source || ''
      };

      if (this.shouldSuppressError(wcError)) {
        this.suppressedErrorCount++;
        // Log suppressed error in development for debugging
        if (process.env.NODE_ENV === 'development') {
          this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect window error:', message);
        }
        return true; // Prevent default error handling
      }

      // Call original error handler for non-suppressed errors
      if (this.originalWindowErrorHandler) {
        return this.originalWindowErrorHandler.call(window, message, source, lineno, colno, error) || false;
      }

      return false; // Allow default error handling
    };

    // Add unhandledrejection listener for Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error: WalletConnectError = {
        message: event.reason?.message || event.reason?.toString() || '',
        stack: event.reason?.stack || ''
      };

      if (this.shouldSuppressError(error)) {
        this.suppressedErrorCount++;
        // Log suppressed error in development for debugging
        if (process.env.NODE_ENV === 'development') {
          this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect promise rejection:', error.message);
        }
        event.preventDefault(); // Prevent unhandled rejection error
      }
    });

    // Add a global error event listener to catch all errors
    window.addEventListener('error', (event) => {
      const error: WalletConnectError = {
        message: event.message || event.error?.message || '',
        stack: event.error?.stack || '',
        source: event.filename || ''
      };

      if (this.shouldSuppressError(error)) {
        this.suppressedErrorCount++;
        if (process.env.NODE_ENV === 'development') {
          this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect global error:', error.message);
        }
        event.preventDefault(); // Prevent error from propagating
        event.stopPropagation();
        return false;
      }
    });

    // Patch WalletConnect methods that throw the errors directly
    this.patchWalletConnectMethods();

    this.isActive = true;
    console.log('✅ WalletConnect error suppression activated');
  }

  /**
   * Patch WalletConnect methods that throw errors directly
   */
  private patchWalletConnectMethods(): void {
    try {
      // Wait for WalletConnect to be available and patch its methods
      const patchInterval = setInterval(() => {
        // Try to find WalletConnect instances in the global scope
        const walletConnectInstances = this.findWalletConnectInstances();

        if (walletConnectInstances.length > 0) {
          clearInterval(patchInterval);
          walletConnectInstances.forEach(instance => this.patchInstance(instance));
          if (process.env.NODE_ENV === 'development') {
            this.originalConsoleError.call(console, '🔧 Patched WalletConnect methods for error suppression');
          }
        }
      }, 100);

      // Stop trying after 10 seconds
      setTimeout(() => clearInterval(patchInterval), 10000);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        this.originalConsoleError.call(console, 'Failed to patch WalletConnect methods:', error);
      }
    }
  }

  /**
   * Find WalletConnect instances in the global scope
   */
  private findWalletConnectInstances(): any[] {
    const instances: any[] = [];

    try {
      // Check for WalletConnect in window object
      if ((window as any).walletConnect) {
        instances.push((window as any).walletConnect);
      }

      // Check for SignClient instances
      if ((window as any).signClient) {
        instances.push((window as any).signClient);
      }

      // Look for WalletConnect instances in common locations
      const checkObject = (obj: any, path: string = '') => {
        if (!obj || typeof obj !== 'object') return;

        for (const key in obj) {
          try {
            const value = obj[key];
            if (value && typeof value === 'object') {
              // Check if this looks like a WalletConnect instance
              if (value.isValidSessionOrPairingTopic || value.isValidDisconnect) {
                instances.push(value);
              }
              // Recursively check nested objects (but limit depth)
              if (path.split('.').length < 3) {
                checkObject(value, path ? `${path}.${key}` : key);
              }
            }
          } catch (e) {
            // Ignore errors accessing properties
          }
        }
      };

      checkObject(window);
    } catch (error) {
      // Ignore errors in instance discovery
    }

    return instances;
  }

  /**
   * Patch a WalletConnect instance to suppress errors
   */
  private patchInstance(instance: any): void {
    try {
      // Patch isValidSessionOrPairingTopic method
      if (instance.isValidSessionOrPairingTopic && typeof instance.isValidSessionOrPairingTopic === 'function') {
        const originalMethod = instance.isValidSessionOrPairingTopic.bind(instance);
        instance.isValidSessionOrPairingTopic = (...args: any[]) => {
          try {
            return originalMethod(...args);
          } catch (error: any) {
            if (this.shouldSuppressError({ message: error.message || '', stack: error.stack || '' })) {
              this.suppressedErrorCount++;
              if (process.env.NODE_ENV === 'development') {
                this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect isValidSessionOrPairingTopic error:', error.message);
              }
              return false; // Return false instead of throwing
            }
            throw error; // Re-throw non-WalletConnect errors
          }
        };
      }

      // Patch isValidDisconnect method
      if (instance.isValidDisconnect && typeof instance.isValidDisconnect === 'function') {
        const originalMethod = instance.isValidDisconnect.bind(instance);
        instance.isValidDisconnect = (...args: any[]) => {
          try {
            return originalMethod(...args);
          } catch (error: any) {
            if (this.shouldSuppressError({ message: error.message || '', stack: error.stack || '' })) {
              this.suppressedErrorCount++;
              if (process.env.NODE_ENV === 'development') {
                this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect isValidDisconnect error:', error.message);
              }
              return false; // Return false instead of throwing
            }
            throw error; // Re-throw non-WalletConnect errors
          }
        };
      }

      // Patch getData method (for store access errors)
      if (instance.getData && typeof instance.getData === 'function') {
        const originalMethod = instance.getData.bind(instance);
        instance.getData = (...args: any[]) => {
          try {
            return originalMethod(...args);
          } catch (error: any) {
            if (this.shouldSuppressError({ message: error.message || '', stack: error.stack || '' })) {
              this.suppressedErrorCount++;
              if (process.env.NODE_ENV === 'development') {
                this.originalConsoleError.call(console, '🔇 Suppressed WalletConnect getData error:', error.message);
              }
              return null; // Return null instead of throwing
            }
            throw error; // Re-throw non-WalletConnect errors
          }
        };
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        this.originalConsoleError.call(console, 'Failed to patch WalletConnect instance:', error);
      }
    }
  }

  /**
   * Deactivate error suppression and restore original handlers
   */
  public deactivate(): void {
    if (!this.isActive) {
      return;
    }

    console.log('🔊 Deactivating WalletConnect error suppression...');

    // Restore original console methods
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    // Restore original window.onerror
    window.onerror = this.originalWindowErrorHandler;



    this.isActive = false;
    console.log(`✅ WalletConnect error suppression deactivated. Suppressed ${this.suppressedErrorCount} errors.`);
  }

  /**
   * Get statistics about suppressed errors
   */
  public getStats(): { suppressedCount: number; isActive: boolean; rules: number } {
    return {
      suppressedCount: this.suppressedErrorCount,
      isActive: this.isActive,
      rules: this.suppressionRules.length
    };
  }

  /**
   * Reset suppressed error count
   */
  public resetStats(): void {
    this.suppressedErrorCount = 0;
  }

  /**
   * Add a custom suppression rule
   */
  public addSuppressionRule(rule: ErrorSuppressionRule): void {
    this.suppressionRules.push(rule);
  }

  /**
   * Test if a specific error would be suppressed (for testing purposes)
   */
  public testErrorSuppression(message: string, stack?: string): boolean {
    return this.shouldSuppressError({ message, stack });
  }
}

// Export singleton instance
export const walletConnectErrorSuppression = WalletConnectErrorSuppression.getInstance();
