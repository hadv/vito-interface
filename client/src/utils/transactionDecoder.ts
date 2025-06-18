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
    parameters?: any[];
  };
}

export class TransactionDecoder {
  private tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
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

        // Generic contract call
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
