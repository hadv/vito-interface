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
    decodedInputs?: {
      name: string;
      type: string;
      value: any;
      rawValue?: any;
      description?: string;
    }[];
    contractName?: string;
    functionSignature?: string;
    stateMutability?: string;
    gasEstimate?: string;
    riskLevel?: string;
    functionType?: string;
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
   * Enhanced contract ABI fetching with multiple strategies
   */
  private async fetchContractABI(contractAddress: string): Promise<ContractInfo | null> {
    // Check cache first
    const cacheKey = `${this.network}-${contractAddress.toLowerCase()}`;
    if (this.abiCache.has(cacheKey)) {
      return this.abiCache.get(cacheKey)!;
    }

    // Try multiple strategies in order
    const strategies = [
      () => this.fetchFromEtherscan(contractAddress),
      () => this.fetchFromProxy(contractAddress),
      () => this.fetchFromAlternativeAPIs(contractAddress)
    ];

    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          // Cache successful result
          this.abiCache.set(cacheKey, result);
          return result;
        }
      } catch (error) {
        // Continue to next strategy
        continue;
      }
    }

    // Cache negative result to avoid repeated failed requests
    this.abiCache.set(cacheKey, null as any);
    return null;
  }

  /**
   * Fetch ABI from Etherscan API
   */
  private async fetchFromEtherscan(contractAddress: string): Promise<ContractInfo | null> {
    try {
      console.log(`🔍 Fetching ABI from Etherscan for ${contractAddress}`);
      const apiUrl = this.getEtherscanApiUrl();
      const url = `${apiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=YourApiKeyToken`;
      console.log('  API URL:', url);

      const response = await fetch(url, {
        timeout: 5000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Vito-Interface/1.0'
        }
      } as any);

      if (!response.ok) {
        console.log(`❌ HTTP error: ${response.status}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const data: EtherscanABIResponse = await response.json();
      console.log('  Etherscan response status:', data.status);
      console.log('  Etherscan response message:', data.message);

      if (data.status === '1' && data.result && Array.isArray(JSON.parse(data.result))) {
        const result = JSON.parse(data.result)[0];
        console.log('  Contract name:', result.ContractName);
        console.log('  ABI available:', result.ABI && result.ABI !== 'Contract source code not verified');

        if (result.ABI && result.ABI !== 'Contract source code not verified') {
          const abi = JSON.parse(result.ABI);
          console.log(`✅ ABI fetched successfully for ${result.ContractName}, ${abi.length} functions`);
          return {
            abi,
            name: result.ContractName || 'Unknown Contract'
          };
        } else {
          console.log('❌ Contract not verified or ABI not available');
        }
      } else {
        console.log('❌ Invalid Etherscan response format');
      }

      return null;
    } catch (error) {
      console.log('❌ Error fetching from Etherscan:', error);
      throw error;
    }
  }

  /**
   * Handle proxy contracts by fetching implementation ABI
   */
  private async fetchFromProxy(contractAddress: string): Promise<ContractInfo | null> {
    try {
      // Common proxy patterns
      const proxyPatterns = [
        '0x5c60da1b', // implementation() - EIP-1967
        '0x4555d5c9', // masterCopy() - Gnosis Safe
        '0x7050c9e0', // target() - Some proxies
      ];

      const provider = new ethers.providers.JsonRpcProvider(this.getRpcUrl());

      for (const methodId of proxyPatterns) {
        try {
          const callData = methodId + '0'.repeat(56); // Pad to 32 bytes
          const result = await provider.call({
            to: contractAddress,
            data: callData
          });

          if (result && result !== '0x' && result.length >= 66) {
            // Extract address from result (last 20 bytes)
            const implementationAddress = '0x' + result.slice(-40);

            if (implementationAddress !== '0x0000000000000000000000000000000000000000') {
              // Recursively fetch ABI from implementation
              const implABI = await this.fetchFromEtherscan(implementationAddress);
              if (implABI) {
                return {
                  ...implABI,
                  name: `${implABI.name} (Proxy)`
                };
              }
            }
          }
        } catch {
          // Continue to next pattern
          continue;
        }
      }

      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Try alternative API sources for ABI
   */
  private async fetchFromAlternativeAPIs(contractAddress: string): Promise<ContractInfo | null> {
    // For now, we could add other sources like:
    // - 4byte.directory for function signatures
    // - Sourcify
    // - Custom ABI databases

    // This would need the actual method ID from transaction data
    // For now, return null and rely on common signatures
    return null;
  }

  /**
   * Get RPC URL for the current network
   */
  private getRpcUrl(): string {
    const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'YOUR_ALCHEMY_KEY';

    switch(this.network.toLowerCase()) {
      case 'arbitrum':
        return 'https://arb1.arbitrum.io/rpc';
      case 'sepolia':
        return ALCHEMY_KEY !== 'YOUR_ALCHEMY_KEY'
          ? `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`
          : 'https://ethereum-sepolia-rpc.publicnode.com';
      case 'ethereum':
      default:
        return ALCHEMY_KEY !== 'YOUR_ALCHEMY_KEY'
          ? `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
          : 'https://ethereum-rpc.publicnode.com';
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
      console.log('🔍 DECODING TRANSACTION:');
      console.log('  to:', to);
      console.log('  value:', value);
      console.log('  data:', data?.slice(0, 50) + '...');

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
        console.log('  methodId:', methodId);

        // Check if this is a Safe execTransaction call first
        if (methodId === '0x6a761202') {
          console.log('🔍 Detected Safe execTransaction, decoding...');
          const safeInnerTx = this.decodeSafeExecTransaction(data);
          if (safeInnerTx) {
            console.log('✅ Safe inner transaction decoded:', safeInnerTx);
            return safeInnerTx;
          }
          console.log('❌ Failed to decode Safe inner transaction');
        }

        // ERC-20 transfer: 0xa9059cbb
        if (methodId === '0xa9059cbb') {
          console.log('🔍 Detected ERC20 transfer');
          return await this.decodeERC20Transfer(to, data);
        }

        // ERC-20 transferFrom: 0x23b872dd
        if (methodId === '0x23b872dd') {
          console.log('🔍 Detected ERC20 transferFrom');
          return await this.decodeERC20TransferFrom(to, data);
        }

        // ERC-20 approve: 0x095ea7b3
        if (methodId === '0x095ea7b3') {
          console.log('🔍 Detected ERC20 approve');
          return await this.decodeERC20Approve(to, data);
        }

        // PRIORITY: Try to decode using contract ABI FIRST
        console.log('🔍 Trying ABI-based decoding for contract:', to);
        const decodedCall = await this.decodeContractCall(to, data);
        if (decodedCall) {
          console.log('✅ ABI-based decoding successful:', decodedCall);
          return decodedCall;
        }
        console.log('❌ ABI-based decoding failed, trying known methods');

        // Try known method IDs as fallback
        const knownMethodResult = this.decodeKnownMethod(methodId, to, data);
        if (knownMethodResult) {
          console.log('✅ Known method decoding successful:', knownMethodResult);
          return knownMethodResult;
        }

        console.log('❌ All decoding methods failed, using basic signature');
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
   * Get contract name and ABI for known contracts
   */
  private getKnownContractInfo(address: string): ContractInfo | null {
    const lowerAddress = address.toLowerCase();
    console.log(`🔍 Checking known contracts for address: ${lowerAddress}`);

    // SafeTxPool contract (unverified on Sepolia but we know the ABI)
    if (lowerAddress === '0x1f738438af91442ffa472d4bd40e13fe0a264db8') {
      console.log('✅ Matched SafeTxPool contract!');
      return {
        name: 'SafeTxPool',
        abi: [
          {
            "type": "function",
            "name": "proposeTx",
            "inputs": [
              {"name": "txHash", "type": "bytes32"},
              {"name": "safe", "type": "address"},
              {"name": "to", "type": "address"},
              {"name": "value", "type": "uint256"},
              {"name": "data", "type": "bytes"},
              {"name": "operation", "type": "uint8"},
              {"name": "nonce", "type": "uint256"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "signTransaction",
            "inputs": [
              {"name": "txHash", "type": "bytes32"},
              {"name": "signature", "type": "bytes"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "addSigner",
            "inputs": [
              {"name": "safe", "type": "address"},
              {"name": "signer", "type": "address"},
              {"name": "txHash", "type": "bytes32"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "removeSigner",
            "inputs": [
              {"name": "safe", "type": "address"},
              {"name": "signer", "type": "address"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "addAddressBookEntry",
            "inputs": [
              {"name": "safe", "type": "address"},
              {"name": "walletAddress", "type": "address"},
              {"name": "amount", "type": "uint256"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "removeAddressBookEntry",
            "inputs": [
              {"name": "safe", "type": "address"},
              {"name": "walletAddress", "type": "address"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "executeTransaction",
            "inputs": [
              {"name": "txHash", "type": "bytes32"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          },
          {
            "type": "function",
            "name": "cancelTransaction",
            "inputs": [
              {"name": "txHash", "type": "bytes32"}
            ],
            "outputs": [],
            "stateMutability": "nonpayable"
          }
        ]
      };
    }

    console.log('❌ No known contract found for this address');
    // Add more known contracts here
    return null;
  }

  /**
   * Get contract name based on address
   */
  private getContractName(address: string): string {
    const contractInfo = this.getKnownContractInfo(address);
    if (contractInfo) {
      return contractInfo.name;
    }

    // Fallback to generic names
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
      console.log(`🔍 Starting contract call decoding for ${contractAddress}`);

      // FIRST: Check if this is a known contract with hardcoded ABI
      console.log('🔍 Step 0: Checking known contracts...');
      const knownContractInfo = this.getKnownContractInfo(contractAddress);
      if (knownContractInfo) {
        console.log(`✅ Found known contract: ${knownContractInfo.name}`);
        const result = await this.decodeWithABI(knownContractInfo, contractAddress, data);
        if (result) {
          console.log('✅ Known contract ABI decoding successful');
          return result;
        }
        console.log('❌ Known contract ABI decoding failed');
      } else {
        console.log('❌ Not a known contract');
      }

      // SECOND: Try to get ABI from Etherscan
      console.log('🔍 Step 1: Trying Etherscan ABI fetching...');
      const contractInfo = await this.fetchContractABI(contractAddress);
      if (contractInfo) {
        console.log(`✅ ABI fetched from Etherscan for ${contractInfo.name}`);
        const result = await this.decodeWithABI(contractInfo, contractAddress, data);
        if (result) {
          console.log('✅ Etherscan ABI-based decoding successful');
          return result;
        }
        console.log('❌ Etherscan ABI-based decoding failed');
      } else {
        console.log('❌ No ABI available from Etherscan');
      }

      // THIRD: Try common function signatures
      console.log('🔍 Step 2: Trying common signatures...');
      const result = await this.decodeWithCommonSignatures(contractAddress, data);
      if (result) {
        console.log('✅ Common signature decoding successful');
        return result;
      }
      console.log('❌ Common signature decoding failed');

      // FOURTH: Try to decode basic function signature
      console.log('🔍 Step 3: Using basic function signature...');
      const basicResult = this.decodeBasicFunctionSignature(contractAddress, data);
      console.log('✅ Basic signature decoding complete');
      return basicResult;

    } catch (error) {
      console.error('❌ Error decoding contract call:', error);
      return this.decodeBasicFunctionSignature(contractAddress, data);
    }
  }

  /**
   * Enhanced ABI-based decoding with detailed analysis
   */
  private async decodeWithABI(contractInfo: ContractInfo, contractAddress: string, data: string): Promise<DecodedTransactionData | null> {
    try {
      console.log(`🔍 Decoding with ABI for ${contractInfo.name}`);
      console.log('  ABI functions available:', contractInfo.abi.map((f: any) => f.name).join(', '));
      const contractInterface = new ethers.utils.Interface(contractInfo.abi);
      const methodId = data.slice(0, 10);
      console.log('  Looking for method ID:', methodId);

      // List all available function selectors for debugging
      const availableSelectors = contractInfo.abi
        .filter((item: any) => item.type === 'function')
        .map((func: any) => {
          try {
            const fragment = contractInterface.getFunction(func.name);
            return `${func.name}: ${fragment.format('sighash')}`;
          } catch {
            return `${func.name}: error`;
          }
        });
      console.log('  Available function selectors:', availableSelectors);

      // Find the function in the ABI
      let functionFragment;
      try {
        functionFragment = contractInterface.getFunction(methodId);
      } catch (error) {
        console.log('❌ Function not found in ABI, error:', error);
        return null;
      }

      if (!functionFragment) {
        console.log('❌ Function fragment is null');
        return null;
      }

      console.log(`✅ Found function: ${functionFragment.name}`);
      console.log('  Function signature:', functionFragment.format());

      // Decode the function call
      const decodedData = contractInterface.decodeFunctionData(functionFragment, data);
      console.log('  Decoded parameters:', decodedData);

      // Enhanced parameter formatting with type-specific handling
      const decodedInputs = functionFragment.inputs.map((input, index) => ({
        name: input.name || `param${index}`,
        type: input.type,
        value: this.formatParameterValue(decodedData[index], input.type),
        rawValue: decodedData[index],
        description: this.getParameterDescription(input.name, input.type, decodedData[index])
      }));

      console.log('  Formatted inputs:', decodedInputs);

      // Analyze function for special behaviors
      const functionAnalysis = this.analyzeFunctionBehavior(functionFragment, decodedInputs, contractInfo);
      console.log('  Function analysis:', functionAnalysis);

      // Create enhanced description with context
      const description = this.createEnhancedMethodDescription(
        functionFragment.name,
        decodedInputs,
        contractInfo.name,
        functionAnalysis
      );

      console.log(`✅ ABI decoding complete: ${description}`);

      return {
        type: 'CONTRACT_CALL',
        description,
        details: {
          method: methodId,
          methodName: functionFragment.name,
          recipient: contractAddress,
          parameters: Array.from(decodedData),
          decodedInputs,
          contractName: contractInfo.name,
          functionSignature: functionFragment.format(),
          stateMutability: functionFragment.stateMutability,
          gasEstimate: functionAnalysis.gasEstimate,
          riskLevel: functionAnalysis.riskLevel,
          functionType: functionAnalysis.functionType
        }
      };

    } catch (error) {
      console.log('❌ Error in ABI decoding:', error);
      return null;
    }
  }

  /**
   * Analyze function behavior for enhanced context
   */
  private analyzeFunctionBehavior(functionFragment: any, decodedInputs: any[], contractInfo: ContractInfo): any {
    const analysis = {
      functionType: 'unknown',
      riskLevel: 'low',
      gasEstimate: 'medium',
      specialBehaviors: [] as string[]
    };

    const funcName = functionFragment.name.toLowerCase();

    // Determine function type
    if (funcName.includes('transfer') || funcName.includes('send')) {
      analysis.functionType = 'transfer';
      analysis.riskLevel = 'medium';
    } else if (funcName.includes('approve') || funcName.includes('allowance')) {
      analysis.functionType = 'approval';
      analysis.riskLevel = 'medium';
    } else if (funcName.includes('swap') || funcName.includes('exchange')) {
      analysis.functionType = 'swap';
      analysis.riskLevel = 'high';
      analysis.gasEstimate = 'high';
    } else if (funcName.includes('stake') || funcName.includes('deposit')) {
      analysis.functionType = 'staking';
      analysis.riskLevel = 'medium';
    } else if (funcName.includes('withdraw') || funcName.includes('claim')) {
      analysis.functionType = 'withdrawal';
      analysis.riskLevel = 'low';
    } else if (funcName.includes('vote') || funcName.includes('propose')) {
      analysis.functionType = 'governance';
      analysis.riskLevel = 'low';
    } else if (functionFragment.stateMutability === 'payable') {
      analysis.riskLevel = 'high';
      analysis.specialBehaviors.push('Accepts ETH');
    }

    // Check for high-value operations
    const hasLargeAmount = decodedInputs.some(input => {
      if (input.type.includes('uint') && input.rawValue) {
        try {
          const value = ethers.BigNumber.from(input.rawValue);
          const ethValue = parseFloat(ethers.utils.formatEther(value));
          return ethValue > 1; // More than 1 ETH equivalent
        } catch {
          return false;
        }
      }
      return false;
    });

    if (hasLargeAmount) {
      analysis.riskLevel = 'high';
      analysis.specialBehaviors.push('High value transaction');
    }

    // Check for array parameters (batch operations)
    const hasBatchOperation = decodedInputs.some(input => input.type.includes('[]'));
    if (hasBatchOperation) {
      analysis.specialBehaviors.push('Batch operation');
      analysis.gasEstimate = 'high';
    }

    return analysis;
  }

  /**
   * Get parameter description based on name and type
   */
  private getParameterDescription(name: string, type: string, value: any): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('amount') || lowerName.includes('value')) {
      if (type.includes('uint')) {
        try {
          const ethValue = ethers.utils.formatEther(value);
          return `Amount: ${ethValue} ETH equivalent`;
        } catch {
          return `Amount: ${value}`;
        }
      }
    }

    if (lowerName.includes('address') || type === 'address') {
      return `Address: ${value}`;
    }

    if (lowerName.includes('deadline') || lowerName.includes('timestamp')) {
      try {
        const date = new Date(parseInt(value) * 1000);
        return `Deadline: ${date.toLocaleString()}`;
      } catch {
        return `Timestamp: ${value}`;
      }
    }

    if (type.includes('[]')) {
      return `Array with ${Array.isArray(value) ? value.length : 0} items`;
    }

    return `${type}: ${value}`;
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

      // Safe wallet management functions
      '0x0d582f13': { signature: 'addOwnerWithThreshold(address,uint256)', name: 'addOwnerWithThreshold', inputs: [{name: 'owner', type: 'address'}, {name: '_threshold', type: 'uint256'}] },
      '0xf8dc5dd9': { signature: 'removeOwner(address,address,uint256)', name: 'removeOwner', inputs: [{name: 'prevOwner', type: 'address'}, {name: 'owner', type: 'address'}, {name: '_threshold', type: 'uint256'}] },
      '0x694e80c3': { signature: 'changeThreshold(uint256)', name: 'changeThreshold', inputs: [{name: '_threshold', type: 'uint256'}] },
      '0x7de7edef': { signature: 'addOwner(address)', name: 'addOwner', inputs: [{name: 'owner', type: 'address'}] },
      '0x468721a7': { signature: 'swapOwner(address,address,address)', name: 'swapOwner', inputs: [{name: 'prevOwner', type: 'address'}, {name: 'oldOwner', type: 'address'}, {name: 'newOwner', type: 'address'}] },

      // SafeTxPool functions
      '0x10ff18f9': { signature: 'proposeTx(bytes32,address,address,uint256,bytes,uint8,uint256)', name: 'proposeTx', inputs: [{name: 'txHash', type: 'bytes32'}, {name: 'safe', type: 'address'}, {name: 'to', type: 'address'}, {name: 'value', type: 'uint256'}, {name: 'data', type: 'bytes'}, {name: 'operation', type: 'uint8'}, {name: 'nonce', type: 'uint256'}] },
      '0x0f1b1cd2': { signature: 'signTransaction(bytes32,bytes)', name: 'signTransaction', inputs: [{name: 'txHash', type: 'bytes32'}, {name: 'signature', type: 'bytes'}] },
      '0x09959f6b': { signature: 'addAddressBookEntry(address,address,uint256)', name: 'addAddressBookEntry', inputs: [{name: 'safe', type: 'address'}, {name: 'walletAddress', type: 'address'}, {name: 'amount', type: 'uint256'}] },
      '0x93271368': { signature: 'removeAddressBookEntry(address,address)', name: 'removeAddressBookEntry', inputs: [{name: 'safe', type: 'address'}, {name: 'walletAddress', type: 'address'}] },
      '0xfab3dfaa': { signature: 'executeTransaction(bytes32)', name: 'executeTransaction', inputs: [{name: 'txHash', type: 'bytes32'}] },
      '0xa4c9b0ca': { signature: 'cancelTransaction(bytes32)', name: 'cancelTransaction', inputs: [{name: 'txHash', type: 'bytes32'}] },

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
   * Create enhanced method description with analysis context
   */
  private createEnhancedMethodDescription(
    methodName: string,
    inputs: any[],
    contractName: string,
    analysis: any
  ): string {
    const baseDescription = this.createMethodDescription(methodName, inputs, contractName);

    // Add risk and type indicators
    const indicators = [];

    if (analysis.riskLevel === 'high') {
      indicators.push('⚠️ High Risk');
    }

    if (analysis.specialBehaviors.length > 0) {
      indicators.push(`(${analysis.specialBehaviors.join(', ')})`);
    }

    if (analysis.functionType !== 'unknown') {
      const typeEmojiMap: { [key: string]: string } = {
        'transfer': '💸',
        'approval': '✅',
        'swap': '🔄',
        'staking': '🔒',
        'withdrawal': '💰',
        'governance': '🗳️'
      };

      const typeEmoji = typeEmojiMap[analysis.functionType] || '';

      if (typeEmoji) {
        return `${typeEmoji} ${baseDescription}${indicators.length > 0 ? ' ' + indicators.join(' ') : ''}`;
      }
    }

    return `${baseDescription}${indicators.length > 0 ? ' ' + indicators.join(' ') : ''}`;
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

      // Safe wallet management functions
      case 'addOwnerWithThreshold':
        if (inputs.length >= 2) {
          const owner = inputs.find(i => i.name === 'owner')?.value;
          const threshold = inputs.find(i => i.name === '_threshold' || i.name === 'threshold')?.value;
          if (owner && threshold) {
            return `🔐 Add Owner ${this.formatAddress(owner)} with threshold ${threshold}`;
          }
        }
        return `🔐 Add Safe Owner with Threshold`;

      case 'removeOwner':
        if (inputs.length >= 3) {
          const owner = inputs.find(i => i.name === 'owner')?.value;
          const threshold = inputs.find(i => i.name === '_threshold' || i.name === 'threshold')?.value;
          if (owner && threshold) {
            return `🗑️ Remove Owner ${this.formatAddress(owner)} with threshold ${threshold}`;
          }
        }
        return `🗑️ Remove Safe Owner`;

      case 'changeThreshold':
        if (inputs.length >= 1) {
          const threshold = inputs.find(i => i.name === '_threshold' || i.name === 'threshold')?.value;
          if (threshold) {
            return `⚙️ Change Safe Threshold to ${threshold}`;
          }
        }
        return `⚙️ Change Safe Threshold`;

      case 'addOwner':
        if (inputs.length >= 1) {
          const owner = inputs.find(i => i.name === 'owner')?.value;
          if (owner) {
            return `➕ Add Safe Owner ${this.formatAddress(owner)}`;
          }
        }
        return `➕ Add Safe Owner`;

      case 'swapOwner':
        if (inputs.length >= 3) {
          const oldOwner = inputs.find(i => i.name === 'oldOwner')?.value;
          const newOwner = inputs.find(i => i.name === 'newOwner')?.value;
          if (oldOwner && newOwner) {
            return `🔄 Replace Owner ${this.formatAddress(oldOwner)} with ${this.formatAddress(newOwner)}`;
          }
        }
        return `🔄 Replace Safe Owner`;

      case 'proposeTx':
      case 'proposeTransaction':
        return `📝 Propose Transaction on ${contractName}`;
      case 'signTransaction':
        return `✍️ Sign Transaction on ${contractName}`;
      case 'executeTransaction':
      case 'execTransaction':
        return `⚡ Execute Transaction on ${contractName}`;
      case 'cancelTransaction':
        return `❌ Cancel Transaction on ${contractName}`;
      case 'addAddressBookEntry':
      case 'addEntry':
        if (inputs.length >= 2) {
          const walletAddress = inputs.find(i => i.name === 'walletAddress' || i.name === 'address')?.value;
          if (walletAddress) {
            return `📇 Add ${this.formatAddress(walletAddress)} to Address Book`;
          }
        }
        return `📇 Add Address Book Entry`;
      case 'removeAddressBookEntry':
      case 'removeEntry':
        if (inputs.length >= 2) {
          const walletAddress = inputs.find(i => i.name === 'walletAddress' || i.name === 'address')?.value;
          if (walletAddress) {
            return `🗑️ Remove ${this.formatAddress(walletAddress)} from Address Book`;
          }
        }
        return `🗑️ Remove Address Book Entry`;
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
