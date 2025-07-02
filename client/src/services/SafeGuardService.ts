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
    // Validate guard address
    if (!isValidAddress(guardAddress)) {
      throw new Error('Invalid guard address format');
    }

    // Create the transaction data for setGuard(address)
    const safeInterface = new ethers.utils.Interface([
      'function setGuard(address guard)'
    ]);
    
    const data = safeInterface.encodeFunctionData('setGuard', [guardAddress]);

    return {
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
      // This is a basic check - we try to call supportsInterface with the Guard interface ID
      try {
        const guardInterface = new ethers.utils.Interface([
          'function supportsInterface(bytes4 interfaceId) view returns (bool)'
        ]);

        // Guard interface ID (ERC165)
        const guardInterfaceId = '0x945b8148'; // bytes4(keccak256("Guard"))

        const contract = new ethers.Contract(address, guardInterface, provider);
        const supportsGuardInterface = await contract.supportsInterface(guardInterfaceId);

        if (!supportsGuardInterface) {
          warnings.push('Contract may not implement the Guard interface. Ensure it has checkTransaction() and checkAfterExecution() methods.');
        }
      } catch (error) {
        warnings.push('Unable to verify Guard interface implementation. Please ensure the contract implements the required Guard methods.');
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
