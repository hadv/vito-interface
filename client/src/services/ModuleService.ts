import { ethers } from 'ethers';
import { SafeWalletService } from './SafeWalletService';

// Safe Module Manager ABI - key functions for module management
const SAFE_MODULE_MANAGER_ABI = [
  'function enableModule(address module) external',
  'function disableModule(address prevModule, address module) external',
  'function isModuleEnabled(address module) external view returns (bool)',
  'function getModulesPaginated(address start, uint256 pageSize) external view returns (address[] memory array, address next)'
];

// Sentinel address used by Safe for linked list operations
const SENTINEL_MODULES = '0x0000000000000000000000000000000000000001';

export interface EnabledModule {
  address: string;
  name: string;
  description: string;
}

export interface ModuleTransactionRequest {
  to: string;
  value: string;
  data: string;
  operation: number;
}

class ModuleService {
  private static instance: ModuleService;
  private safeWalletService: SafeWalletService;

  private constructor() {
    this.safeWalletService = new SafeWalletService();
  }

  public static getInstance(): ModuleService {
    if (!ModuleService.instance) {
      ModuleService.instance = new ModuleService();
    }
    return ModuleService.instance;
  }

  /**
   * Get all enabled modules for the current Safe
   */
  async getEnabledModules(): Promise<EnabledModule[]> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      if (!safeInfo) {
        throw new Error('Safe not connected');
      }

      const provider = this.safeWalletService.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const safeContract = new ethers.Contract(
        safeInfo.address,
        SAFE_MODULE_MANAGER_ABI,
        provider
      );

      // Get modules using pagination (start with sentinel, get up to 100 modules)
      const [moduleAddresses] = await safeContract.getModulesPaginated(SENTINEL_MODULES, 100);

      // Map addresses to module info
      const enabledModules: EnabledModule[] = [];
      for (const address of moduleAddresses) {
        const moduleInfo = this.getModuleInfo(address);
        enabledModules.push({
          address,
          name: moduleInfo.name,
          description: moduleInfo.description
        });
      }

      return enabledModules;
    } catch (error) {
      console.error('Error getting enabled modules:', error);
      throw new Error(`Failed to get enabled modules: ${error}`);
    }
  }

  /**
   * Check if a specific module is enabled
   */
  async isModuleEnabled(moduleAddress: string): Promise<boolean> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      if (!safeInfo) {
        throw new Error('Safe not connected');
      }

      const provider = this.safeWalletService.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const safeContract = new ethers.Contract(
        safeInfo.address,
        SAFE_MODULE_MANAGER_ABI,
        provider
      );

      return await safeContract.isModuleEnabled(moduleAddress);
    } catch (error) {
      console.error('Error checking module status:', error);
      throw new Error(`Failed to check module status: ${error}`);
    }
  }

  /**
   * Create a transaction to enable a module
   */
  async enableModule(moduleAddress: string): Promise<any> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      if (!safeInfo) {
        throw new Error('Safe not connected');
      }

      // Create the enableModule transaction data
      const safeInterface = new ethers.utils.Interface(SAFE_MODULE_MANAGER_ABI);
      const data = safeInterface.encodeFunctionData('enableModule', [moduleAddress]);

      const transactionRequest: ModuleTransactionRequest = {
        to: safeInfo.address,
        value: '0',
        data,
        operation: 0 // CALL operation
      };

      // Create and sign the transaction using SafeWalletService
      return await this.safeWalletService.createTransaction(transactionRequest);
    } catch (error) {
      console.error('Error enabling module:', error);
      throw new Error(`Failed to enable module: ${error}`);
    }
  }

  /**
   * Create a transaction to disable a module
   */
  async disableModule(moduleAddress: string): Promise<any> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      if (!safeInfo) {
        throw new Error('Safe not connected');
      }

      // Get the previous module in the linked list
      const prevModule = await this.getPreviousModule(moduleAddress);
      if (!prevModule) {
        throw new Error('Could not find previous module in the linked list');
      }

      // Create the disableModule transaction data
      const safeInterface = new ethers.utils.Interface(SAFE_MODULE_MANAGER_ABI);
      const data = safeInterface.encodeFunctionData('disableModule', [prevModule, moduleAddress]);

      const transactionRequest: ModuleTransactionRequest = {
        to: safeInfo.address,
        value: '0',
        data,
        operation: 0 // CALL operation
      };

      // Create and sign the transaction using SafeWalletService
      return await this.safeWalletService.createTransaction(transactionRequest);
    } catch (error) {
      console.error('Error disabling module:', error);
      throw new Error(`Failed to disable module: ${error}`);
    }
  }

  /**
   * Get the previous module in the linked list (required for disabling)
   */
  private async getPreviousModule(moduleAddress: string): Promise<string | null> {
    try {
      const safeInfo = await this.safeWalletService.getSafeInfo();
      if (!safeInfo) {
        throw new Error('Safe not connected');
      }

      const provider = this.safeWalletService.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const safeContract = new ethers.Contract(
        safeInfo.address,
        SAFE_MODULE_MANAGER_ABI,
        provider
      );

      // Get all modules to find the previous one
      const [moduleAddresses] = await safeContract.getModulesPaginated(SENTINEL_MODULES, 100);
      
      let prevModule = SENTINEL_MODULES;
      for (const address of moduleAddresses) {
        if (address.toLowerCase() === moduleAddress.toLowerCase()) {
          return prevModule;
        }
        prevModule = address;
      }

      return null;
    } catch (error) {
      console.error('Error finding previous module:', error);
      return null;
    }
  }

  /**
   * Get module information by address
   * This includes known modules and attempts to identify common module types
   */
  private getModuleInfo(address: string): { name: string; description: string } {
    // Known module addresses and their info (these would be populated with actual deployed addresses)
    const knownModules: Record<string, { name: string; description: string }> = {
      // Example known modules - replace with actual deployed addresses
      // '0x1234...': { name: 'Inheritance Module', description: 'Allows beneficiaries to claim assets after inactivity' },
      // '0x5678...': { name: 'Spending Limit Module', description: 'Set daily/monthly spending limits' },
    };

    // Check if it's a known module
    const lowerAddress = address.toLowerCase();
    if (knownModules[lowerAddress]) {
      return knownModules[lowerAddress];
    }

    // Try to identify module type by common patterns (this is a simplified approach)
    // In a real implementation, you might query the contract or use a module registry
    const moduleTypes = [
      { pattern: /inheritance/i, name: 'Inheritance Module', description: 'Inheritance functionality for Safe assets' },
      { pattern: /allowance/i, name: 'Allowance Module', description: 'Spending allowances for other addresses' },
      { pattern: /recovery/i, name: 'Social Recovery Module', description: 'Social recovery functionality' },
      { pattern: /limit/i, name: 'Spending Limit Module', description: 'Spending limit controls' },
      { pattern: /guard/i, name: 'Guard Module', description: 'Transaction guard functionality' },
    ];

    // This is a placeholder - in reality you'd need to query the contract
    // or use a proper module registry to get accurate information
    for (const type of moduleTypes) {
      if (type.pattern.test(address)) {
        return { name: type.name, description: type.description };
      }
    }

    // Default info for unknown modules
    return {
      name: 'Custom Module',
      description: `Custom module contract at ${address.slice(0, 10)}...`
    };
  }

  /**
   * Validate module address
   */
  validateModuleAddress(address: string): boolean {
    try {
      return ethers.utils.isAddress(address) && 
             address !== ethers.constants.AddressZero &&
             address !== SENTINEL_MODULES;
    } catch {
      return false;
    }
  }

  /**
   * Get module transaction history
   */
  async getModuleTransactions(moduleAddress: string): Promise<any[]> {
    try {
      // This would typically query the Safe transaction service or blockchain
      // for transactions executed by the specific module
      // For now, return empty array as placeholder
      console.log('Getting transactions for module:', moduleAddress);
      return [];
    } catch (error) {
      console.error('Error getting module transactions:', error);
      return [];
    }
  }
}

// Export singleton instance
export default ModuleService.getInstance();
