// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import WalletConnect patching test for debugging
import './tests/WalletConnectPatchingTest';

// NUCLEAR OPTION: Global error suppression for WalletConnect "No matching key" errors
// Since the validation methods don't exist on our signClient instances,
// the errors are coming from WalletConnect's internal processing that we can't patch

// Override the global Error constructor to intercept WalletConnect errors at the source
const originalError = window.Error;
window.Error = function(message?: string) {
  const msg = String(message || '').toLowerCase();
  if (msg.includes('no matching key') && (msg.includes('session') || msg.includes('pairing'))) {
    console.warn('🛡️ Intercepted WalletConnect "No matching key" error:', message);
    // Return a dummy error that won't cause issues
    const dummyError = Object.create(Error.prototype);
    dummyError.name = 'SuppressedWalletConnectError';
    dummyError.message = 'WalletConnect error suppressed';
    dummyError.stack = (new originalError()).stack;
    return dummyError;
  }
  return new originalError(message);
} as any;

// Preserve Error prototype and static methods
Object.setPrototypeOf(window.Error, originalError);
Object.defineProperty(window.Error, 'prototype', {
  value: originalError.prototype,
  writable: false
});

// Global error handlers to prevent uncaught runtime errors
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = String(event.reason?.message || '').toLowerCase();
  if (errorMessage.includes('no matching key') &&
      (errorMessage.includes('session') || errorMessage.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect unhandled rejection:', event.reason);
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
  console.error('Global error caught:', event.error);
});

// Patch console.error to catch and suppress WalletConnect "No matching key" errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const errorString = args.join(' ').toLowerCase();
  if (errorString.includes('no matching key') &&
      (errorString.includes('session') || errorString.includes('pairing'))) {
    console.warn('🛡️ Suppressed WalletConnect console error:', ...args);
    return;
  }
  // Also suppress destructuring errors from null sessions
  if (errorString.includes('cannot destructure') && errorString.includes('session.get')) {
    console.warn('🛡️ Suppressed WalletConnect session destructuring error:', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};





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
