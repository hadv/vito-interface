/**
 * Browser Polyfills for Node.js modules
 * 
 * This file provides polyfills for Node.js globals and modules
 * that are required by Web3Auth and other crypto libraries.
 */

import { Buffer } from 'buffer';

// Make Buffer available globally
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).Buffer = Buffer;
  (window as any).process = require('process/browser');
}

// Export for explicit imports
export { Buffer };
