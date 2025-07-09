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
      errorMessage.includes('session')) {
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
      errorMessage.includes('session')) {
    console.warn('WalletConnect error caught and handled:', event.error);
    // Prevent the error from being thrown to the console
    event.preventDefault();
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
