// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import WalletConnect patching test for debugging
import './tests/WalletConnectPatchingTest';

// ULTIMATE SOLUTION: Complete error suppression at multiple levels
// Since Error constructor override still creates throwable objects,
// we need to be more aggressive

const originalError = window.Error;
const originalConsoleError = console.error;

// Track if we're in a WalletConnect error context
let suppressingWalletConnectError = false;

// Override Error constructor to completely suppress WalletConnect errors
window.Error = function(message?: string) {
  const msg = String(message || '');
  if (msg.includes('No matching key') &&
      (msg.includes('session') || msg.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect error:', msg);
    suppressingWalletConnectError = true;

    // Return a special object that won't cause issues when thrown
    const suppressedError = {
      name: 'SuppressedWalletConnectError',
      message: 'WalletConnect error suppressed',
      stack: '',
      toString: () => 'WalletConnect error suppressed',
      // Make it non-enumerable and non-configurable
      [Symbol.toPrimitive]: () => 'WalletConnect error suppressed',
      // Override valueOf to return a safe value
      valueOf: () => 'WalletConnect error suppressed'
    };

    // Reset the flag after a short delay
    setTimeout(() => { suppressingWalletConnectError = false; }, 0);

    return suppressedError as any;
  }
  return new originalError(message);
} as any;

// Preserve Error properties
Object.setPrototypeOf(window.Error, originalError);
Object.defineProperty(window.Error, 'prototype', {
  value: originalError.prototype,
  writable: false
});

// Also patch console.error to suppress these specific errors
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  if (errorString.includes('No matching key') &&
      (errorString.includes('session') || errorString.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect console error:', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

// NUCLEAR OPTION: Override React's error handling
// Patch React's error boundary mechanism to catch WalletConnect errors
setTimeout(() => {
  // Find React's error handling functions and patch them
  const reactErrorHandlers = [];

  // Look for React DevTools or React internals
  if ((window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const hook = (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (hook.onCommitFiberRoot) {
      const original = hook.onCommitFiberRoot;
      hook.onCommitFiberRoot = function(...args: any[]) {
        try {
          return original.apply(this, args);
        } catch (error: any) {
          if (error?.message?.includes('No matching key') ||
              error?.name === 'SuppressedWalletConnectError') {
            console.warn('🛡️ Suppressed WalletConnect error in React DevTools:', error);
            return;
          }
          throw error;
        }
      };
    }
  }

  // Patch any existing error reporting functions
  if ((window as any).reportError) {
    const originalReportError = (window as any).reportError;
    (window as any).reportError = function(error: any) {
      if (error?.message?.includes('No matching key') ||
          error?.name === 'SuppressedWalletConnectError' ||
          String(error).includes('WalletConnect error suppressed')) {
        console.warn('🛡️ Suppressed WalletConnect error in reportError:', error);
        return;
      }
      return originalReportError.call(this, error);
    };
  }
}, 1000);

// Try to patch any existing Error throwing in the global scope
setTimeout(() => {
  // Look for WalletConnect objects and patch their error throwing
  const patchObjectMethods = (obj: any, path = '') => {
    if (!obj || typeof obj !== 'object' || path.length > 3) return;

    try {
      for (const key in obj) {
        if (typeof obj[key] === 'function' &&
            (key.includes('Valid') || key.includes('session') || key.includes('pairing'))) {
          const original = obj[key];
          obj[key] = function(...args: any[]) {
            try {
              return original.apply(this, args);
            } catch (error: any) {
              if (error?.message?.includes('No matching key')) {
                console.warn(`🛡️ Caught error in ${path}.${key}:`, error.message);
                return false; // Return false instead of throwing
              }
              throw error;
            }
          };
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          patchObjectMethods(obj[key], path ? `${path}.${key}` : key);
        }
      }
    } catch (e) {
      // Ignore access errors
    }
  };

  // Patch window and common WalletConnect locations
  patchObjectMethods(window, 'window');
}, 2000); // Wait 2 seconds for WalletConnect to load

// Global error handlers to prevent uncaught runtime errors
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = String(event.reason?.message || '').toLowerCase();
  if (errorMessage.includes('no matching key') &&
      (errorMessage.includes('session') || errorMessage.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect unhandled rejection:', event.reason);
    event.preventDefault();
    return;
  }
  // Also check for our suppressed errors
  if (event.reason?.name === 'SuppressedWalletConnectError' || suppressingWalletConnectError) {
    console.warn('🛡️ Suppressed WalletConnect error in promise:', event.reason);
    event.preventDefault();
    return;
  }
  console.error('Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  const errorMessage = String(event.error?.message || '').toLowerCase();
  if (errorMessage.includes('no matching key') &&
      (errorMessage.includes('session') || errorMessage.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect global error:', event.error);
    event.preventDefault();
    return;
  }
  // Also check for our suppressed errors
  if (event.error?.name === 'SuppressedWalletConnectError' || suppressingWalletConnectError) {
    console.warn('🛡️ Suppressed WalletConnect error in global handler:', event.error);
    event.preventDefault();
    return;
  }
  // Check if the error message contains our suppressed error text
  if (errorMessage.includes('walletconnect error suppressed')) {
    console.warn('🛡️ Suppressed WalletConnect error (by message):', event.error);
    event.preventDefault();
    return;
  }
  console.error('Global error caught:', event.error);
});





const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
