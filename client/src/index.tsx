// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

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
  // Also suppress destructuring errors from null sessions
  if (errorString.includes('cannot destructure') && errorString.includes('session.get')) {
    console.warn('🛡️ Suppressed WalletConnect session destructuring error:', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

// NUCLEAR OPTION: Patch Error constructor to prevent WalletConnect errors from being thrown
const originalError = Error;
(window as any).Error = function(message?: string) {
  if (message && message.includes('No matching key') &&
      (message.includes('session') || message.includes('pairing'))) {
    console.warn('🛡️ Intercepted WalletConnect error creation:', message);
    // Return a non-throwing dummy error
    const dummyError = {
      name: 'SuppressedWalletConnectError',
      message: 'WalletConnect error suppressed',
      stack: new originalError().stack
    };
    return dummyError as Error;
  }
  return new originalError(message);
};

// Preserve Error prototype and static methods
Object.setPrototypeOf((window as any).Error, originalError);
Object.defineProperty((window as any).Error, 'prototype', {
  value: originalError.prototype,
  writable: false
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
