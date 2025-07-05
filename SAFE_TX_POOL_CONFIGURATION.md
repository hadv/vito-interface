# Safe TX Pool Configuration Guide

This guide explains how to configure Safe TX Pool smart contract addresses for different networks in the Vito Safe Wallet Interface.

## Overview

The Safe TX Pool is a smart contract that manages transaction proposals and signatures for Safe wallets. Each network (Ethereum, Sepolia, Arbitrum) requires its own deployed instance of the Safe TX Pool contract.

## Configuration Methods

### Method 1: Environment Variables (Recommended)

1. **Copy the environment template:**
   ```bash
   cp client/.env.example client/.env.local
   ```

2. **Edit the `.env.local` file and add your contract addresses:**
   ```bash
   # Safe TX Pool Contract Addresses
   REACT_APP_SAFE_TX_POOL_ETHEREUM=0x1234567890123456789012345678901234567890
   REACT_APP_SAFE_TX_POOL_SEPOLIA=0x7a3d07cABd656aEc614831B6eFAbd014697c9E19
   REACT_APP_SAFE_TX_POOL_ARBITRUM=0x3456789012345678901234567890123456789012
   ```

3. **Restart the development server:**
   ```bash
   npm start
   ```

### Method 2: Direct Code Configuration

If you prefer to hardcode the addresses, edit `client/src/contracts/abis.ts`:

```typescript
export const SAFE_TX_POOL_ADDRESSES = {
  ethereum: '0x1234567890123456789012345678901234567890', // Your Ethereum mainnet address
  sepolia: '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19',   // Sepolia testnet address (default)
  arbitrum: '0x3456789012345678901234567890123456789012'   // Your Arbitrum address
};
```

## Contract Deployment

If you haven't deployed the Safe TX Pool contracts yet, you'll need to:

### 1. Deploy to Each Network

Deploy the SafeTxPool contract to each network you want to support:

- **Ethereum Mainnet** (Chain ID: 1)
- **Sepolia Testnet** (Chain ID: 11155111)
- **Arbitrum One** (Chain ID: 42161)

### 2. Verify Deployment

After deployment, verify that:
- The contract is deployed at the expected address
- The contract is verified on the block explorer
- The contract has the correct ABI

### 3. Update Configuration

Add the deployed contract addresses to your configuration using one of the methods above.

## Validation

The application includes built-in validation to check if Safe TX Pool addresses are properly configured:

### Checking Configuration Status

```typescript
import { isSafeTxPoolConfigured, getSafeTxPoolAddress } from './contracts/abis';

// Check if a network is configured
const isEthereumConfigured = isSafeTxPoolConfigured('ethereum');
const isSepoliaConfigured = isSafeTxPoolConfigured('sepolia');

// Get the contract address for a network
const ethereumAddress = getSafeTxPoolAddress('ethereum');
const sepoliaAddress = getSafeTxPoolAddress('sepolia');
```

### Error Handling

If a Safe TX Pool address is not configured:
- The application will show warning messages in the console
- Transaction creation will fail with descriptive error messages
- Users will be notified that the feature is not available for that network

## Network-Specific Configuration

### Ethereum Mainnet
- **Chain ID:** 1
- **Environment Variable:** `REACT_APP_SAFE_TX_POOL_ETHEREUM`
- **Block Explorer:** https://etherscan.io
- **Use Case:** Production transactions

### Sepolia Testnet
- **Chain ID:** 11155111
- **Environment Variable:** `REACT_APP_SAFE_TX_POOL_SEPOLIA`
- **Block Explorer:** https://sepolia.etherscan.io
- **Use Case:** Testing and development

### Arbitrum One
- **Chain ID:** 42161
- **Environment Variable:** `REACT_APP_SAFE_TX_POOL_ARBITRUM`
- **Block Explorer:** https://arbiscan.io
- **Use Case:** Layer 2 scaling solution

## Troubleshooting

### Common Issues

1. **"SafeTxPool contract not configured" Error**
   - Check that the contract address is set in environment variables or abis.ts
   - Verify the address is not the placeholder `0x0000000000000000000000000000000000000000`
   - Ensure the environment variable name matches exactly

2. **"Contract not initialized" Error**
   - Verify the contract is deployed at the specified address
   - Check that the network configuration is correct
   - Ensure the RPC endpoint is accessible

3. **Transaction Failures**
   - Verify the contract ABI matches the deployed contract
   - Check that the signer has sufficient gas
   - Ensure the Safe wallet exists on the target network

### Debug Information

Enable debug logging by setting:
```bash
REACT_APP_ENVIRONMENT=development
```

This will show additional console logs about:
- Contract initialization status
- Network configuration validation
- Transaction proposal attempts

## Security Considerations

1. **Environment Variables:** Store sensitive information in `.env.local` (not committed to git)
2. **Contract Verification:** Always verify contracts on block explorers
3. **Address Validation:** Double-check contract addresses before configuration
4. **Network Isolation:** Use different contracts for mainnet vs testnet

## Adding New Networks

To add support for additional networks:

1. **Add to SAFE_TX_POOL_ADDRESSES:**
   ```typescript
   export const SAFE_TX_POOL_ADDRESSES = {
     // ... existing networks
     polygon: process.env.REACT_APP_SAFE_TX_POOL_POLYGON || '0x0000000000000000000000000000000000000000'
   };
   ```

2. **Add to NETWORK_CONFIGS:**
   ```typescript
   export const NETWORK_CONFIGS = {
     // ... existing networks
     polygon: {
       chainId: 137,
       name: 'Polygon',
       rpcUrl: 'https://polygon-rpc.com',
       blockExplorer: 'https://polygonscan.com',
       safeTxPoolAddress: SAFE_TX_POOL_ADDRESSES.polygon,
       isTestnet: false
     }
   };
   ```

3. **Update the UI** to include the new network in the network selector

4. **Deploy the contract** to the new network and update the configuration
