import { ethers } from 'ethers';
import { ERC20_ABI, TOKEN_ADDRESSES } from '../contracts/abis';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export class TokenService {
  private provider: ethers.providers.Provider;
  private network: string;
  private tokenCache: Map<string, TokenInfo> = new Map();

  constructor(provider: ethers.providers.Provider, network: string) {
    this.provider = provider;
    this.network = network;
    this.initializeKnownTokens();
  }

  /**
   * Initialize cache with known tokens for the current network
   */
  private initializeKnownTokens(): void {
    const networkTokens = TOKEN_ADDRESSES[this.network as keyof typeof TOKEN_ADDRESSES];
    if (!networkTokens) return;

    // Add known tokens to cache
    const knownTokens: { [key: string]: Omit<TokenInfo, 'address'> } = {
      USDC: { symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      USDT: { symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      DAI: { symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      WETH: { symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }
    };

    Object.entries(networkTokens).forEach(([symbol, address]) => {
      const tokenInfo = knownTokens[symbol];
      if (tokenInfo) {
        this.tokenCache.set(address.toLowerCase(), {
          address: address.toLowerCase(),
          ...tokenInfo
        });
      }
    });
  }

  /**
   * Get token information by address
   */
  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    const address = tokenAddress.toLowerCase();
    
    // Check cache first
    if (this.tokenCache.has(address)) {
      return this.tokenCache.get(address)!;
    }

    try {
      // Create contract instance
      const contract = new ethers.Contract(address, ERC20_ABI, this.provider);

      // Fetch token metadata
      const [symbol, name, decimals] = await Promise.all([
        contract.symbol(),
        contract.name(),
        contract.decimals()
      ]);

      const tokenInfo: TokenInfo = {
        address,
        symbol,
        name,
        decimals
      };

      // Cache the result
      this.tokenCache.set(address, tokenInfo);
      return tokenInfo;

    } catch (error) {
      console.error(`Error fetching token info for ${address}:`, error);
      return null;
    }
  }

  /**
   * Get native token info (ETH)
   */
  getNativeTokenInfo(): TokenInfo {
    const nativeTokens: { [key: string]: TokenInfo } = {
      ethereum: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
      },
      sepolia: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
      },
      arbitrum: {
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18
      }
    };

    return nativeTokens[this.network] || nativeTokens.ethereum;
  }

  /**
   * Format token amount with proper decimals
   */
  formatTokenAmount(amount: string, decimals: number): string {
    try {
      const value = ethers.BigNumber.from(amount);
      if (value.isZero()) return '0';
      
      const formatted = ethers.utils.formatUnits(value, decimals);
      const num = parseFloat(formatted);
      
      if (num >= 1000) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      } else if (num >= 1) {
        return num.toFixed(4);
      } else {
        return num.toFixed(6);
      }
    } catch {
      return '0';
    }
  }

  /**
   * Check if an address is a token contract
   */
  async isTokenContract(address: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(address, ERC20_ABI, this.provider);
      // Try to call a standard ERC20 function
      await contract.symbol();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear token cache
   */
  clearCache(): void {
    this.tokenCache.clear();
    this.initializeKnownTokens();
  }
}
