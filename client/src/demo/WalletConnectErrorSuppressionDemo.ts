/**
 * Demonstration script for WalletConnect Error Suppression
 * This shows how the error suppression works in practice
 */

import { walletConnectErrorSuppression } from '../services/WalletConnectErrorSuppression';
import { ErrorHandler } from '../utils/errorHandling';

export class WalletConnectErrorSuppressionDemo {
  private originalConsoleError: typeof console.error;
  private capturedErrors: string[] = [];

  constructor() {
    this.originalConsoleError = console.error;
  }

  /**
   * Demonstrate the error suppression functionality
   */
  public runDemo(): void {
    console.log('🚀 Starting WalletConnect Error Suppression Demo...\n');

    // Step 1: Show errors without suppression
    this.demonstrateWithoutSuppression();

    // Step 2: Show errors with suppression
    this.demonstrateWithSuppression();

    // Step 3: Show statistics
    this.showStatistics();

    // Step 4: Cleanup
    this.cleanup();

    console.log('✅ Demo completed successfully!');
  }

  private demonstrateWithoutSuppression(): void {
    console.log('📋 Step 1: Errors WITHOUT suppression');
    console.log('=====================================');

    // Capture console.error calls
    this.capturedErrors = [];
    console.error = (...args: any[]) => {
      this.capturedErrors.push(args.join(' '));
      this.originalConsoleError.apply(console, args);
    };

    // Simulate WalletConnect errors
    console.error('No matching key. session or pairing topic doesn\'t exist: abc123');
    console.error('No matching key. session: def456');
    console.error('Normal application error');

    console.log(`📊 Captured ${this.capturedErrors.length} errors:`);
    this.capturedErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');

    // Restore console.error
    console.error = this.originalConsoleError;
  }

  private demonstrateWithSuppression(): void {
    console.log('🔇 Step 2: Errors WITH suppression');
    console.log('==================================');

    // Initialize error suppression
    ErrorHandler.initializeWalletConnectErrorSuppression();

    // Capture console.error calls
    this.capturedErrors = [];
    const mockOriginalConsoleError = (...args: any[]) => {
      this.capturedErrors.push(args.join(' '));
      this.originalConsoleError.apply(console, args);
    };

    // Replace the original console.error in the suppression service
    (walletConnectErrorSuppression as any).originalConsoleError = mockOriginalConsoleError;

    // Simulate the same WalletConnect errors
    console.error('No matching key. session or pairing topic doesn\'t exist: abc123');
    console.error('No matching key. session: def456');
    console.error('Normal application error');

    console.log(`📊 Captured ${this.capturedErrors.length} errors (after suppression):`);
    this.capturedErrors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`);
    });
    console.log('');
  }

  private showStatistics(): void {
    console.log('📈 Step 3: Suppression Statistics');
    console.log('=================================');

    const stats = walletConnectErrorSuppression.getStats();
    console.log(`🔢 Total errors suppressed: ${stats.suppressedCount}`);
    console.log(`🔄 Suppression active: ${stats.isActive}`);
    console.log(`📋 Suppression rules: ${stats.rules}`);
    console.log('');
  }

  private cleanup(): void {
    console.log('🧹 Step 4: Cleanup');
    console.log('==================');

    ErrorHandler.cleanupWalletConnectErrorSuppression();
    console.error = this.originalConsoleError;
    console.log('✅ Cleanup completed');
    console.log('');
  }

  /**
   * Test specific error patterns
   */
  public testErrorPatterns(): void {
    console.log('🧪 Testing Error Pattern Detection...\n');

    const testCases = [
      {
        message: 'No matching key. session or pairing topic doesn\'t exist: abc123',
        expected: true,
        description: 'WalletConnect session validation error'
      },
      {
        message: 'No matching key. session: def456',
        expected: true,
        description: 'WalletConnect session key error'
      },
      {
        message: 'Invalid session topic',
        expected: true,
        description: 'WalletConnect topic validation error'
      },
      {
        message: 'User rejected transaction',
        expected: false,
        description: 'Normal wallet error (should not be suppressed)'
      },
      {
        message: 'Network connection failed',
        expected: false,
        description: 'Network error (should not be suppressed)'
      }
    ];

    testCases.forEach((testCase, index) => {
      const result = walletConnectErrorSuppression.testErrorSuppression(testCase.message);
      const status = result === testCase.expected ? '✅' : '❌';
      
      console.log(`${status} Test ${index + 1}: ${testCase.description}`);
      console.log(`   Message: "${testCase.message}"`);
      console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
      console.log('');
    });
  }

  /**
   * Demonstrate error classification
   */
  public demonstrateErrorClassification(): void {
    console.log('🏷️  Error Classification Demo...\n');

    const testErrors = [
      new Error('No matching key. session or pairing topic doesn\'t exist: abc123'),
      new Error('User rejected transaction'),
      new Error('Network timeout')
    ];

    testErrors.forEach((error, index) => {
      const classification = ErrorHandler.classifyError(error);
      
      console.log(`📋 Error ${index + 1}:`);
      console.log(`   Message: "${error.message}"`);
      console.log(`   Code: ${classification.code}`);
      console.log(`   Category: ${classification.category}`);
      console.log(`   Severity: ${classification.severity}`);
      console.log(`   User Message: "${classification.userMessage}"`);
      console.log(`   Recoverable: ${classification.recoverable}`);
      console.log('');
    });
  }
}

// Export a function to run the demo
export function runWalletConnectErrorSuppressionDemo(): void {
  const demo = new WalletConnectErrorSuppressionDemo();
  
  console.log('🎯 WalletConnect Error Suppression - Complete Demo');
  console.log('==================================================\n');
  
  demo.runDemo();
  demo.testErrorPatterns();
  demo.demonstrateErrorClassification();
  
  console.log('🎉 All demonstrations completed successfully!');
}

// For direct execution in development
if (process.env.NODE_ENV === 'development') {
  // Uncomment the line below to run the demo
  // runWalletConnectErrorSuppressionDemo();
}
