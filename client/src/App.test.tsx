import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the WalletPage component to avoid module resolution issues
jest.mock('./components/wallet/WalletPage', () => {
  return function MockWalletPage() {
    return <div data-testid="wallet-page">Wallet Page</div>;
  };
});

// Mock the Header component to avoid WalletConnectionService dependency
jest.mock('./components/ui/Header', () => {
  return function MockHeader() {
    return (
      <header>
        <h1>Vito</h1>
      </header>
    );
  };
});

// Mock other dependencies

jest.mock('./utils', () => ({
  resolveAddressToEns: jest.fn(),
  isValidEthereumAddress: jest.fn()
}));

// Mock Web3Auth config to avoid cryptographic issues in test environment
jest.mock('./config/web3auth', () => ({
  WEB3AUTH_CLIENT_ID: 'test-client-id',
  WEB3AUTH_NETWORK_TYPE: 'testnet',
  getChainConfigByNetwork: jest.fn(() => ({
    chainNamespace: 'eip155',
    chainId: '0xaa36a7',
    rpcTarget: 'https://test-rpc.com',
    displayName: 'Test Network',
    blockExplorer: 'https://test-explorer.com',
    ticker: 'ETH',
    tickerName: 'Ethereum'
  })),
  SUPPORTED_CHAINS: {}
}));

// Mock Web3Auth service to avoid cryptographic issues in test environment
jest.mock('./services/Web3AuthService', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    getState: jest.fn(() => ({ isInitialized: false, isConnected: false })),
    subscribe: jest.fn(() => jest.fn()),
    connectWithGoogle: jest.fn(),
    disconnect: jest.fn(),
    isConfigured: jest.fn(() => false)
  }))
}));

// Mock WalletConnectionService to avoid Web3Auth dependency
jest.mock('./services/WalletConnectionService', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(() => ({ isConnected: false })),
    subscribe: jest.fn(() => jest.fn()),
    connectSignerWallet: jest.fn(),
    connectWeb3AuthSigner: jest.fn(),
    disconnect: jest.fn()
  }
}));

jest.mock('./components/ui', () => ({
  Button: ({ children, variant, size, fullWidth, rightIcon, leftIcon, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Input: ({
    label,
    placeholder,
    value,
    onChange,
    error,
    variant,
    inputSize,
    fullWidth,
    leftIcon,
    rightIcon,
    ...props
  }: any) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  ),
  Card: ({ children, variant, padding, ...props }: any) => (
    <div {...props}>{children}</div>
  )
}));



test('renders app component', () => {
  render(<App />);
  // App should render the RecentSafeWalletsPage when no wallet is connected
  // Should show the header with Vito branding
  expect(screen.getByText('Vito')).toBeInTheDocument();
  // Should show the recent wallets page title
  expect(screen.getByText('Your Safe Wallets')).toBeInTheDocument();
  // Should show the subtitle
  expect(screen.getByText('Connect to a recent Safe wallet or add a new one')).toBeInTheDocument();
  // Should show the "Add Safe Wallet" button since no recent wallets exist
  expect(screen.getByText('Add Safe Wallet')).toBeInTheDocument();
});
