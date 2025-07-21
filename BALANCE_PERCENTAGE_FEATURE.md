# Balance Display and Percentage Buttons Feature

## Overview
Enhanced the TransactionModal component to include balance display and percentage buttons (25%, 50%, 75%, MAX) for sending native ETH and ERC20 tokens, following modern dApp/wallet UI/UX patterns.

## Features Implemented

### 1. Balance Display
- **Current Balance**: Shows available balance for the selected asset
- **Visual Design**: Modern gradient background with blur effect
- **Typography**: Monospace font for balance amounts for better readability
- **Real-time Updates**: Balance updates when different assets are selected

### 2. Percentage Buttons
- **25%, 50%, 75%**: Calculate percentage of available balance
- **MAX Button**: Special handling for maximum amount
  - **Native ETH**: Subtracts estimated gas fees (0.001 ETH) to prevent failed transactions
  - **ERC20 Tokens**: Uses full available balance
- **Visual Feedback**: Hover animations, gradient effects, and smooth transitions
- **Accessibility**: Proper disabled states and cursor feedback

### 3. Enhanced Validation
- **Balance Checking**: Prevents sending more than available balance
- **Gas Fee Awareness**: Warns users when trying to send too much ETH (leaving no room for gas)
- **User-Friendly Messages**: Clear error messages with emojis for better UX
- **Real-time Validation**: Immediate feedback as users type or click percentage buttons

## UI/UX Design

### Modern dApp Styling
- **Gradient Backgrounds**: Subtle blue gradients for balance container
- **Glass Morphism**: Backdrop blur effects for modern appearance
- **Smooth Animations**: Hover effects with cubic-bezier transitions
- **Grid Layout**: Responsive button layout that works on all screen sizes
- **Visual Hierarchy**: Clear distinction between regular and MAX buttons

### Color Scheme
- **Primary**: Blue gradient (#007bff to #0056b3) for MAX button
- **Secondary**: Semi-transparent white overlays for percentage buttons
- **Text**: High contrast white text with subtle gray labels
- **Borders**: Semi-transparent borders with hover state changes

## Code Structure

### New Styled Components
- `BalanceContainer`: Displays current balance with modern styling
- `BalanceLabel` & `BalanceAmount`: Typography components for balance display
- `PercentageButtonsContainer`: Grid layout for percentage buttons
- `PercentageButton`: Base button component with hover animations
- `MaxButton`: Enhanced button extending PercentageButton with special styling

### New Functions
- `handlePercentageClick(percentage: number)`: Calculates and sets amount based on percentage
  - Handles MAX button logic differently for native vs ERC20 tokens
  - Formats amounts to 6 decimal places
  - Removes trailing zeros for clean display

### Enhanced Validation
- Balance checking before transaction submission
- Gas fee awareness for native ETH transactions
- Improved error messages with visual indicators

## Usage Example

```typescript
// When user clicks 25% button:
// If balance is 1.0 ETH, amount becomes "0.25"

// When user clicks MAX button:
// For ETH: If balance is 1.0 ETH, amount becomes "0.999" (leaving 0.001 for gas)
// For ERC20: If balance is 100 USDC, amount becomes "100"
```

## Benefits

1. **Better UX**: Users can quickly select common amounts without manual calculation
2. **Error Prevention**: Built-in validation prevents common mistakes
3. **Modern Design**: Follows current dApp design trends and best practices
4. **Accessibility**: Clear visual feedback and proper disabled states
5. **Mobile Friendly**: Responsive grid layout works on all devices

## Technical Implementation

- **Framework**: React with styled-components
- **State Management**: React hooks for amount and validation
- **Animations**: CSS transitions with cubic-bezier easing
- **Responsive**: CSS Grid for button layout
- **Type Safety**: Full TypeScript support with proper typing

This implementation brings the Vito interface in line with modern wallet and dApp standards, providing users with the familiar and intuitive experience they expect from professional crypto applications.
