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
  private originalWindowErrorHandler: OnErrorEventHandler = null;
  private isActive = false;

  private constructor() {
    this.originalConsoleError = console.error;
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
          'pairing topic doesn\'t exist'
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
          console.debug('🔇 Suppressed WalletConnect promise rejection:', error.message);
        }
        event.preventDefault(); // Prevent unhandled rejection error
      }
    });

    this.isActive = true;
    console.log('✅ WalletConnect error suppression activated');
  }

  /**
   * Deactivate error suppression and restore original handlers
   */
  public deactivate(): void {
    if (!this.isActive) {
      return;
    }

    console.log('🔊 Deactivating WalletConnect error suppression...');

    // Restore original console.error
    console.error = this.originalConsoleError;

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
