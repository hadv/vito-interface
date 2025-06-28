import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock the WalletPage component to avoid module resolution issues
jest.mock('./components/wallet/WalletPage', () => {
  return function MockWalletPage() {
    return <div data-testid="wallet-page">Wallet Page</div>;
  };
});

// Mock other dependencies

jest.mock('./utils', () => ({
  resolveAddressToEns: jest.fn(),
  isValidEthereumAddress: jest.fn()
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

import App from './App';

test('renders app component', () => {
  render(<App />);
  // App should render the AddSafeAccountPage when no wallet is connected
  // Should show the header with Vito branding
  expect(screen.getByText('Vito')).toBeInTheDocument();
  // Should show the main page title
  expect(screen.getByText('Add existing Safe Account')).toBeInTheDocument();
});
