// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Initialize WalletConnect patch system before any WalletConnect code loads
import { initializeWalletConnectPatch } from './utils/walletConnectPatch';

// Global error handlers to prevent uncaught runtime errors
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);

  // Check if it's a WalletConnect-related error
  const errorMessage = event.reason?.message?.toLowerCase() || '';
  if (errorMessage.includes('pair') ||
      errorMessage.includes('walletconnect') ||
      errorMessage.includes('session') ||
      errorMessage.includes('no matching key')) {
    console.warn('WalletConnect error caught and handled:', event.reason);
    // Prevent the error from being thrown to the console
    event.preventDefault();
  }
});

window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);

  // Check if it's a WalletConnect-related error
  const errorMessage = event.error?.message?.toLowerCase() || '';
  if (errorMessage.includes('pair') ||
      errorMessage.includes('walletconnect') ||
      errorMessage.includes('session') ||
      errorMessage.includes('no matching key')) {
    console.warn('WalletConnect error caught and handled:', event.error);
    // Prevent the error from being thrown to the console
    event.preventDefault();
  }
});

// Patch console.error to catch and suppress WalletConnect "No matching key" errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.join(' ').toLowerCase();
  if (errorString.includes('no matching key') &&
      (errorString.includes('session') || errorString.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect "No matching key" error:', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

// Aggressive monkey patching of Error constructor to catch WalletConnect errors
const originalError = window.Error;
window.Error = function(message?: string) {
  if (message && message.toLowerCase().includes('no matching key')) {
    console.warn('🛡️ Intercepted WalletConnect "No matching key" error creation:', message);
    // Return a dummy error that won't cause issues
    const dummyError = new originalError('WalletConnect error suppressed');
    dummyError.name = 'SuppressedWalletConnectError';
    return dummyError;
  }
  return new originalError(message);
} as any;

// Preserve the original Error prototype (using Object.setPrototypeOf to avoid readonly error)
Object.setPrototypeOf(window.Error, originalError);
Object.defineProperty(window.Error, 'prototype', {
  value: originalError.prototype,
  writable: false,
  enumerable: false,
  configurable: false
});

// Patch throw statements by overriding the global error handler
const originalOnError = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  if (typeof message === 'string' && message.toLowerCase().includes('no matching key')) {
    console.warn('🛡️ Caught and suppressed WalletConnect error:', message);
    return true; // Prevent default error handling
  }
  if (originalOnError) {
    return originalOnError.call(this, message, source, lineno, colno, error);
  }
  return false;
};

// Initialize WalletConnect patch system
initializeWalletConnectPatch();

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
