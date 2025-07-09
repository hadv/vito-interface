# Wallet Connection Fix Test

## Issue Description
When users connect their wallet to Safe wallet via WalletConnect, the app was incorrectly displaying these connections as dApp connections instead of recognizing them as signer wallet connections. **This issue was particularly noticeable when stopping and restarting the app.**

## Root Cause
Both `WalletConnectService` (for signer connections) and `DAppWalletConnectService` (for dApp connections) were:
1. Using the same WalletConnect project ID
2. Both listening for `session_proposal` events
3. `DAppWalletConnectService` was auto-approving ALL session proposals, intercepting legitimate signer wallet connections
4. **On app restart**: `DAppWalletConnectService.loadExistingSessions()` was loading ALL WalletConnect sessions from storage, including signer wallet sessions

## Fix Applied

### 1. Added Connection Type Differentiation
- Added `expectingDAppConnection` flag to `DAppWalletConnectService`
- Only handle session proposals when explicitly expecting a dApp connection

### 2. Updated Session Proposal Handler
- `DAppWalletConnectService.handleSessionProposal()` now checks if a dApp connection is expected
- Ignores session proposals that are likely signer wallet connections
- Resets the flag after handling proposals

### 3. Updated dApp Connection Flow
- `connectDApp()` method now sets `expectingDAppConnection = true` before pairing
- Resets flag on error to prevent stuck state

### 4. Added Session Cleanup
- Added `clearIncorrectSignerSessions()` method to clean up any incorrectly stored sessions
- Called automatically when signer wallets connect successfully
- Ensures clean state separation between signer and dApp connections

### 5. Fixed Session Loading on App Restart
- Updated `loadExistingSessions()` to use `isLikelySignerWalletSession()` heuristics
- Added `cleanupIncorrectlyLoadedSessions()` method to remove misclassified sessions
- Called cleanup during Safe wallet connection and service initialization
- Prevents signer wallet sessions from being loaded as dApp connections on app restart

## Files Modified
1. `client/src/services/DAppWalletConnectService.ts`
   - Added `expectingDAppConnection` flag
   - Updated `handleSessionProposal()` to check connection type
   - Updated `connectDApp()` to set expectation flag
   - Added `clearIncorrectSignerSessions()` method
   - **Updated `loadExistingSessions()` to filter out signer wallet sessions**
   - **Added `isLikelySignerWalletSession()` heuristics method**
   - **Added `cleanupIncorrectlyLoadedSessions()` method**

2. `client/src/services/WalletConnectionService.ts`
   - Added import for `dAppWalletConnectService`
   - Added cleanup calls in all signer connection methods (MetaMask, WalletConnect, Web3Auth)
   - **Added cleanup call in Safe wallet connection**
   - **Added cleanup call in constructor with delay for app restart scenarios**

## Testing Steps

### Before Fix (Expected Issue):
1. Connect Safe wallet in read-only mode
2. Connect signer wallet via WalletConnect QR code
3. **Stop and restart the app**
4. Check dApp connections modal - would show the signer wallet as a dApp connection

### After Fix (Expected Behavior):
1. Connect Safe wallet in read-only mode
2. Connect signer wallet via WalletConnect QR code
3. **Stop and restart the app**
4. Signer wallet should appear in header as connected signer
5. dApp connections modal should remain empty
6. Only explicitly connected dApps (via pairing code) should appear in dApp connections

### Additional Test Cases:
- **App restart with existing signer connection**: Should not show signer in dApp connections
- **Multiple app restarts**: Should consistently maintain proper separation
- **Mixed connections**: Signer + legitimate dApp connections should be properly separated

## Verification
- Signer wallet connections should only appear in the header wallet dropdown
- dApp connections should only appear in the dApp connections modal
- No cross-contamination between the two connection types
