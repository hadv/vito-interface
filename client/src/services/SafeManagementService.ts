import { ethers } from 'ethers';
import { SafeTransactionData } from '../utils/eip712';

/**
 * Service for creating Safe management transactions (add/remove owners, change threshold)
 */
export class SafeManagementService {
  private static readonly SENTINEL_OWNERS = '0x0000000000000000000000000000000000000001';

  /**
   * Create transaction data for adding a new owner with threshold
   */
  static createAddOwnerWithThresholdTxData(
    ownerAddress: string,
    newThreshold: number
  ): string {
    if (!ethers.utils.isAddress(ownerAddress)) {
      throw new Error('Invalid owner address');
    }

    if (newThreshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    // Create Safe contract interface for addOwnerWithThreshold function
    const safeInterface = new ethers.utils.Interface([
      'function addOwnerWithThreshold(address owner, uint256 _threshold)'
    ]);

    return safeInterface.encodeFunctionData('addOwnerWithThreshold', [
      ownerAddress,
      newThreshold
    ]);
  }

  /**
   * Create transaction data for removing an owner
   */
  static createRemoveOwnerTxData(
    prevOwner: string,
    ownerToRemove: string,
    newThreshold: number
  ): string {
    if (!ethers.utils.isAddress(prevOwner)) {
      throw new Error('Invalid previous owner address');
    }

    if (!ethers.utils.isAddress(ownerToRemove)) {
      throw new Error('Invalid owner address to remove');
    }

    if (newThreshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    // Create Safe contract interface for removeOwner function
    const safeInterface = new ethers.utils.Interface([
      'function removeOwner(address prevOwner, address owner, uint256 _threshold)'
    ]);

    return safeInterface.encodeFunctionData('removeOwner', [
      prevOwner,
      ownerToRemove,
      newThreshold
    ]);
  }

  /**
   * Create transaction data for changing threshold
   */
  static createChangeThresholdTxData(newThreshold: number): string {
    if (newThreshold < 1) {
      throw new Error('Threshold must be at least 1');
    }

    // Create Safe contract interface for changeThreshold function
    const safeInterface = new ethers.utils.Interface([
      'function changeThreshold(uint256 _threshold)'
    ]);

    return safeInterface.encodeFunctionData('changeThreshold', [newThreshold]);
  }

  /**
   * Create a Safe transaction for adding a new owner
   */
  static createAddOwnerTransaction(
    safeAddress: string,
    ownerAddress: string,
    newThreshold: number,
    nonce: number
  ): SafeTransactionData {
    const data = this.createAddOwnerWithThresholdTxData(ownerAddress, newThreshold);

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
   * Create a Safe transaction for removing an owner
   */
  static createRemoveOwnerTransaction(
    safeAddress: string,
    prevOwner: string,
    ownerToRemove: string,
    newThreshold: number,
    nonce: number
  ): SafeTransactionData {
    const data = this.createRemoveOwnerTxData(prevOwner, ownerToRemove, newThreshold);

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
   * Create a Safe transaction for changing threshold
   */
  static createChangeThresholdTransaction(
    safeAddress: string,
    newThreshold: number,
    nonce: number
  ): SafeTransactionData {
    const data = this.createChangeThresholdTxData(newThreshold);

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
   * Find the previous owner in the linked list for removal
   * This is needed because Safe uses a linked list to store owners
   */
  static findPrevOwner(owners: string[], ownerToRemove: string): string {
    const ownerIndex = owners.findIndex(owner => 
      owner.toLowerCase() === ownerToRemove.toLowerCase()
    );
    
    if (ownerIndex === -1) {
      throw new Error('Owner not found in the list');
    }

    // If it's the first owner, previous is SENTINEL_OWNERS
    if (ownerIndex === 0) {
      return this.SENTINEL_OWNERS;
    }

    // Otherwise, return the previous owner in the array
    return owners[ownerIndex - 1];
  }

  /**
   * Validate if a new threshold is valid for the given number of owners
   */
  static validateThreshold(threshold: number, ownerCount: number): boolean {
    return threshold >= 1 && threshold <= ownerCount;
  }

  /**
   * Validate if an owner can be removed with the new threshold
   */
  static canRemoveOwner(currentOwnerCount: number, newThreshold: number): boolean {
    return (currentOwnerCount - 1) >= newThreshold && newThreshold >= 1;
  }
}

export default SafeManagementService;
