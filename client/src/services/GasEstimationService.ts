import { ethers } from 'ethers';

export interface GasEstimationResult {
  gasLimit: number;
  gasPrice: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  totalCost: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface TransactionGasParams {
  to: string;
  value?: string;
  data?: string;
  from?: string;
}

/**
 * Service for optimized gas estimation, especially for Safe transactions
 * and WalletConnect interactions
 */
export class GasEstimationService {
  private provider: ethers.providers.Provider;
  private network: string;

  constructor(provider: ethers.providers.Provider, network: string = 'sepolia') {
    this.provider = provider;
    this.network = network;
  }

  /**
   * Estimate gas for a transaction with multiple fallback strategies
   */
  async estimateTransactionGas(params: TransactionGasParams): Promise<GasEstimationResult> {
    console.log('🔍 Estimating gas for transaction:', params);

    try {
      // Method 1: Direct estimation
      const directEstimate = await this.directGasEstimation(params);
      if (directEstimate) {
        return await this.buildGasResult(directEstimate, 'high');
      }
    } catch (error) {
      console.warn('Direct gas estimation failed:', error);
    }

    try {
      // Method 2: Binary search estimation
      const binaryEstimate = await this.binarySearchGasEstimation(params);
      if (binaryEstimate) {
        return await this.buildGasResult(binaryEstimate, 'medium');
      }
    } catch (error) {
      console.warn('Binary search gas estimation failed:', error);
    }

    // Method 3: Fallback calculation
    const fallbackEstimate = this.calculateFallbackGas(params);
    return await this.buildGasResult(fallbackEstimate, 'low');
  }

  /**
   * Direct gas estimation using provider
   */
  private async directGasEstimation(params: TransactionGasParams): Promise<number | null> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        to: params.to,
        value: params.value || '0',
        data: params.data || '0x',
        from: params.from
      });

      return gasEstimate.toNumber();
    } catch (error) {
      return null;
    }
  }

  /**
   * Binary search gas estimation for problematic transactions
   */
  private async binarySearchGasEstimation(params: TransactionGasParams): Promise<number | null> {
    let low = 21000; // Minimum gas for any transaction
    let high = 10000000; // Maximum reasonable gas limit
    let lastSuccessful = 0;

    // Binary search for the minimum gas that doesn't revert
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      
      try {
        await this.provider.call({
          to: params.to,
          value: params.value || '0',
          data: params.data || '0x',
          from: params.from,
          gasLimit: mid
        });
        
        lastSuccessful = mid;
        high = mid - 1; // Try with less gas
      } catch (error) {
        low = mid + 1; // Need more gas
      }
    }

    return lastSuccessful > 0 ? Math.floor(lastSuccessful * 1.1) : null; // Add 10% buffer
  }

  /**
   * Calculate fallback gas based on transaction characteristics
   */
  private calculateFallbackGas(params: TransactionGasParams): number {
    let baseGas = 21000; // Base transaction cost

    // Add gas for data
    if (params.data && params.data !== '0x') {
      const dataBytes = (params.data.length - 2) / 2; // Remove 0x prefix
      const dataGas = dataBytes * 16; // 16 gas per byte (approximate)
      baseGas += dataGas;

      // Add gas for contract interaction
      baseGas += 50000;

      // Specific method signatures
      if (params.data.startsWith('0xa9059cbb')) {
        // ERC-20 transfer
        baseGas += 15000;
      } else if (params.data.startsWith('0x6a761202')) {
        // Safe execTransaction
        baseGas += 100000;
      }
    }

    // Add gas for value transfer
    if (params.value && params.value !== '0') {
      baseGas += 2300; // Additional gas for value transfer
    }

    return baseGas;
  }

  /**
   * Build complete gas result with pricing information
   */
  private async buildGasResult(gasLimit: number, confidence: 'low' | 'medium' | 'high'): Promise<GasEstimationResult> {
    try {
      // Get current gas pricing
      const feeData = await this.provider.getFeeData();
      
      let gasPrice = feeData.gasPrice?.toString() || '0';
      let maxFeePerGas: string | undefined;
      let maxPriorityFeePerGas: string | undefined;

      // For EIP-1559 networks
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        maxFeePerGas = feeData.maxFeePerGas.toString();
        maxPriorityFeePerGas = feeData.maxPriorityFeePerGas.toString();
        gasPrice = maxFeePerGas; // Use maxFeePerGas for cost calculation
      }

      // Calculate total cost
      const totalCost = ethers.BigNumber.from(gasLimit).mul(gasPrice);

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalCost: ethers.utils.formatEther(totalCost),
        confidence
      };
    } catch (error) {
      console.error('Error building gas result:', error);
      
      // Fallback gas pricing
      const fallbackGasPrice = ethers.utils.parseUnits('2', 'gwei'); // 2 gwei fallback
      const totalCost = ethers.BigNumber.from(gasLimit).mul(fallbackGasPrice);

      return {
        gasLimit,
        gasPrice: fallbackGasPrice.toString(),
        totalCost: ethers.utils.formatEther(totalCost),
        confidence: 'low'
      };
    }
  }

  /**
   * Estimate gas specifically for Safe transaction execution
   */
  async estimateSafeExecutionGas(
    safeAddress: string,
    to: string,
    value: string,
    data: string,
    operation: number,
    safeTxGas: string,
    baseGas: string,
    gasPrice: string,
    gasToken: string,
    refundReceiver: string,
    signatures: string
  ): Promise<GasEstimationResult> {
    // Safe execTransaction method signature
    const safeInterface = new ethers.utils.Interface([
      'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) returns (bool success)'
    ]);

    const execData = safeInterface.encodeFunctionData('execTransaction', [
      to,
      value,
      data,
      operation,
      safeTxGas,
      baseGas,
      gasPrice,
      gasToken,
      refundReceiver,
      signatures
    ]);

    return this.estimateTransactionGas({
      to: safeAddress,
      value: '0',
      data: execData
    });
  }

  /**
   * Get network-specific gas adjustments
   */
  private getNetworkGasMultiplier(): number {
    switch (this.network.toLowerCase()) {
      case 'mainnet':
      case 'ethereum':
        return 1.2; // 20% buffer for mainnet
      case 'sepolia':
      case 'goerli':
        return 1.1; // 10% buffer for testnets
      case 'arbitrum':
        return 1.05; // 5% buffer for L2s
      default:
        return 1.15; // 15% buffer for unknown networks
    }
  }
}

// Create singleton instance
export const gasEstimationService = new GasEstimationService(
  new ethers.providers.JsonRpcProvider(), // Will be replaced with actual provider
  'sepolia'
);
