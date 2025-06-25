// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfills for WalletConnect and other Web APIs in Jest environment
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder polyfills for WalletConnect
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock crypto.getRandomValues for WalletConnect
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      digest: jest.fn().mockResolvedValue(new ArrayBuffer(32)),
    },
  },
});

// Mock WebSocket for WalletConnect
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
})) as any;

// Mock WalletConnect modules to avoid complex dependency issues in tests
jest.mock('@walletconnect/sign-client', () => ({
  SignClient: {
    init: jest.fn().mockResolvedValue({
      connect: jest.fn().mockResolvedValue({
        uri: 'wc:test-uri',
        approval: jest.fn().mockResolvedValue({
          topic: 'test-topic',
          namespaces: {
            eip155: {
              accounts: ['eip155:1:0x1234567890123456789012345678901234567890'],
              chains: ['eip155:1']
            }
          }
        })
      }),
      session: {
        get: jest.fn().mockReturnValue({
          expiry: Date.now() / 1000 + 3600 // 1 hour from now
        })
      },
      disconnect: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      request: jest.fn().mockResolvedValue('0x1234567890abcdef')
    })
  }
}));

jest.mock('qrcode', () => ({
  toCanvas: jest.fn().mockResolvedValue(undefined)
}));

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock clipboard API for copy functionality tests
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
    readText: jest.fn().mockImplementation(() => Promise.resolve('')),
  },
});

// Mock console methods to reduce noise in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('componentWillReceiveProps') ||
       args[0].includes('componentWillUpdate'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
