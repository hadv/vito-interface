import { ethers } from 'ethers';
import { TokenService } from '../services/TokenService';

export interface DecodedTransactionData {
  type: 'ETH_TRANSFER' | 'ERC20_TRANSFER' | 'CONTRACT_CALL' | 'UNKNOWN';
  description: string;
  details: {
    token?: {
      address: string;
      symbol: string;
      name: string;
      decimals: number;
    };
    amount?: string;
    formattedAmount?: string;
    recipient?: string;
    method?: string;
    methodName?: string;
    parameters?: any[];
    decodedInputs?: { name: string; type: string; value: any }[];
    contractName?: string;
  };
}

interface EtherscanABIResponse {
  status: string;
  message: string;
  result: string;
}

interface ContractInfo {
  abi: any[];
  name: string;
}

export class TransactionDecoder {
  private tokenService: TokenService;
  private abiCache: Map<string, ContractInfo> = new Map();
  private network: string;

  constructor(tokenService: TokenService, network: string = 'ethereum') {
    this.tokenService = tokenService;
    this.network = network;
  }

  /**
   * Get Etherscan API URL for the current network
   */
  private getEtherscanApiUrl(): string {
    switch (this.network) {
      case 'sepolia':
        return 'https://api-sepolia.etherscan.io/api';
      case 'goerli':
        return 'https://api-goerli.etherscan.io/api';
      case 'ethereum':
      default:
        return 'https://api.etherscan.io/api';
    }
  }

  /**
   * Fetch contract ABI from Etherscan
   */
  private async fetchContractABI(contractAddress: string): Promise<ContractInfo | null> {
    // Check cache first
    const cacheKey = `${this.network}-${contractAddress.toLowerCase()}`;
    if (this.abiCache.has(cacheKey)) {
      return this.abiCache.get(cacheKey)!;
    }

    try {
      const apiUrl = this.getEtherscanApiUrl();
      const url = `${apiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=YourApiKeyToken`;

      console.log(`Fetching ABI for contract ${contractAddress} from ${apiUrl}`);

      const response = await fetch(url);
      const data: EtherscanABIResponse = await response.json();

      if (data.status === '1' && data.result && Array.isArray(JSON.parse(data.result))) {
        const result = JSON.parse(data.result)[0];

        if (result.ABI && result.ABI !== 'Contract source code not verified') {
          const abi = JSON.parse(result.ABI);
          const contractInfo: ContractInfo = {
            abi,
            name: result.ContractName || 'Unknown Contract'
          };

          // Cache the result
          this.abiCache.set(cacheKey, contractInfo);
          console.log(`✅ Successfully fetched ABI for ${contractInfo.name} (${contractAddress})`);
          return contractInfo;
        }
      }

      console.log(`❌ Contract ${contractAddress} is not verified or ABI not available`);
      return null;
    } catch (error) {
      console.error(`Error fetching ABI for contract ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Decode transaction data for user-friendly display
   */
  async decodeTransactionData(
    to: string,
    value: string,
    data: string,
    recipient?: string
  ): Promise<DecodedTransactionData> {
    try {
      // Silent operation - no console logs

      // ETH transfer (no data or empty data)
      if ((!data || data === '0x') && value !== '0') {
        const ethAmount = ethers.utils.formatEther(value);
        return {
          type: 'ETH_TRANSFER',
          description: `Send ${ethAmount} ETH`,
          details: {
            amount: value,
            formattedAmount: `${ethAmount} ETH`,
            recipient
          }
        };
      }

      // Contract call with data
      if (data && data.length > 10) {
        const methodId = data.slice(0, 10);

        // ERC-20 transfer: 0xa9059cbb
        if (methodId === '0xa9059cbb') {
          console.log('✅ Detected ERC-20 transfer');
          return await this.decodeERC20Transfer(to, data);
        }

        // ERC-20 transferFrom: 0x23b872dd
        if (methodId === '0x23b872dd') {
          console.log('✅ Detected ERC-20 transferFrom');
          return await this.decodeERC20TransferFrom(to, data);
        }

        // ERC-20 approve: 0x095ea7b3
        if (methodId === '0x095ea7b3') {
          console.log('✅ Detected ERC-20 approve');
          return await this.decodeERC20Approve(to, data);
        }

        // Try known method IDs first (fallback for when ABI fetching fails)
        const knownMethodResult = this.decodeKnownMethod(methodId, to, data);
        if (knownMethodResult) {
          return knownMethodResult;
        }
        // Try to decode using contract ABI
        const decodedCall = await this.decodeContractCall(to, data);
        if (decodedCall) {
          return decodedCall;
        }
        // Generic contract call fallback
        return {
          type: 'CONTRACT_CALL',
          description: 'Contract Interaction',
          details: {
            method: methodId,
            recipient: to
          }
        };
      }

      // Unknown transaction type
      return {
        type: 'UNKNOWN',
        description: 'Unknown Transaction',
        details: {
          recipient: to
        }
      };

    } catch (error) {
      console.error('Error decoding transaction data:', error);
      return {
        type: 'UNKNOWN',
        description: 'Unable to decode transaction',
        details: {
          recipient: to
        }
      };
    }
  }

  /**
   * Decode known method IDs without requiring ABI
   */
  private decodeKnownMethod(methodId: string, contractAddress: string, data: string): DecodedTransactionData | null {
    // Known SafeTxPool method IDs
    const knownMethods: { [key: string]: { name: string; description: string } } = {
      '0x10ff18f9': {
        name: 'proposeTransaction',
        description: 'Propose Transaction on SafeTxPool'
      },
      '0x09959f6b': {
        name: 'signTransaction',
        description: 'Sign Transaction on SafeTxPool'
      },
      '0x6a761202': {
        name: 'executeTransaction',
        description: 'Execute Transaction on SafeTxPool'
      },
      // Address book methods
      '0x4ce38b5f': {
        name: 'addEntry',
        description: 'Add Address Book Entry'
      },
      '0x2f54bf6e': {
        name: 'removeEntry',
        description: 'Remove Address Book Entry'
      }
    };

    const method = knownMethods[methodId];
    if (!method) {
      return null;
    }

    return {
      type: 'CONTRACT_CALL',
      description: method.description,
      details: {
        method: methodId,
        methodName: method.name,
        recipient: contractAddress,
        contractName: this.getContractName(contractAddress)
      }
    };
  }



  /**
   * Get contract name based on address
   */
  private getContractName(address: string): string {
    // Known contract addresses
    const knownContracts: { [key: string]: string } = {
      '0x1F738438AF91442fFa472d4Bd40e13FE0A264db8': 'SafeTxPool',
      // Add more known contracts here
    };

    return knownContracts[address.toLowerCase()] || knownContracts[address] || 'Contract';
  }

  /**
   * Decode contract call using fetched ABI
   */
  private async decodeContractCall(contractAddress: string, data: string): Promise<DecodedTransactionData | null> {
    try {
      const contractInfo = await this.fetchContractABI(contractAddress);
      if (!contractInfo) {
        return null;
      }

      const contractInterface = new ethers.utils.Interface(contractInfo.abi);
      const methodId = data.slice(0, 10);

      // Find the function in the ABI
      const functionFragment = contractInterface.getFunction(methodId);
      if (!functionFragment) {
        console.log(`Method ${methodId} not found in contract ABI`);
        return null;
      }

      // Decode the function call
      const decodedData = contractInterface.decodeFunctionData(functionFragment, data);

      // Format the decoded inputs
      const decodedInputs = functionFragment.inputs.map((input, index) => ({
        name: input.name || `param${index}`,
        type: input.type,
        value: this.formatParameterValue(decodedData[index], input.type)
      }));

      // Create a human-readable description
      const description = this.createMethodDescription(functionFragment.name, decodedInputs, contractInfo.name);

      return {
        type: 'CONTRACT_CALL',
        description,
        details: {
          method: methodId,
          methodName: functionFragment.name,
          recipient: contractAddress,
          parameters: Array.from(decodedData),
          decodedInputs,
          contractName: contractInfo.name
        }
      };

    } catch (error) {
      console.error('Error decoding contract call:', error);
      return null;
    }
  }

  /**
   * Format parameter values for display
   */
  private formatParameterValue(value: any, type: string): any {
    if (type.includes('address')) {
      return value.toString();
    } else if (type.includes('uint') || type.includes('int')) {
      return value.toString();
    } else if (type.includes('bytes')) {
      return value.toString();
    } else if (type === 'bool') {
      return value.toString();
    } else if (type === 'string') {
      return value.toString();
    } else if (type.includes('[]')) {
      // Handle arrays
      return Array.isArray(value) ? value.map(v => this.formatParameterValue(v, type.replace('[]', ''))) : value.toString();
    }
    return value.toString();
  }

  /**
   * Create human-readable description for method calls
   */
  private createMethodDescription(methodName: string, inputs: any[], contractName: string): string {
    // Special handling for common method patterns
    switch (methodName) {
      case 'proposeTransaction':
        return `Propose Transaction on ${contractName}`;
      case 'signTransaction':
        return `Sign Transaction on ${contractName}`;
      case 'executeTransaction':
        return `Execute Transaction on ${contractName}`;
      case 'addEntry':
        return `Add Address Book Entry`;
      case 'removeEntry':
        return `Remove Address Book Entry`;
      case 'approve':
        return `Approve Token Spending`;
      case 'transfer':
        return `Transfer Tokens`;
      case 'mint':
        return `Mint Tokens`;
      case 'burn':
        return `Burn Tokens`;
      default:
        // Generic description with method name
        const formattedMethod = methodName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${formattedMethod} on ${contractName}`;
    }
  }

  /**
   * Decode ERC-20 transfer function call
   */
  private async decodeERC20Transfer(tokenAddress: string, data: string): Promise<DecodedTransactionData> {
    try {
      const transferInterface = new ethers.utils.Interface([
        'function transfer(address to, uint256 amount)'
      ]);

      const decoded = transferInterface.decodeFunctionData('transfer', data);
      const recipient = decoded.to;
      const amount = decoded.amount;

      // Get token information
      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
      if (!tokenInfo) {
        return {
          type: 'ERC20_TRANSFER',
          description: 'Send Unknown Token',
          details: {
            amount: amount.toString(),
            recipient
          }
        };
      }

      const formattedAmount = this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals);

      return {
        type: 'ERC20_TRANSFER',
        description: `Send ${formattedAmount} ${tokenInfo.symbol}`,
        details: {
          token: tokenInfo,
          amount: amount.toString(),
          formattedAmount: `${formattedAmount} ${tokenInfo.symbol}`,
          recipient
        }
      };

    } catch (error) {
      console.error('Error decoding ERC20 transfer:', error);
      return {
        type: 'ERC20_TRANSFER',
        description: 'Send Token',
        details: {}
      };
    }
  }

  /**
   * Decode ERC-20 transferFrom function call
   */
  private async decodeERC20TransferFrom(tokenAddress: string, data: string): Promise<DecodedTransactionData> {
    try {
      const transferInterface = new ethers.utils.Interface([
        'function transferFrom(address from, address to, uint256 amount)'
      ]);

      const decoded = transferInterface.decodeFunctionData('transferFrom', data);
      const from = decoded.from;
      const to = decoded.to;
      const amount = decoded.amount;

      // Get token information
      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
      if (!tokenInfo) {
        return {
          type: 'ERC20_TRANSFER',
          description: 'Transfer Unknown Token',
          details: {
            amount: amount.toString(),
            recipient: to
          }
        };
      }

      const formattedAmount = this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals);

      return {
        type: 'ERC20_TRANSFER',
        description: `Transfer ${formattedAmount} ${tokenInfo.symbol}`,
        details: {
          token: tokenInfo,
          amount: amount.toString(),
          formattedAmount: `${formattedAmount} ${tokenInfo.symbol}`,
          recipient: to,
          parameters: [from, to, amount]
        }
      };

    } catch (error) {
      console.error('Error decoding ERC20 transferFrom:', error);
      return {
        type: 'ERC20_TRANSFER',
        description: 'Transfer Token',
        details: {}
      };
    }
  }

  /**
   * Decode ERC-20 approve function call
   */
  private async decodeERC20Approve(tokenAddress: string, data: string): Promise<DecodedTransactionData> {
    try {
      const approveInterface = new ethers.utils.Interface([
        'function approve(address spender, uint256 amount)'
      ]);

      const decoded = approveInterface.decodeFunctionData('approve', data);
      const spender = decoded.spender;
      const amount = decoded.amount;

      // Get token information
      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
      if (!tokenInfo) {
        return {
          type: 'CONTRACT_CALL',
          description: 'Approve Token Spending',
          details: {
            amount: amount.toString(),
            recipient: spender
          }
        };
      }

      const formattedAmount = this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals);

      return {
        type: 'CONTRACT_CALL',
        description: `Approve ${formattedAmount} ${tokenInfo.symbol}`,
        details: {
          token: tokenInfo,
          amount: amount.toString(),
          formattedAmount: `${formattedAmount} ${tokenInfo.symbol}`,
          recipient: spender
        }
      };

    } catch (error) {
      console.error('Error decoding ERC20 approve:', error);
      return {
        type: 'CONTRACT_CALL',
        description: 'Approve Token',
        details: {}
      };
    }
  }

  /**
   * Get a human-readable description of the transaction
   */
  static getTransactionDescription(decodedData: DecodedTransactionData): string {
    return decodedData.description;
  }

  /**
   * Get formatted transaction details for display
   */
  static getFormattedDetails(decodedData: DecodedTransactionData): { [key: string]: string } {
    const details: { [key: string]: string } = {};

    if (decodedData.details.recipient) {
      details['Recipient'] = decodedData.details.recipient;
    }

    if (decodedData.details.formattedAmount) {
      details['Amount'] = decodedData.details.formattedAmount;
    }

    if (decodedData.details.token) {
      details['Token'] = `${decodedData.details.token.name} (${decodedData.details.token.symbol})`;
      details['Token Address'] = decodedData.details.token.address;
    }

    if (decodedData.details.method) {
      details['Method'] = decodedData.details.method;
    }

    return details;
  }
}
