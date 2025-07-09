// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import WalletConnect patching test for debugging
import './tests/WalletConnectPatchingTest';

// SIMPLE SOLUTION: Just log WalletConnect errors as warnings instead of errors
const originalConsoleError = console.error;

// Simple console.error override to show WalletConnect errors as warnings
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  if (errorString.includes('No matching key') &&
      (errorString.includes('session') || errorString.includes('pairing'))) {
    console.warn('⚠️ WalletConnect session validation (non-critical):', ...args);
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
