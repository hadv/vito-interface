# Safe Module Management Guide

This guide explains how to use the module management feature in your Safe wallet interface to enable and manage custom modules, including the inheritance module.

## Overview

Safe modules are smart contracts that extend your Safe wallet's functionality. They have full access to execute transactions on behalf of your Safe, so only enable trusted and audited modules.

## Accessing Module Management

1. Connect to your Safe wallet
2. Navigate to **Settings** → **Modules** tab
3. You'll see two main sections:
   - **Enabled Modules**: Currently active modules on your Safe
   - **Enable New Module**: Add new modules by contract address

## Security Warning

⚠️ **IMPORTANT**: Modules have unlimited access to your Safe and can execute arbitrary transactions. Only enable modules from trusted sources that have been properly audited. A malicious module can completely take over your Safe.

## Using the Inheritance Module

The inheritance module implements a "dead man's switch" that allows designated beneficiaries to claim Safe assets after a period of owner inactivity.

### Step 1: Deploy the Inheritance Module

First, deploy the inheritance module contract:

```bash
cd vito-contracts
forge script script/DeployInheritanceModule.s.sol --rpc-url <YOUR_RPC_URL> --broadcast --verify
```

Copy the deployed contract address from the output.

### Step 2: Enable the Module

1. In the Safe interface, go to **Settings** → **Modules**
2. In the "Enable New Module" section, paste the inheritance module address
3. Click **Enable Module**
4. Sign the transaction to enable the module on your Safe

### Step 3: Configure Inheritance

Once enabled, you can interact with the inheritance module directly through your Safe:

#### Configure Inheritance Settings

Create a transaction to call `configureInheritance()` with:
- `inactivityPeriod`: Time in seconds (e.g., 31536000 for 1 year)
- `beneficiaries`: Array of beneficiary addresses
- `sharePercentages`: Array of percentages (must sum to 10000 = 100%)

Example for 2 beneficiaries with 50% each:
```
beneficiaries: ["0xBeneficiary1Address", "0xBeneficiary2Address"]
sharePercentages: [5000, 5000]
```

#### Record Activity

To reset the inactivity timer, call `recordActivity()` - this should be done periodically to prevent inheritance claims.

#### Claim Inheritance

After the inactivity period has passed, beneficiaries can call `claimInheritance()` to receive their share of the Safe assets.

## Other Popular Module Types

### Allowance Module
- Gives spending permissions to other addresses
- Set daily/monthly limits for specific addresses
- Useful for recurring payments or trusted parties

### Social Recovery Module
- Allows recovery of Safe access through trusted guardians
- Guardians can help recover the Safe if owners lose access
- Requires threshold of guardians to approve recovery

### Spending Limit Module
- Set daily/monthly spending limits for the entire Safe
- Prevents large unauthorized transactions
- Can be configured per token type

### Guard Modules
- Add additional validation to transactions
- Can implement custom business logic
- Examples: whitelist addresses, time-based restrictions

## Module Management Best Practices

1. **Research First**: Only enable modules that have been audited and are from reputable sources
2. **Test on Testnet**: Deploy and test modules on testnets before using on mainnet
3. **Regular Reviews**: Periodically review enabled modules and disable unused ones
4. **Keep Records**: Document which modules are enabled and their purposes
5. **Monitor Activity**: Watch for unexpected module transactions

## Disabling Modules

To disable a module:

1. Go to **Settings** → **Modules**
2. Find the module in the "Enabled Modules" section
3. Click **Disable** next to the module
4. Sign the transaction to remove the module

## Troubleshooting

### Module Won't Enable
- Ensure the address is a valid contract address
- Check that the contract implements the required module interface
- Verify you have sufficient permissions (must be a Safe owner)

### Transaction Fails
- Check gas limits and network congestion
- Ensure the Safe has sufficient ETH for transaction fees
- Verify the module contract is deployed on the correct network

### Module Not Working
- Confirm the module is properly enabled
- Check if the module requires additional configuration
- Review module documentation for setup requirements

## Development Resources

- [Safe Contracts Documentation](https://docs.safe.global/)
- [Module Development Guide](https://docs.safe.global/advanced/smart-account-modules)
- [Safe SDK](https://docs.safe.global/sdk/overview)

## Support

For issues with:
- **Safe Interface**: Check the Safe documentation or community forums
- **Custom Modules**: Contact the module developer
- **This Interface**: Create an issue in the project repository
