# Delegate Call Safe Transaction Fix

## 🐛 Problem Identified

The application was experiencing a critical error when trying to enable/disable delegate calls:

```
Error: cannot estimate gas; transaction may fail or may require manual gas limit 
[ See: https://links.ethers.org/v5-errors-UNPREDICTABLE_GAS_LIMIT ] 
(reason="execution reverted", method="estimateGas", transaction={...}, 
error={"code":3,"data":"0xf4d51644","message":"execution reverted"}, 
code=UNPREDICTABLE_GAS_LIMIT, version=providers/5.7.2)
```

### Root Cause Analysis

The error code `0xf4d51644` corresponds to the `NotSafeWallet()` error in the SafeTxPool contract. The issue was in the contract's access control:

```solidity
function setDelegateCallEnabled(address safe, bool enabled) external {
    // Only the Safe wallet itself can modify its delegate call settings
    if (msg.sender != safe) revert NotSafeWallet();
    
    delegateCallEnabled[safe] = enabled;
    emit DelegateCallToggled(safe, enabled);
}
```

**The Problem**: The application was calling the SafeTxPool contract directly from the user's wallet, but the contract requires that `msg.sender` must be the Safe wallet address itself.

**The Solution**: The call needs to be executed **through** the Safe wallet, not directly from the user's wallet.

## 🛠️ Solution Implementation

### 1. **SafeTxPoolService Changes** (`client/src/services/SafeTxPoolService.ts`)

Modified delegate call methods to return Safe transaction parameters instead of executing directly:

```typescript
// BEFORE: Direct contract call
async setDelegateCallEnabled(safe: string, enabled: boolean): Promise<ethers.ContractTransaction> {
  const tx = await this.contract.setDelegateCallEnabled(safe, enabled);
  return tx;
}

// AFTER: Safe transaction parameters
async setDelegateCallEnabled(safe: string, enabled: boolean): Promise<ProposeTransactionParams> {
  const data = this.contract.interface.encodeFunctionData('setDelegateCallEnabled', [safe, enabled]);
  
  return {
    safe: safe,
    to: this.contract.address,
    value: '0',
    data: data,
    operation: 0, // Call operation
    nonce: 0 // Will be set by the calling service
  };
}
```

### 2. **UI Component Changes** (`client/src/components/wallet/components/DelegateCallControlSection.tsx`)

Updated the component to use Safe transactions:

```typescript
// BEFORE: Direct contract call
await safeTxPoolService.setDelegateCallEnabled(connectionState.safeAddress, newState);

// AFTER: Safe transaction flow
const txParams = await safeTxPoolService.setDelegateCallEnabled(connectionState.safeAddress, newState);

const transactionRequest = {
  to: txParams.to,
  value: txParams.value,
  data: txParams.data,
  operation: txParams.operation
};

await safeWalletService.createTransaction(transactionRequest);
```

### 3. **Transaction Flow**

The new flow ensures proper execution:

1. **Create Transaction Parameters**: SafeTxPoolService encodes the function call
2. **Create Safe Transaction**: SafeWalletService creates an EIP-712 transaction
3. **Sign Transaction**: User signs the transaction with their wallet
4. **Execute Through Safe**: The transaction is executed with the Safe as `msg.sender`

## 📋 Files Modified

### **Modified Files**
- `client/src/services/SafeTxPoolService.ts` - Updated delegate call methods (3 functions)
- `client/src/components/wallet/components/DelegateCallControlSection.tsx` - Updated UI handlers (3 functions)

### **Functions Updated**
- `setDelegateCallEnabled()` - Enable/disable delegate calls
- `addDelegateCallTarget()` - Add allowed delegate call target
- `removeDelegateCallTarget()` - Remove delegate call target

## ✅ Benefits

1. **Proper Access Control**: Transactions are executed with Safe as `msg.sender`
2. **Security Compliance**: Follows Safe's multi-signature security model
3. **Consistent Flow**: Uses the same transaction pattern as other Safe operations
4. **Error Resolution**: Eliminates the `NotSafeWallet()` revert error

## 🔄 **Additional Fix: Correct Status Display**

### **Issue**: Status showed incorrect state immediately after transaction creation
The UI was showing the new delegate call state immediately after creating the transaction, but the actual on-chain state hadn't changed yet since transactions need to be executed.

### **Solution**:
- Removed immediate local state updates after transaction creation
- Status now only reflects actual on-chain state
- Added refresh button (↻) for manual status updates
- Added informational note explaining the transaction flow
- Changed success messages to indicate "transaction proposed" rather than "setting updated"

## 🧪 Testing

The fix has been validated through:
- ✅ TypeScript compilation successful
- ✅ Build process completed without errors
- ✅ Proper transaction parameter generation
- ✅ Safe transaction flow integration
- ✅ Correct status display behavior
- ✅ Layout fixes for button wrapping

## 🚀 Usage

Users can now:
1. Navigate to Settings → Security tab
2. Toggle delegate calls on/off successfully
3. Add/remove delegate call targets
4. All operations go through proper Safe transaction signing

This fix ensures that delegate call management works correctly within the Safe's security framework.
