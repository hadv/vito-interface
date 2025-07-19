# SafeTxPoolRegistry Deployment and Initialization Guide

## Issue Diagnosis

The "Add Trusted Contract" transaction is failing because the SafeTxPoolRegistry contract system is not properly initialized. Here's what's happening:

### Transaction Flow
1. User clicks "Add Trusted Contract"
2. Transaction is created to call `SafeTxPoolRegistry.addTrustedContract(safe, contractAddress)`
3. SafeTxPoolRegistry calls `trustedContractManager.addTrustedContract(safe, contractAddress)`
4. **FAILURE**: TrustedContractManager rejects the call because SafeTxPoolRegistry is not authorized

### Root Cause
The TrustedContractManager uses the `onlySafeOrRegistry(safe)` modifier which requires:
- `msg.sender == safe` (the Safe wallet itself), OR  
- `msg.sender == registry` (the SafeTxPoolRegistry address)

However, the `registry` address in TrustedContractManager is not set, so it defaults to `address(0)`, causing the authorization check to fail.

## Solution: Proper Deployment and Initialization

### Step 1: Deploy All Contracts
Deploy the contracts in this order:
1. `SafeTxPoolCore`
2. `AddressBookManager` 
3. `DelegateCallManager`
4. `TrustedContractManager`
5. `TransactionValidator`
6. `SafeTxPoolRegistry` (with addresses of the above contracts)

### Step 2: Initialize Manager Contracts
After deploying SafeTxPoolRegistry, call `setRegistry()` on each manager contract:

```solidity
// Set SafeTxPoolRegistry address in each manager
trustedContractManager.setRegistry(safeTxPoolRegistryAddress);
addressBookManager.setRegistry(safeTxPoolRegistryAddress);
delegateCallManager.setRegistry(safeTxPoolRegistryAddress);
// transactionValidator doesn't need setRegistry as it doesn't use the modifier
```

### Step 3: Verify Initialization
Check that each manager contract has the correct registry address:

```solidity
// Should return the SafeTxPoolRegistry address
address registryAddr = trustedContractManager.registry();
require(registryAddr == safeTxPoolRegistryAddress, "Registry not set correctly");
```

## Quick Fix for Current Deployment

If the contracts are already deployed but not initialized:

1. **Check current registry address**:
   ```javascript
   const trustedContractManager = new ethers.Contract(
     TRUSTED_CONTRACT_MANAGER_ADDRESS, 
     ['function registry() view returns (address)'], 
     provider
   );
   const currentRegistry = await trustedContractManager.registry();
   console.log('Current registry:', currentRegistry); // Should be 0x0000... if not set
   ```

2. **Set registry address** (must be called by contract owner):
   ```javascript
   const trustedContractManager = new ethers.Contract(
     TRUSTED_CONTRACT_MANAGER_ADDRESS,
     ['function setRegistry(address _registry)'],
     signer
   );
   await trustedContractManager.setRegistry(SAFE_TX_POOL_REGISTRY_ADDRESS);
   ```

3. **Repeat for all manager contracts**:
   - TrustedContractManager
   - AddressBookManager  
   - DelegateCallManager

## Contract Addresses Needed

To fix the current deployment, you'll need:
- SafeTxPoolRegistry address (already configured in environment)
- TrustedContractManager address
- AddressBookManager address
- DelegateCallManager address

These can be found in the SafeTxPoolRegistry contract by calling:
- `trustedContractManager()`
- `addressBookManager()`
- `delegateCallManager()`

## Testing the Fix

After initialization, test with:
```javascript
// This should now work
await safeTxPoolRegistry.addTrustedContract(safeAddress, contractAddress);
```

## Prevention for Future Deployments

Consider adding initialization to the SafeTxPoolRegistry constructor or creating a deployment script that handles both deployment and initialization in one transaction.
