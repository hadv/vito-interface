# Separated Transaction Workflows

This document explains the separated transaction workflows implemented to reduce user confusion between proposing and signing transactions.

## Overview

Previously, the transaction flow combined all steps (create → sign → propose) in a single continuous workflow, which could be confusing for users. Now, the workflows are separated into two distinct user journeys:

1. **Propose Transaction Workflow** - Create and propose transactions without signing
2. **Sign Transaction Workflow** - Sign existing pending transactions

## 1. Propose Transaction Workflow

### User Journey
1. User clicks "Send" button or opens transaction modal
2. User fills in transaction details (recipient, amount, etc.)
3. User clicks "Propose Transaction" button
4. Transaction is created and proposed to SafeTxPool **without signing**
5. User sees success message with transaction hash
6. Transaction appears in pending transactions list

### Technical Implementation
- **File**: `client/src/components/wallet/components/TransactionModal.tsx`
- **Method**: Uses `SafeWalletService.proposeTransactionOnly()`
- **Steps**:
  1. Create EIP-712 transaction data
  2. Propose to SafeTxPool contract (without signature)
  3. Show success confirmation

### Key Changes
- Removed automatic signing flow from TransactionModal
- Updated step indicator to show only 2 steps: "Fill Details" → "Propose to SafeTxPool"
- Changed button text from "Create EIP-712 Transaction" to "Propose Transaction"
- Removed EIP712SigningModal from the propose workflow

## 2. Sign Transaction Workflow

### User Journey
1. User navigates to Transactions page
2. User sees pending transactions with "Click to Sign" badges
3. User clicks on a pending transaction
4. PendingTransactionConfirmationModal opens
5. User reviews transaction details and signature progress
6. User clicks "Sign Transaction" button
7. EIP-712 signing modal appears in wallet
8. After signing, transaction is updated with new signature

### Technical Implementation
- **File**: `client/src/components/wallet/pages/TransactionsPage.tsx`
- **Modal**: `client/src/components/wallet/components/PendingTransactionConfirmationModal.tsx`
- **Method**: Uses `SafeWalletService.signExistingTransaction()`
- **Steps**:
  1. Load pending transaction details
  2. Show transaction review modal
  3. Request EIP-712 signature from user
  4. Submit signature to SafeTxPool

### Key Changes
- Added click handlers to pending transaction items
- Added visual indicators ("Click to Sign" badges) for unsigned transactions
- Updated modal title to "🔐 Sign Pending Transaction"
- Added hover effects to pending transaction items

## 3. New SafeWalletService Method

### `proposeTransactionOnly()`
```typescript
async proposeTransactionOnly(transactionRequest: TransactionRequest): Promise<{
  safeTransactionData: SafeTransactionData;
  domain: SafeDomain;
  txHash: string;
}>
```

This new method:
1. Creates EIP-712 transaction data using `createEIP712Transaction()`
2. Proposes transaction to SafeTxPool contract using `safeTxPoolService.proposeTx()`
3. Returns transaction data without requiring a signature

## 4. User Experience Improvements

### Visual Indicators
- Pending transactions show "Click to Sign" badges when signatures are needed
- Hover effects on clickable pending transactions
- Clear step indicators in transaction modal
- Updated button labels for clarity

### Workflow Separation Benefits
- **Less Confusion**: Users understand they're either proposing OR signing
- **Better Control**: Users can propose transactions and sign them later
- **Multi-signer Friendly**: Different users can propose and sign transactions
- **Clearer Intent**: Each action has a specific, clear purpose

## 5. Files Modified

### Core Transaction Components
- `client/src/components/wallet/components/TransactionModal.tsx` - Propose-only workflow
- `client/src/components/wallet/pages/TransactionsPage.tsx` - Click-to-sign functionality
- `client/src/components/wallet/components/PendingTransactionConfirmationModal.tsx` - Updated title

### Service Layer
- `client/src/services/SafeWalletService.ts` - Added `proposeTransactionOnly()` method

## 6. Usage Examples

### Proposing a Transaction
```typescript
// User fills form and clicks "Propose Transaction"
const result = await safeWalletService.proposeTransactionOnly({
  to: recipientAddress,
  value: ethers.utils.parseEther(amount).toString(),
  data: '0x',
  operation: 0
});
// Transaction is now pending in SafeTxPool
```

### Signing a Pending Transaction
```typescript
// User clicks on pending transaction in list
// Modal opens showing transaction details
// User clicks "Sign Transaction"
await safeWalletService.signExistingTransaction({
  txHash: pendingTx.txHash,
  to: pendingTx.to,
  value: pendingTx.value,
  data: pendingTx.data,
  operation: pendingTx.operation,
  nonce: pendingTx.nonce
});
// Signature is added to SafeTxPool
```

## 7. Future Enhancements

- Add batch signing for multiple pending transactions
- Implement transaction filtering (by signer, status, etc.)
- Add transaction cancellation from the signing interface
- Implement transaction execution workflow as a separate step
