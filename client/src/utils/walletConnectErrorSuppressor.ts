/**
 * WalletConnect Error Suppressor
 * 
 * This utility monkey patches the WalletConnect SDK to suppress specific errors
 * that cause runtime crashes when disconnecting from signer wallets.
 * 
 * The errors occur deep in the WalletConnect protocol layer and cannot be
 * caught by normal error handling in our application code.
 */

// Store original console.error to restore later if needed
const originalConsoleError = console.error;

// Store original window.addEventListener to intercept unhandled errors
const originalAddEventListener = window.addEventListener;

/**
 * Initialize error suppression for WalletConnect
 */
export function initializeWalletConnectErrorSuppression(): void {
  console.log('🛡️ Initializing WalletConnect error suppression...');

  // Suppress specific WalletConnect errors in console
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Check if this is a WalletConnect session error we want to suppress
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 Suppressed WalletConnect session error:', message);
      return;
    }
    
    // Allow all other errors through
    originalConsoleError.apply(console, args);
  };

  // Intercept unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const message = error?.message || error?.toString() || '';
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 Suppressed unhandled WalletConnect promise rejection:', message);
      event.preventDefault(); // Prevent the error from being thrown
      return;
    }
  });

  // Intercept general errors
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    const stack = event.error?.stack || '';

    if (isWalletConnectSessionError(message) || isWalletConnectSessionError(stack)) {
      console.warn('🚫 Suppressed WalletConnect runtime error:', message);
      event.preventDefault(); // Prevent the error from being thrown
      event.stopPropagation(); // Stop event propagation
      return false;
    }
  });

  // Add a more aggressive global error handler
  const originalOnerror = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = message?.toString() || '';
    const errorStack = error?.stack || '';

    if (isWalletConnectSessionError(errorMessage) || isWalletConnectSessionError(errorStack)) {
      console.warn('🚫 Suppressed WalletConnect error via onerror:', errorMessage);
      return true; // Prevent default error handling
    }

    // Call original handler for non-WalletConnect errors
    if (originalOnerror) {
      return originalOnerror(message, source, lineno, colno, error);
    }

    return false;
  };

  // Monkey patch Promise.prototype.catch to intercept WalletConnect errors
  const originalCatch = Promise.prototype.catch;
  Promise.prototype.catch = function(onRejected?: ((reason: any) => any) | null) {
    return originalCatch.call(this, (error: any) => {
      const message = error?.message || error?.toString() || '';
      
      if (isWalletConnectSessionError(message)) {
        console.warn('🚫 Suppressed WalletConnect promise error:', message);
        return; // Swallow the error
      }
      
      // Call original rejection handler for non-WalletConnect errors
      if (onRejected) {
        return onRejected(error);
      }
      
      throw error; // Re-throw if no handler
    });
  };

  console.log('✅ WalletConnect error suppression initialized');
}

/**
 * Check if an error message is a WalletConnect session error that should be suppressed
 */
function isWalletConnectSessionError(message: string): boolean {
  const walletConnectErrorPatterns = [
    'No matching key. session or pairing topic doesn\'t exist',
    'No matching key. session:',
    'No matching key. pairing:',
    'isValidSessionOrPairingTopic',
    'isValidDisconnect',
    'onSessionDeleteRequest',
    'deleteSession',
    'WalletConnect session not found',
    'Session topic doesn\'t exist',
    'Pairing topic doesn\'t exist'
  ];

  return walletConnectErrorPatterns.some(pattern => 
    message.includes(pattern)
  );
}

/**
 * Restore original error handling (for testing or debugging)
 */
export function restoreOriginalErrorHandling(): void {
  console.log('🔄 Restoring original error handling...');
  console.error = originalConsoleError;
  
  // Note: We can't easily restore the original Promise.prototype.catch
  // without more complex tracking, but this is mainly for development use
  
  console.log('✅ Original error handling restored');
}

/**
 * Advanced error suppression using try-catch wrapper
 */
export function suppressWalletConnectErrors<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch (error: any) {
    const message = error?.message || error?.toString() || '';
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 Suppressed WalletConnect error in function call:', message);
      return undefined;
    }
    
    throw error; // Re-throw non-WalletConnect errors
  }
}

/**
 * Async version of error suppression wrapper
 */
export async function suppressWalletConnectErrorsAsync<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error: any) {
    const message = error?.message || error?.toString() || '';
    
    if (isWalletConnectSessionError(message)) {
      console.warn('🚫 Suppressed WalletConnect error in async function call:', message);
      return undefined;
    }
    
    throw error; // Re-throw non-WalletConnect errors
  }
}

/**
 * Patch WalletConnect SDK methods directly to prevent errors
 */
export function patchWalletConnectSDK(): void {
  console.log('🔧 Patching WalletConnect SDK methods...');

  // Wait for WalletConnect to be available
  const checkAndPatch = () => {
    try {
      // Try to access WalletConnect classes from the global scope or modules
      const walletConnectModules = [
        (window as any).WalletConnect,
        (window as any).SignClient,
        // Check if modules are available in the bundle
      ];

      // Patch any available WalletConnect objects
      walletConnectModules.forEach(module => {
        if (module && typeof module === 'object') {
          patchWalletConnectObject(module);
        }
      });

      // Also try to patch prototype methods if available
      if (typeof (window as any).SignClient !== 'undefined') {
        patchSignClientPrototype();
      }

    } catch (error) {
      console.warn('Could not patch WalletConnect SDK:', error);
    }
  };

  // Try patching immediately and after a delay
  checkAndPatch();
  setTimeout(checkAndPatch, 500);
  setTimeout(checkAndPatch, 2000);
}

function patchWalletConnectObject(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  // Patch common methods that might throw session errors
  const methodsToPatch = [
    'disconnect',
    'deleteSession',
    'isValidSessionOrPairingTopic',
    'isValidDisconnect',
    'onSessionDeleteRequest',
    'processRequest',
    'get',
    'getData'
  ];

  methodsToPatch.forEach(methodName => {
    if (typeof obj[methodName] === 'function') {
      const originalMethod = obj[methodName];
      obj[methodName] = function(...args: any[]) {
        try {
          return originalMethod.apply(this, args);
        } catch (error: any) {
          const message = error?.message || error?.toString() || '';
          if (isWalletConnectSessionError(message)) {
            console.warn(`🚫 Suppressed error in ${methodName}:`, message);
            return null; // Return null instead of throwing
          }
          throw error; // Re-throw non-WalletConnect errors
        }
      };
    }
  });
}

function patchSignClientPrototype(): void {
  try {
    const SignClient = (window as any).SignClient;
    if (SignClient && SignClient.prototype) {
      // Patch disconnect method specifically
      if (typeof SignClient.prototype.disconnect === 'function') {
        const originalDisconnect = SignClient.prototype.disconnect;
        SignClient.prototype.disconnect = async function(...args: any[]) {
          try {
            return await originalDisconnect.apply(this, args);
          } catch (error: any) {
            const message = error?.message || error?.toString() || '';
            if (isWalletConnectSessionError(message)) {
              console.warn('🚫 Suppressed error in SignClient.disconnect:', message);
              return; // Swallow the error
            }
            throw error;
          }
        };
      }
    }
  } catch (error) {
    console.warn('Could not patch SignClient prototype:', error);
  }
}

// Auto-initialize when this module is imported
if (typeof window !== 'undefined') {
  // Initialize error suppression immediately
  initializeWalletConnectErrorSuppression();

  // Patch WalletConnect SDK
  patchWalletConnectSDK();

  // Also patch after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(patchWalletConnectSDK, 100);
    });
  } else {
    setTimeout(patchWalletConnectSDK, 100);
  }
}
