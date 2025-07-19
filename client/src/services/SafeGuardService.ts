import { ethers } from 'ethers';
import { SafeTransactionData } from '../utils/eip712';
import { isValidAddress } from '../utils/addressUtils';

/**
 * Service for managing Smart Contract Guards on Safe wallets
 */
export class SafeGuardService {
  /**
   * Create a Safe transaction for setting a guard
   */
  static createSetGuardTransaction(
    safeAddress: string,
    guardAddress: string,
    nonce: number
  ): SafeTransactionData {
    console.log('🛡️ SafeGuardService: Creating setGuard transaction');
    console.log('📋 Safe address:', safeAddress);
    console.log('📋 Guard address:', guardAddress);
    console.log('📋 Nonce:', nonce);

    // Validate Safe address
    if (!isValidAddress(safeAddress)) {
      throw new Error('Invalid Safe address format');
    }

    // Validate guard address
    if (!isValidAddress(guardAddress)) {
      throw new Error('Invalid guard address format');
    }

    // Create the transaction data for setGuard(address)
    const safeInterface = new ethers.utils.Interface([
      'function setGuard(address guard)'
    ]);

    try {
      const data = safeInterface.encodeFunctionData('setGuard', [guardAddress]);
      console.log('📋 Encoded setGuard data:', data);

      const safeTransactionData: SafeTransactionData = {
        to: safeAddress, // Transaction to the Safe itself
        value: '0',
        data,
        operation: 0, // CALL operation
        safeTxGas: '0',
        baseGas: '0',
        gasPrice: '0',
        gasToken: ethers.constants.AddressZero,
        refundReceiver: ethers.constants.AddressZero,
        nonce
      };

      console.log('✅ SafeGuardService: setGuard transaction created successfully');
      return safeTransactionData;
    } catch (error) {
      console.error('❌ SafeGuardService: Failed to create setGuard transaction:', error);
      throw new Error(`Failed to create setGuard transaction: ${error}`);
    }
  }

  /**
   * Create a Safe transaction for removing a guard (setting to zero address)
   */
  static createRemoveGuardTransaction(
    safeAddress: string,
    nonce: number
  ): SafeTransactionData {
    return this.createSetGuardTransaction(safeAddress, ethers.constants.AddressZero, nonce);
  }

  /**
   * Validate if an address could be a valid guard contract
   * Note: This only validates the address format, not the contract implementation
   */
  static validateGuardAddress(address: string): { isValid: boolean; error?: string } {
    if (!address || address.trim().length === 0) {
      return { isValid: false, error: 'Guard address is required' };
    }

    if (!isValidAddress(address)) {
      return { isValid: false, error: 'Invalid Ethereum address format' };
    }

    if (address === ethers.constants.AddressZero) {
      return { isValid: false, error: 'Cannot use zero address as guard' };
    }

    return { isValid: true };
  }

  /**
   * Advanced validation to check if an address is actually a contract
   * and potentially implements the Guard interface
   */
  static async validateGuardContract(
    address: string,
    provider: ethers.providers.Provider
  ): Promise<{ isValid: boolean; error?: string; warnings?: string[] }> {
    const basicValidation = this.validateGuardAddress(address);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    const warnings: string[] = [];

    try {
      // Check if address is a contract
      const code = await provider.getCode(address);
      if (code === '0x') {
        return {
          isValid: false,
          error: 'Address is not a contract. Guards must be smart contracts that implement the Guard interface.'
        };
      }

      // Try to check if it implements the Guard interface
      // Check for required Guard methods: checkTransaction and checkAfterExecution
      try {
        const guardInterface = new ethers.utils.Interface([
          'function checkTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures, address msgSender) view',
          'function checkAfterExecution(bytes32 txHash, bool success) view'
        ]);

        const contract = new ethers.Contract(address, guardInterface, provider);

        // Try to call checkTransaction with dummy data to see if method exists
        try {
          await contract.callStatic.checkTransaction(
            ethers.constants.AddressZero, // to
            0, // value
            '0x', // data
            0, // operation
            0, // safeTxGas
            0, // baseGas
            0, // gasPrice
            ethers.constants.AddressZero, // gasToken
            ethers.constants.AddressZero, // refundReceiver
            '0x', // signatures
            ethers.constants.AddressZero // msgSender
          );

          // If we get here, the method exists (even if it reverts, that's expected)
        } catch (error: any) {
          // Check if error is due to missing method vs execution revert
          if (error.message.includes('function selector was not recognized') ||
              error.message.includes('no matching function') ||
              (error.code === 'CALL_EXCEPTION' && error.reason === 'function selector was not recognized')) {
            return {
              isValid: false,
              error: 'Contract does not implement the Guard interface. Missing checkTransaction() method.'
            };
          }
          // If it's a revert or other execution error, the method exists
        }

        // Try checkAfterExecution method
        try {
          await contract.callStatic.checkAfterExecution(
            ethers.constants.HashZero, // txHash
            true // success
          );
        } catch (error: any) {
          if (error.message.includes('function selector was not recognized') ||
              error.message.includes('no matching function') ||
              (error.code === 'CALL_EXCEPTION' && error.reason === 'function selector was not recognized')) {
            return {
              isValid: false,
              error: 'Contract does not implement the Guard interface. Missing checkAfterExecution() method.'
            };
          }
        }

      } catch (error) {
        return {
          isValid: false,
          error: `Failed to verify Guard interface: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }

      return { isValid: true, warnings };
    } catch (error) {
      return {
        isValid: false,
        error: `Failed to validate contract: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Security check: Validate that setting this guard won't lock the Safe
   */
  static validateGuardSecurity(guardAddress: string, safeAddress: string): { isValid: boolean; warnings: string[] } {
    const warnings: string[] = [];

    // Check if guard address is the same as Safe address (potential lock)
    if (guardAddress.toLowerCase() === safeAddress.toLowerCase()) {
      return {
        isValid: false,
        warnings: ['Cannot set Safe address as its own guard - this would create a circular dependency and lock the Safe.']
      };
    }

    // Add security warnings
    warnings.push('⚠️ SECURITY WARNING: Guards have full power to block Safe transactions.');
    warnings.push('⚠️ Ensure you trust the guard contract and have reviewed its code.');
    warnings.push('⚠️ A malicious or buggy guard can permanently lock your Safe.');
    warnings.push('⚠️ Always test guards on testnets first.');
    warnings.push('⚠️ Consider implementing emergency recovery mechanisms.');

    return { isValid: true, warnings };
  }

  /**
   * Check if a guard address is the zero address (no guard set)
   */
  static isGuardRemoved(guardAddress: string): boolean {
    return guardAddress === ethers.constants.AddressZero;
  }

  /**
   * Format guard address for display
   */
  static formatGuardAddress(guardAddress: string): string {
    if (this.isGuardRemoved(guardAddress)) {
      return 'No guard set';
    }
    return guardAddress;
  }

  /**
   * Get guard status description
   */
  static getGuardStatusDescription(guardAddress: string): string {
    if (this.isGuardRemoved(guardAddress)) {
      return 'No smart contract guard is currently configured for this Safe wallet.';
    }
    return 'A smart contract guard is active and will validate all transactions before execution.';
  }
}

export default SafeGuardService;
