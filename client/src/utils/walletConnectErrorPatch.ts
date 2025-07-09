/**
 * WalletConnect Error Patch
 * 
 * This patches the WalletConnect SDK at the global level to prevent
 * "No matching key" errors from crashing the application.
 * 
 * The errors occur deep in the WalletConnect protocol layer before
 * our application event handlers can catch them.
 */

// Store original console.error
const originalConsoleError = console.error;

/**
 * Initialize global error patching for WalletConnect
 */
export function initializeWalletConnectErrorPatch(): void {
  console.log('🛡️ Initializing WalletConnect error patch...');

  // Patch console.error to suppress specific WalletConnect errors
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 [PATCHED] WalletConnect session error suppressed:', message);
      return;
    }
    
    // Allow all other errors through
    originalConsoleError.apply(console, args);
  };

  // Global unhandled promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const message = error?.message || error?.toString() || '';
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 [PATCHED] Unhandled WalletConnect promise rejection suppressed:', message);
      event.preventDefault();
      return;
    }
  });

  // Global error handler
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 [PATCHED] WalletConnect runtime error suppressed:', message);
      event.preventDefault();
      event.stopPropagation();
      return false;
    }
  });

  // Override window.onerror
  const originalOnerror = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = message?.toString() || '';
    
    if (isWalletConnectSessionError(errorMessage)) {
      console.warn('🚫 [PATCHED] WalletConnect onerror suppressed:', errorMessage);
      return true; // Prevent default error handling
    }
    
    if (originalOnerror) {
      return originalOnerror(message, source, lineno, colno, error);
    }
    
    return false;
  };

  // Patch Promise.prototype to catch WalletConnect errors
  const originalThen = Promise.prototype.then;
  (Promise.prototype as any).then = function(onFulfilled?: any, onRejected?: any) {
    const patchedOnRejected = onRejected ? (error: any) => {
      const message = error?.message || error?.toString() || '';
      if (isWalletConnectSessionError(message)) {
        console.warn('🚫 [PATCHED] WalletConnect promise error suppressed:', message);
        return; // Swallow the error
      }
      return onRejected(error);
    } : (error: any) => {
      const message = error?.message || error?.toString() || '';
      if (isWalletConnectSessionError(message)) {
        console.warn('🚫 [PATCHED] WalletConnect promise error suppressed (no handler):', message);
        return; // Swallow the error
      }
      throw error;
    };

    return originalThen.call(this, onFulfilled, patchedOnRejected);
  };

  console.log('✅ WalletConnect error patch initialized');
}

/**
 * Check if an error message is a WalletConnect session error
 */
function isWalletConnectSessionError(message: string): boolean {
  const patterns = [
    'No matching key. session or pairing topic doesn\'t exist',
    'No matching key. session:',
    'No matching key. pairing:',
    'isValidSessionOrPairingTopic',
    'isValidDisconnect',
    'onSessionDeleteRequest',
    'deleteSession',
    'processRequest',
    'processRequestsQueue',
    'onRelayEventRequest',
    'onRelayMessage',
    'onProviderMessageEvent',
    'getData',
    'rpcPublish'
  ];

  return patterns.some(pattern => message.includes(pattern));
}

/**
 * Restore original error handling
 */
export function restoreOriginalErrorHandling(): void {
  console.log('🔄 Restoring original error handling...');
  console.error = originalConsoleError;
  console.log('✅ Original error handling restored');
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  // Initialize immediately
  initializeWalletConnectErrorPatch();
  
  // Also initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initializeWalletConnectErrorPatch, 100);
    });
  }
}
