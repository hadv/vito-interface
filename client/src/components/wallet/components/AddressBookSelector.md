# AddressBookSelector Component

## Overview

The `AddressBookSelector` component provides an enhanced address input experience for transaction creation by allowing users to select recipients from their saved address book entries or manually enter addresses.

## Features

### 🎯 **Core Functionality**
- **Address Book Integration**: Select from saved address book entries
- **Search & Filter**: Real-time search through entries by name or address
- **Manual Input**: Fallback option for entering addresses manually
- **Validation**: Proper Ethereum address format validation

### 🎨 **User Experience**
- **Visual Feedback**: Shows selected entry name and address
- **Backdrop Dimming**: Focuses attention when dropdown is open
- **Keyboard Navigation**: Arrow keys, Enter, and Escape support
- **Responsive Design**: Adapts to content with proper scrolling

### ♿ **Accessibility**
- **Keyboard Navigation**: Full keyboard support for dropdown navigation
- **Focus Management**: Visual focus indicators for keyboard users
- **Screen Reader Support**: Proper ARIA labels and semantic HTML

## Usage

### Basic Usage

```tsx
import AddressBookSelector from './AddressBookSelector';

function TransactionForm() {
  const [recipientAddress, setRecipientAddress] = useState('');

  return (
    <AddressBookSelector
      value={recipientAddress}
      onChange={setRecipientAddress}
      placeholder="Select from address book or enter address..."
      network="ethereum"
      safeAddress="0x..."
    />
  );
}
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | - | Current selected address value |
| `onChange` | `(address: string) => void` | - | Callback when address changes |
| `placeholder` | `string` | "Select from address book..." | Placeholder text |
| `disabled` | `boolean` | `false` | Whether the selector is disabled |
| `network` | `string` | "ethereum" | Current network context |
| `safeAddress` | `string` | - | Safe wallet address for address book scope |
| `error` | `string` | - | Error message to display |

## Integration

### TransactionModal Integration

The component is already integrated into the `TransactionModal` component, replacing the simple address input field:

```tsx
<FormGroup>
  <Label>Recipient Address</Label>
  <AddressBookSelector
    value={toAddress}
    onChange={setToAddress}
    placeholder="Select from address book or enter address..."
    disabled={isLoading}
    network={connectionState.network || 'ethereum'}
    safeAddress={fromAddress}
  />
</FormGroup>
```

## User Interactions

### Dropdown Navigation
1. **Click** the selector button to open/close dropdown
2. **Search** by typing in the search input field
3. **Select** an entry by clicking on it
4. **Manual Input** in the bottom section for custom addresses

### Keyboard Navigation
- **Arrow Down/Up**: Navigate through address book entries
- **Enter**: Select the focused entry
- **Escape**: Close the dropdown
- **Tab**: Navigate between input fields

### States

#### Empty State
- Shows "No addresses in your address book" when no entries exist
- Provides manual input option as fallback

#### Loading State
- Shows "Loading address book..." while fetching data
- Maintains responsive interface during loading

#### Search Results
- Shows filtered entries based on search query
- Displays "No addresses found matching..." for empty search results

## Styling

The component uses styled-components with a dark theme that matches the existing application design:

- **Colors**: Blue accent (#3b82f6) for focus and selection states
- **Typography**: Consistent with existing form components
- **Spacing**: Follows the application's spacing scale
- **Animations**: Smooth transitions for state changes

## Dependencies

- `react`: Core React functionality
- `styled-components`: Component styling
- `useAddressBook`: Hook for address book data management
- `AddressDisplay`: Component for displaying formatted addresses
- `Input`: UI component for text inputs
- `isValidEthereumAddress`: Address validation utility

## Testing

A test component is available at `AddressBookSelectorTest.tsx` for manual testing:

```tsx
import AddressBookSelectorTest from './AddressBookSelectorTest';

// Use this component to test the selector functionality
```

## Performance Considerations

- **Debounced Search**: Search is performed on every keystroke but filtered locally
- **Memoized Filtering**: Entry filtering is optimized for large address books
- **Lazy Loading**: Address book data is loaded only when needed
- **Event Cleanup**: Proper cleanup of event listeners and effects

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Keyboard Navigation**: Full support across all browsers
- **Touch Devices**: Optimized for mobile and tablet interactions

## Future Enhancements

Potential improvements for future versions:

1. **Recent Addresses**: Show recently used addresses
2. **Address Labels**: Support for custom address labels
3. **Import/Export**: Address book import/export functionality
4. **ENS Support**: Ethereum Name Service resolution
5. **Address Validation**: Enhanced validation with network-specific checks
