import { ethers } from 'ethers';
import { TokenService } from '../services/TokenService';
import { TokenTransferInfo } from '../components/wallet/types';

export interface ParsedTransfer {
  tokenAddress: string;
  from: string;
  to: string;
  amount: string;
  isNative: boolean;
}

export class TokenTransferParser {
  private tokenService: TokenService;

  constructor(tokenService: TokenService) {
    this.tokenService = tokenService;
  }

  /**
   * Parse token transfer information from transaction data
   */
  async parseTokenTransfer(
    transaction: any,
    safeAddress: string
  ): Promise<TokenTransferInfo | null> {
    try {
      // Check for native ETH transfer
      const value = ethers.BigNumber.from(transaction.value || transaction.amount || '0');
      if (!value.isZero() && (!transaction.data || transaction.data === '0x')) {
        return await this.parseNativeTransfer(transaction, safeAddress, value);
      }

      // Check for ERC20 transfer in transaction data
      if (transaction.data && transaction.data.length > 10) {
        const methodId = transaction.data.slice(0, 10);
        
        // ERC20 transfer method: 0xa9059cbb
        if (methodId === '0xa9059cbb') {
          return await this.parseERC20Transfer(transaction, safeAddress);
        }
        
        // ERC20 transferFrom method: 0x23b872dd
        if (methodId === '0x23b872dd') {
          return await this.parseERC20TransferFrom(transaction, safeAddress);
        }
      }

      // Check transaction logs for Transfer events
      if (transaction.logs && transaction.logs.length > 0) {
        return await this.parseTransferFromLogs(transaction, safeAddress);
      }

      return null;
    } catch (error) {
      console.error('Error parsing token transfer:', error);
      return null;
    }
  }

  /**
   * Parse native ETH transfer
   */
  private async parseNativeTransfer(
    transaction: any,
    safeAddress: string,
    value: ethers.BigNumber
  ): Promise<TokenTransferInfo> {
    const nativeToken = this.tokenService.getNativeTokenInfo();
    const isIncoming = transaction.to.toLowerCase() === safeAddress.toLowerCase();
    
    return {
      tokenAddress: nativeToken.address,
      tokenSymbol: nativeToken.symbol,
      tokenName: nativeToken.name,
      tokenDecimals: nativeToken.decimals,
      amount: value.toString(),
      formattedAmount: this.tokenService.formatTokenAmount(value.toString(), nativeToken.decimals),
      direction: isIncoming ? 'in' : 'out',
      isNative: true
    };
  }

  /**
   * Parse ERC20 transfer function call
   */
  private async parseERC20Transfer(
    transaction: any,
    safeAddress: string
  ): Promise<TokenTransferInfo | null> {
    try {
      const transferInterface = new ethers.utils.Interface([
        'function transfer(address to, uint256 amount)'
      ]);

      const decoded = transferInterface.decodeFunctionData('transfer', transaction.data);
      const tokenAddress = transaction.to;
      const to = decoded.to;
      const amount = decoded.amount;

      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
      if (!tokenInfo) return null;

      const isIncoming = to.toLowerCase() === safeAddress.toLowerCase();

      return {
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        tokenDecimals: tokenInfo.decimals,
        amount: amount.toString(),
        formattedAmount: this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals),
        direction: isIncoming ? 'in' : 'out',
        isNative: false
      };
    } catch (error) {
      console.error('Error parsing ERC20 transfer:', error);
      return null;
    }
  }

  /**
   * Parse ERC20 transferFrom function call
   */
  private async parseERC20TransferFrom(
    transaction: any,
    safeAddress: string
  ): Promise<TokenTransferInfo | null> {
    try {
      const transferInterface = new ethers.utils.Interface([
        'function transferFrom(address from, address to, uint256 amount)'
      ]);

      const decoded = transferInterface.decodeFunctionData('transferFrom', transaction.data);
      const tokenAddress = transaction.to;
      const from = decoded.from;
      const to = decoded.to;
      const amount = decoded.amount;

      const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
      if (!tokenInfo) return null;

      const isIncoming = to.toLowerCase() === safeAddress.toLowerCase();
      const isOutgoing = from.toLowerCase() === safeAddress.toLowerCase();

      return {
        tokenAddress: tokenInfo.address,
        tokenSymbol: tokenInfo.symbol,
        tokenName: tokenInfo.name,
        tokenDecimals: tokenInfo.decimals,
        amount: amount.toString(),
        formattedAmount: this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals),
        direction: isIncoming ? 'in' : (isOutgoing ? 'out' : 'out'),
        isNative: false
      };
    } catch (error) {
      console.error('Error parsing ERC20 transferFrom:', error);
      return null;
    }
  }

  /**
   * Parse Transfer events from transaction logs
   */
  private async parseTransferFromLogs(
    transaction: any,
    safeAddress: string
  ): Promise<TokenTransferInfo | null> {
    try {
      // ERC20 Transfer event signature: Transfer(address,address,uint256)
      const transferEventTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
      
      for (const log of transaction.logs) {
        if (log.topics && log.topics[0] === transferEventTopic && log.topics.length >= 3) {
          const tokenAddress = log.address;
          const from = ethers.utils.getAddress('0x' + log.topics[1].slice(26));
          const to = ethers.utils.getAddress('0x' + log.topics[2].slice(26));
          const amount = ethers.BigNumber.from(log.data);

          // Check if this transfer involves the safe address
          const isIncoming = to.toLowerCase() === safeAddress.toLowerCase();
          const isOutgoing = from.toLowerCase() === safeAddress.toLowerCase();
          
          if (isIncoming || isOutgoing) {
            const tokenInfo = await this.tokenService.getTokenInfo(tokenAddress);
            if (!tokenInfo) continue;

            return {
              tokenAddress: tokenInfo.address,
              tokenSymbol: tokenInfo.symbol,
              tokenName: tokenInfo.name,
              tokenDecimals: tokenInfo.decimals,
              amount: amount.toString(),
              formattedAmount: this.tokenService.formatTokenAmount(amount.toString(), tokenInfo.decimals),
              direction: isIncoming ? 'in' : 'out',
              isNative: false
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error parsing transfer from logs:', error);
      return null;
    }
  }
}
