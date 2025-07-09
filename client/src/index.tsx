// Import polyfills first, before any other imports
import './polyfills';
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Import WalletConnect patching test for debugging
import './tests/WalletConnectPatchingTest';

// WORKING SOLUTION: Global error handler to catch WalletConnect runtime errors
const originalConsoleError = console.error;

// Override console.error for console output
console.error = (...args: any[]) => {
  const errorString = args.join(' ');
  if (errorString.includes('No matching key') &&
      (errorString.includes('session') || errorString.includes('pairing'))) {
    console.warn('⚠️ WalletConnect session validation (non-critical):', ...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

// Global error handler to catch runtime errors before they reach React
window.addEventListener('error', (event) => {
  const errorMessage = event.error?.message || '';
  if (errorMessage.includes('No matching key') &&
      (errorMessage.includes('session') || errorMessage.includes('pairing'))) {
    console.warn('⚠️ WalletConnect runtime error suppressed:', errorMessage);
    event.preventDefault(); // Prevent the error from propagating
    return;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = event.reason?.message || '';
  if (errorMessage.includes('No matching key') &&
      (errorMessage.includes('session') || errorMessage.includes('pairing'))) {
    console.warn('⚠️ WalletConnect promise rejection suppressed:', errorMessage);
    event.preventDefault(); // Prevent the error from propagating
    return;
  }
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
