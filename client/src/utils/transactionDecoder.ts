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

      // Silent ABI fetching

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
          // ABI fetched successfully
          return contractInfo;
        }
      }

      // Contract not verified or ABI not available
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

        // Check if this is a Safe execTransaction call first
        if (methodId === '0x6a761202') {
          const safeInnerTx = this.decodeSafeExecTransaction(data);
          if (safeInnerTx) {
            return safeInnerTx;
          }
        }

        // ERC-20 transfer: 0xa9059cbb
        if (methodId === '0xa9059cbb') {
          return await this.decodeERC20Transfer(to, data);
        }

        // ERC-20 transferFrom: 0x23b872dd
        if (methodId === '0x23b872dd') {
          return await this.decodeERC20TransferFrom(to, data);
        }

        // ERC-20 approve: 0x095ea7b3
        if (methodId === '0x095ea7b3') {
          return await this.decodeERC20Approve(to, data);
        }

        // Try known method IDs first (fallback for when ABI fetching fails)
        const knownMethodResult = this.decodeKnownMethod(methodId, to, data);
        if (knownMethodResult) {
          return knownMethodResult;
        }

        // Try to decode using contract ABI or common signatures
        const decodedCall = await this.decodeContractCall(to, data);
        if (decodedCall) {
          return decodedCall;
        }

        // This should never happen now since decodeContractCall has fallbacks
        // But keeping as final safety net
        return this.decodeBasicFunctionSignature(to, data);
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
   * Decode Safe execTransaction to extract the inner transaction
   */
  private decodeSafeExecTransaction(data: string): DecodedTransactionData | null {
    try {
      // Safe execTransaction ABI
      const safeInterface = new ethers.utils.Interface([
        'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes memory signatures)'
      ]);

      const decoded = safeInterface.decodeFunctionData('execTransaction', data);
      const innerTo = decoded.to;
      const innerValue = decoded.value;
      const innerData = decoded.data;

      // If there's inner transaction data, decode that with the TARGET CONTRACT (innerTo)
      if (innerData && innerData !== '0x' && innerData.length > 10) {
        const innerMethodId = innerData.slice(0, 10);

        // Decode the inner transaction using the TARGET CONTRACT ADDRESS (innerTo), not the Safe address
        const innerDecoded = this.decodeKnownMethod(innerMethodId, innerTo, innerData);

        if (innerDecoded) {
          // Return the inner transaction details with the target contract
          return innerDecoded;
        }

        // If not a known method, try to decode using the target contract's ABI
        // This would require async call, so for now return generic info with target contract
        return {
          type: 'CONTRACT_CALL',
          description: 'Contract Interaction',
          details: {
            method: innerMethodId,
            methodName: 'Unknown Method',
            recipient: innerTo, // This is the TARGET contract, not the Safe
            contractName: this.getContractName(innerTo)
          }
        };
      }

      // If no inner data or couldn't decode, show ETH transfer to target
      if (innerValue && innerValue.toString() !== '0') {
        const ethAmount = ethers.utils.formatEther(innerValue);
        return {
          type: 'ETH_TRANSFER',
          description: `Send ${ethAmount} ETH`,
          details: {
            amount: innerValue.toString(),
            formattedAmount: `${ethAmount} ETH`,
            recipient: innerTo // This is the TARGET recipient, not the Safe
          }
        };
      }

      // Generic contract interaction with target
      return {
        type: 'CONTRACT_CALL',
        description: 'Contract Interaction',
        details: {
          method: '0x6a761202',
          methodName: 'execTransaction',
          recipient: innerTo // This is the TARGET contract, not the Safe
        }
      };

    } catch (error) {
      // If decoding fails, return null to try other methods
      return null;
    }
  }

  /**
   * Decode SafeTxPool proposeTx to extract the actual target transaction
   */
  private decodeSafeTxPoolProposeTx(data: string): DecodedTransactionData | null {
    try {
      // SafeTxPool proposeTx ABI
      const proposeTxInterface = new ethers.utils.Interface([
        'function proposeTx(bytes32 txHash, address safe, address to, uint256 value, bytes calldata data, uint8 operation, uint256 nonce)'
      ]);

      const decoded = proposeTxInterface.decodeFunctionData('proposeTx', data);
      const targetTo = decoded.to;
      const targetValue = decoded.value;
      const targetData = decoded.data;

      // If there's target transaction data, decode that
      if (targetData && targetData !== '0x' && targetData.length > 10) {
        const targetMethodId = targetData.slice(0, 10);

        // Decode the target transaction using the actual target contract
        const targetDecoded = this.decodeKnownMethod(targetMethodId, targetTo, targetData);

        if (targetDecoded) {
          return targetDecoded;
        }

        // If not a known method, return generic info with target contract
        return {
          type: 'CONTRACT_CALL',
          description: 'Contract Interaction',
          details: {
            method: targetMethodId,
            methodName: 'Unknown Method',
            recipient: targetTo,
            contractName: this.getContractName(targetTo)
          }
        };
      }

      // If no target data, show ETH transfer to target
      if (targetValue && targetValue.toString() !== '0') {
        const ethAmount = ethers.utils.formatEther(targetValue);
        return {
          type: 'ETH_TRANSFER',
          description: `Send ${ethAmount} ETH`,
          details: {
            amount: targetValue.toString(),
            formattedAmount: `${ethAmount} ETH`,
            recipient: targetTo
          }
        };
      }

      // Generic target interaction
      return {
        type: 'CONTRACT_CALL',
        description: 'Contract Interaction',
        details: {
          method: '0x10ff18f9',
          methodName: 'proposeTx',
          recipient: targetTo
        }
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Decode known method IDs without requiring ABI
   */
  private decodeKnownMethod(methodId: string, contractAddress: string, data: string): DecodedTransactionData | null {
    // Check if this is SafeTxPool proposeTx
    if (methodId === '0x10ff18f9') {
      const proposeTxDecoded = this.decodeSafeTxPoolProposeTx(data);
      if (proposeTxDecoded) {
        return proposeTxDecoded;
      }
    }

    // Known method IDs for other contracts
    const knownMethods: { [key: string]: { name: string; description: string } } = {
      '0x09959f6b': {
        name: 'signTransaction',
        description: 'Sign Transaction on SafeTxPool'
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
   * Decode contract call using fetched ABI or fallback methods
   */
  private async decodeContractCall(contractAddress: string, data: string): Promise<DecodedTransactionData | null> {
    try {
      // First try to get ABI from Etherscan
      const contractInfo = await this.fetchContractABI(contractAddress);
      if (contractInfo) {
        const result = await this.decodeWithABI(contractInfo, contractAddress, data);
        if (result) return result;
      }

      // If ABI fetching fails, try common function signatures
      const result = await this.decodeWithCommonSignatures(contractAddress, data);
      if (result) return result;

      // If all else fails, try to decode basic function signature
      return this.decodeBasicFunctionSignature(contractAddress, data);

    } catch (error) {
      console.error('Error decoding contract call:', error);
      return this.decodeBasicFunctionSignature(contractAddress, data);
    }
  }

  /**
   * Decode using contract ABI
   */
  private async decodeWithABI(contractInfo: ContractInfo, contractAddress: string, data: string): Promise<DecodedTransactionData | null> {
    try {
      const contractInterface = new ethers.utils.Interface(contractInfo.abi);
      const methodId = data.slice(0, 10);

      // Find the function in the ABI
      const functionFragment = contractInterface.getFunction(methodId);
      if (!functionFragment) {
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
      return null;
    }
  }

  /**
   * Decode using common function signatures database
   */
  private async decodeWithCommonSignatures(contractAddress: string, data: string): Promise<DecodedTransactionData | null> {
    const methodId = data.slice(0, 10);

    // Expanded database of common function signatures
    const commonSignatures: { [key: string]: { signature: string; name: string; inputs: Array<{name: string, type: string}> } } = {
      // ERC20 functions
      '0xa9059cbb': { signature: 'transfer(address,uint256)', name: 'transfer', inputs: [{name: 'to', type: 'address'}, {name: 'amount', type: 'uint256'}] },
      '0x23b872dd': { signature: 'transferFrom(address,address,uint256)', name: 'transferFrom', inputs: [{name: 'from', type: 'address'}, {name: 'to', type: 'address'}, {name: 'amount', type: 'uint256'}] },
      '0x095ea7b3': { signature: 'approve(address,uint256)', name: 'approve', inputs: [{name: 'spender', type: 'address'}, {name: 'amount', type: 'uint256'}] },

      // Common DeFi functions
      '0x38ed1739': { signature: 'swapExactTokensForTokens(uint256,uint256,address[],address,uint256)', name: 'swapExactTokensForTokens', inputs: [{name: 'amountIn', type: 'uint256'}, {name: 'amountOutMin', type: 'uint256'}, {name: 'path', type: 'address[]'}, {name: 'to', type: 'address'}, {name: 'deadline', type: 'uint256'}] },
      '0x7ff36ab5': { signature: 'swapExactETHForTokens(uint256,address[],address,uint256)', name: 'swapExactETHForTokens', inputs: [{name: 'amountOutMin', type: 'uint256'}, {name: 'path', type: 'address[]'}, {name: 'to', type: 'address'}, {name: 'deadline', type: 'uint256'}] },
      '0x18cbafe5': { signature: 'swapExactTokensForETH(uint256,uint256,address[],address,uint256)', name: 'swapExactTokensForETH', inputs: [{name: 'amountIn', type: 'uint256'}, {name: 'amountOutMin', type: 'uint256'}, {name: 'path', type: 'address[]'}, {name: 'to', type: 'address'}, {name: 'deadline', type: 'uint256'}] },

      // Staking functions
      '0xa694fc3a': { signature: 'stake(uint256)', name: 'stake', inputs: [{name: 'amount', type: 'uint256'}] },
      '0x2e1a7d4d': { signature: 'withdraw(uint256)', name: 'withdraw', inputs: [{name: 'amount', type: 'uint256'}] },
      '0x3d18b912': { signature: 'getReward()', name: 'getReward', inputs: [] },

      // NFT functions
      '0x42842e0e': { signature: 'safeTransferFrom(address,address,uint256)', name: 'safeTransferFrom', inputs: [{name: 'from', type: 'address'}, {name: 'to', type: 'address'}, {name: 'tokenId', type: 'uint256'}] },
      '0xb88d4fde': { signature: 'safeTransferFrom(address,address,uint256,bytes)', name: 'safeTransferFrom', inputs: [{name: 'from', type: 'address'}, {name: 'to', type: 'address'}, {name: 'tokenId', type: 'uint256'}, {name: 'data', type: 'bytes'}] },

      // Governance functions
      '0x15373e3d': { signature: 'vote(uint256,bool)', name: 'vote', inputs: [{name: 'proposalId', type: 'uint256'}, {name: 'support', type: 'bool'}] },
      '0x56781388': { signature: 'castVote(uint256,uint8)', name: 'castVote', inputs: [{name: 'proposalId', type: 'uint256'}, {name: 'support', type: 'uint8'}] },

      // Safe functions
      '0x6a761202': { signature: 'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)', name: 'execTransaction', inputs: [{name: 'to', type: 'address'}, {name: 'value', type: 'uint256'}, {name: 'data', type: 'bytes'}, {name: 'operation', type: 'uint8'}, {name: 'safeTxGas', type: 'uint256'}, {name: 'baseGas', type: 'uint256'}, {name: 'gasPrice', type: 'uint256'}, {name: 'gasToken', type: 'address'}, {name: 'refundReceiver', type: 'address'}, {name: 'signatures', type: 'bytes'}] },

      // Common utility functions
      '0x70a08231': { signature: 'balanceOf(address)', name: 'balanceOf', inputs: [{name: 'owner', type: 'address'}] },
      '0xdd62ed3e': { signature: 'allowance(address,address)', name: 'allowance', inputs: [{name: 'owner', type: 'address'}, {name: 'spender', type: 'address'}] },
      '0x18160ddd': { signature: 'totalSupply()', name: 'totalSupply', inputs: [] },
    };

    const functionInfo = commonSignatures[methodId];
    if (!functionInfo) {
      return null;
    }

    try {
      // Create interface from signature
      const iface = new ethers.utils.Interface([`function ${functionInfo.signature}`]);
      const decodedData = iface.decodeFunctionData(functionInfo.name, data);

      // Format the decoded inputs
      const decodedInputs = functionInfo.inputs.map((input, index) => ({
        name: input.name,
        type: input.type,
        value: this.formatParameterValue(decodedData[index], input.type)
      }));

      // Create description based on function type
      const description = this.createMethodDescription(functionInfo.name, decodedInputs, this.getContractName(contractAddress));

      return {
        type: 'CONTRACT_CALL',
        description,
        details: {
          method: methodId,
          methodName: functionInfo.name,
          recipient: contractAddress,
          parameters: Array.from(decodedData),
          decodedInputs,
          contractName: this.getContractName(contractAddress)
        }
      };

    } catch (error) {
      return null;
    }
  }

  /**
   * Decode basic function signature when all else fails
   */
  private decodeBasicFunctionSignature(contractAddress: string, data: string): DecodedTransactionData {
    const methodId = data.slice(0, 10);

    // Try to extract basic parameter information from the data
    const paramData = data.slice(10);
    const paramCount = Math.floor(paramData.length / 64);

    const decodedInputs: Array<{name: string, type: string, value: string}> = [];

    // Extract parameters as raw hex chunks
    for (let i = 0; i < Math.min(paramCount, 10); i++) { // Limit to 10 parameters for display
      const paramHex = paramData.slice(i * 64, (i + 1) * 64);
      if (paramHex.length === 64) {
        // Try to determine parameter type based on content
        const paramType = this.guessParameterType(paramHex);
        const paramValue = this.formatRawParameter(paramHex, paramType);

        decodedInputs.push({
          name: `param${i}`,
          type: paramType,
          value: paramValue
        });
      }
    }

    return {
      type: 'CONTRACT_CALL',
      description: `Function Call (${methodId})`,
      details: {
        method: methodId,
        methodName: `Unknown Function`,
        recipient: contractAddress,
        decodedInputs,
        contractName: this.getContractName(contractAddress)
      }
    };
  }

  /**
   * Guess parameter type from hex data
   */
  private guessParameterType(hexData: string): string {
    // Remove leading zeros
    const trimmed = hexData.replace(/^0+/, '');

    // If it's 40 characters (20 bytes), likely an address
    if (trimmed.length === 40) {
      return 'address';
    }

    // If it's all zeros except last few bytes, likely a small uint
    if (hexData.match(/^0{56}[0-9a-f]{8}$/)) {
      return 'uint32';
    }

    // If it's a large number, likely uint256
    if (trimmed.length > 0 && trimmed.length <= 64) {
      return 'uint256';
    }

    // Default to bytes32
    return 'bytes32';
  }

  /**
   * Format raw parameter based on guessed type
   */
  private formatRawParameter(hexData: string, type: string): string {
    try {
      if (type === 'address') {
        const trimmed = hexData.replace(/^0+/, '');
        if (trimmed.length === 40) {
          return `0x${trimmed}`;
        }
      }

      if (type.includes('uint')) {
        const value = ethers.BigNumber.from(`0x${hexData}`);
        return value.toString();
      }

      // Default to hex representation
      return `0x${hexData}`;
    } catch {
      return `0x${hexData}`;
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
    // Special handling for common method patterns with parameter context
    switch (methodName) {
      case 'transfer':
        if (inputs.length >= 2) {
          const amount = inputs.find(i => i.name === 'amount' || i.name === 'value')?.value;
          const to = inputs.find(i => i.name === 'to' || i.name === 'recipient')?.value;
          if (amount && to) {
            return `Transfer ${this.formatDisplayAmount(amount)} to ${this.formatAddress(to)}`;
          }
        }
        return `Transfer Tokens`;

      case 'transferFrom':
        if (inputs.length >= 3) {
          const amount = inputs.find(i => i.name === 'amount' || i.name === 'value')?.value;
          const from = inputs.find(i => i.name === 'from')?.value;
          const to = inputs.find(i => i.name === 'to')?.value;
          if (amount && from && to) {
            return `Transfer ${this.formatDisplayAmount(amount)} from ${this.formatAddress(from)} to ${this.formatAddress(to)}`;
          }
        }
        return `Transfer Tokens`;

      case 'approve':
        if (inputs.length >= 2) {
          const amount = inputs.find(i => i.name === 'amount' || i.name === 'value')?.value;
          const spender = inputs.find(i => i.name === 'spender')?.value;
          if (amount && spender) {
            return `Approve ${this.formatDisplayAmount(amount)} for ${this.formatAddress(spender)}`;
          }
        }
        return `Approve Token Spending`;

      case 'swapExactTokensForTokens':
        if (inputs.length >= 2) {
          const amountIn = inputs.find(i => i.name === 'amountIn')?.value;
          const amountOutMin = inputs.find(i => i.name === 'amountOutMin')?.value;
          if (amountIn && amountOutMin) {
            return `Swap ${this.formatDisplayAmount(amountIn)} tokens (min ${this.formatDisplayAmount(amountOutMin)} out)`;
          }
        }
        return `Swap Tokens`;

      case 'swapExactETHForTokens':
        if (inputs.length >= 1) {
          const amountOutMin = inputs.find(i => i.name === 'amountOutMin')?.value;
          if (amountOutMin) {
            return `Swap ETH for tokens (min ${this.formatDisplayAmount(amountOutMin)} out)`;
          }
        }
        return `Swap ETH for Tokens`;

      case 'swapExactTokensForETH':
        if (inputs.length >= 2) {
          const amountIn = inputs.find(i => i.name === 'amountIn')?.value;
          const amountOutMin = inputs.find(i => i.name === 'amountOutMin')?.value;
          if (amountIn && amountOutMin) {
            return `Swap ${this.formatDisplayAmount(amountIn)} tokens for ETH (min ${this.formatDisplayAmount(amountOutMin)})`;
          }
        }
        return `Swap Tokens for ETH`;

      case 'stake':
        if (inputs.length >= 1) {
          const amount = inputs.find(i => i.name === 'amount')?.value;
          if (amount) {
            return `Stake ${this.formatDisplayAmount(amount)} tokens`;
          }
        }
        return `Stake Tokens`;

      case 'withdraw':
        if (inputs.length >= 1) {
          const amount = inputs.find(i => i.name === 'amount')?.value;
          if (amount) {
            return `Withdraw ${this.formatDisplayAmount(amount)} tokens`;
          }
        }
        return `Withdraw Tokens`;

      case 'vote':
      case 'castVote':
        if (inputs.length >= 1) {
          const proposalId = inputs.find(i => i.name === 'proposalId')?.value;
          const support = inputs.find(i => i.name === 'support')?.value;
          if (proposalId) {
            const supportText = support === 'true' || support === '1' ? 'FOR' : support === 'false' || support === '0' ? 'AGAINST' : 'ABSTAIN';
            return `Vote ${supportText} on Proposal #${proposalId}`;
          }
        }
        return `Cast Vote`;

      case 'safeTransferFrom':
        if (inputs.length >= 3) {
          const tokenId = inputs.find(i => i.name === 'tokenId')?.value;
          const from = inputs.find(i => i.name === 'from')?.value;
          const to = inputs.find(i => i.name === 'to')?.value;
          if (tokenId && from && to) {
            return `Transfer NFT #${tokenId} from ${this.formatAddress(from)} to ${this.formatAddress(to)}`;
          }
        }
        return `Transfer NFT`;

      case 'proposeTransaction':
        return `Propose Transaction on ${contractName}`;
      case 'signTransaction':
        return `Sign Transaction on ${contractName}`;
      case 'executeTransaction':
      case 'execTransaction':
        return `Execute Transaction on ${contractName}`;
      case 'addEntry':
        return `Add Address Book Entry`;
      case 'removeEntry':
        return `Remove Address Book Entry`;
      case 'mint':
        return `Mint Tokens`;
      case 'burn':
        return `Burn Tokens`;
      case 'getReward':
        return `Claim Rewards`;
      case 'balanceOf':
        return `Check Balance`;
      case 'allowance':
        return `Check Allowance`;
      case 'totalSupply':
        return `Check Total Supply`;
      default:
        // Generic description with method name
        const formattedMethod = methodName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${formattedMethod} on ${contractName}`;
    }
  }

  /**
   * Format amount for display (truncate very large numbers)
   */
  private formatDisplayAmount(amount: string): string {
    try {
      const num = ethers.BigNumber.from(amount);
      if (num.isZero()) return '0';

      // For very large numbers, show in scientific notation or truncated form
      const str = num.toString();
      if (str.length > 10) {
        const formatted = ethers.utils.formatEther(num);
        const floatVal = parseFloat(formatted);
        if (floatVal >= 1000000) {
          return `${(floatVal / 1000000).toFixed(2)}M`;
        } else if (floatVal >= 1000) {
          return `${(floatVal / 1000).toFixed(2)}K`;
        } else if (floatVal >= 1) {
          return floatVal.toFixed(4);
        } else {
          return floatVal.toFixed(6);
        }
      }
      return str;
    } catch {
      return amount;
    }
  }

  /**
   * Format address for display
   */
  private formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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
