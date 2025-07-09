// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import WalletConnect patching test for debugging
import './tests/WalletConnectPatchingTest';

// NUCLEAR OPTION: Runtime patching of WalletConnect internal methods
// Since the validation methods don't exist on our signClient instances initially,
// we need to patch them at runtime when they become available

// Function to patch WalletConnect methods when they become available
function patchWalletConnectMethods() {
  // Look for WalletConnect instances in the global scope
  const checkAndPatch = () => {
    // Check for any objects that might contain WalletConnect methods
    const potentialWCObjects = [];

    // Search through window properties for WalletConnect-related objects
    for (const key in window) {
      try {
        const obj = (window as any)[key];
        if (obj && typeof obj === 'object' &&
            (obj.constructor?.name?.includes('WalletConnect') ||
             obj.constructor?.name?.includes('SignClient') ||
             (obj.isValidSessionOrPairingTopic && typeof obj.isValidSessionOrPairingTopic === 'function'))) {
          potentialWCObjects.push(obj);
        }
      } catch (e) {
        // Ignore access errors
      }
    }

    // Patch any found objects
    potentialWCObjects.forEach(obj => {
      if (obj.isValidSessionOrPairingTopic && !obj.__patched) {
        const original = obj.isValidSessionOrPairingTopic;
        obj.isValidSessionOrPairingTopic = function(topic: string) {
          try {
            return original.call(this, topic);
          } catch (error) {
            console.warn('🛡️ WalletConnect isValidSessionOrPairingTopic failed, returning false:', topic);
            return false;
          }
        };
        obj.__patched = true;
        console.log('✅ Patched WalletConnect isValidSessionOrPairingTopic');
      }

      if (obj.isValidDisconnect && !obj.__patchedDisconnect) {
        const original = obj.isValidDisconnect;
        obj.isValidDisconnect = function(params: any) {
          try {
            return original.call(this, params);
          } catch (error) {
            console.warn('🛡️ WalletConnect isValidDisconnect failed, returning false:', params);
            return false;
          }
        };
        obj.__patchedDisconnect = true;
        console.log('✅ Patched WalletConnect isValidDisconnect');
      }
    });
  };

  // Check immediately and then periodically
  checkAndPatch();
  setInterval(checkAndPatch, 1000);
}

// Start patching process
patchWalletConnectMethods();

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
