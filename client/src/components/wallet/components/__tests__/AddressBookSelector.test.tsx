import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddressBookSelector from '../AddressBookSelector';

// Mock the useAddressBook hook
jest.mock('../../../../hooks/useAddressBook', () => ({
  useAddressBook: () => ({
    entries: [
      {
        name: 'Alice',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1',
      },
      {
        name: 'Bob',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b2',
      },
      {
        name: 'Charlie',
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b3',
      },
    ],
    loading: false,
  }),
}));

// Mock AddressDisplay component
jest.mock('../AddressDisplay', () => {
  return function MockAddressDisplay({ address }: { address: string }) {
    return <span data-testid="address-display">{address.slice(0, 6)}...{address.slice(-4)}</span>;
  };
});

// Mock Input component
jest.mock('../../../ui/Input', () => {
  return function MockInput(props: any) {
    return <input data-testid="mock-input" {...props} />;
  };
});

describe('AddressBookSelector', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    placeholder: 'Select address',
    network: 'ethereum',
    safeAddress: '0x1234567890123456789012345678901234567890',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with placeholder text', () => {
    render(<AddressBookSelector {...defaultProps} />);
    expect(screen.getByText('Select address')).toBeInTheDocument();
  });

  it('opens dropdown when clicked', async () => {
    render(<AddressBookSelector {...defaultProps} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      expect(screen.getByText('Address Book')).toBeInTheDocument();
    });
  });

  it('displays address book entries in dropdown', async () => {
    render(<AddressBookSelector {...defaultProps} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('calls onChange when an entry is selected', async () => {
    const mockOnChange = jest.fn();
    render(<AddressBookSelector {...defaultProps} onChange={mockOnChange} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      const aliceEntry = screen.getByText('Alice');
      fireEvent.click(aliceEntry);
    });

    expect(mockOnChange).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1');
  });

  it('filters entries based on search query', async () => {
    render(<AddressBookSelector {...defaultProps} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search address book...');
      fireEvent.change(searchInput, { target: { value: 'Alice' } });
    });

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });
  });

  it('shows manual input section', async () => {
    render(<AddressBookSelector {...defaultProps} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      expect(screen.getByText('Or enter address manually')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0x...')).toBeInTheDocument();
    });
  });

  it('handles manual address input', async () => {
    const mockOnChange = jest.fn();
    render(<AddressBookSelector {...defaultProps} onChange={mockOnChange} />);
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      const manualInput = screen.getByPlaceholderText('0x...');
      fireEvent.change(manualInput, { 
        target: { value: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9' } 
      });
    });

    expect(mockOnChange).toHaveBeenCalledWith('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9');
  });

  it('displays selected entry information', () => {
    render(
      <AddressBookSelector 
        {...defaultProps} 
        value="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b1" 
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByTestId('address-display')).toBeInTheDocument();
  });

  it('shows manual address when value is not in address book', () => {
    render(
      <AddressBookSelector 
        {...defaultProps} 
        value="0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9" 
      />
    );

    expect(screen.getByText('Manual Address')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <AddressBookSelector {...defaultProps} />
        <div data-testid="outside">Outside</div>
      </div>
    );
    
    const selectorButton = screen.getByRole('button');
    fireEvent.click(selectorButton);

    await waitFor(() => {
      expect(screen.getByText('Address Book')).toBeInTheDocument();
    });

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByText('Address Book')).not.toBeInTheDocument();
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(<AddressBookSelector {...defaultProps} disabled={true} />);
    
    const selectorButton = screen.getByRole('button');
    expect(selectorButton).toBeDisabled();
  });
});
