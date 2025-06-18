import { ethers } from 'ethers';
import { ERC20_ABI, TOKEN_ADDRESSES } from '../contracts/abis';

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string; // Optional balance for display
}

export interface TokenBalance {
  tokenInfo: TokenInfo;
  balance: string;
  formattedBalance: string;
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
    if (networkTokens) {
      // Pre-populate cache with known token addresses
      Object.entries(networkTokens).forEach(([symbol, address]) => {
        // We'll fetch full token info when needed
        this.tokenCache.set(address.toLowerCase(), {
          address: address.toLowerCase(),
          symbol,
          name: symbol, // Will be updated when full info is fetched
          decimals: 18 // Default, will be updated when full info is fetched
        });
      });
    }
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
   * Get token balance for a specific address
   */
  async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    try {
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
      const balance = await contract.balanceOf(walletAddress);
      return balance.toString();
    } catch (error) {
      console.error(`Error fetching token balance for ${tokenAddress}:`, error);
      return '0';
    }
  }

  /**
   * Get formatted token balance with proper decimals
   */
  async getFormattedTokenBalance(tokenAddress: string, walletAddress: string): Promise<TokenBalance | null> {
    try {
      const tokenInfo = await this.getTokenInfo(tokenAddress);
      if (!tokenInfo) return null;

      const balance = await this.getTokenBalance(tokenAddress, walletAddress);
      const formattedBalance = this.formatTokenAmount(balance, tokenInfo.decimals);

      return {
        tokenInfo,
        balance,
        formattedBalance
      };
    } catch (error) {
      console.error(`Error getting formatted token balance:`, error);
      return null;
    }
  }

  /**
   * Get known tokens for the current network
   */
  getKnownTokens(): TokenInfo[] {
    const networkTokens = TOKEN_ADDRESSES[this.network as keyof typeof TOKEN_ADDRESSES];
    if (!networkTokens) return [];

    return Object.entries(networkTokens).map(([symbol, address]) => ({
      address: address.toLowerCase(),
      symbol,
      name: symbol,
      decimals: 18 // Default, will be updated when full info is fetched
    }));
  }

  /**
   * Get popular tokens with balances for a wallet
   */
  async getTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    const knownTokens = this.getKnownTokens();
    const balances: TokenBalance[] = [];

    for (const token of knownTokens) {
      try {
        const balance = await this.getFormattedTokenBalance(token.address, walletAddress);
        if (balance && parseFloat(balance.formattedBalance) > 0) {
          balances.push(balance);
        }
      } catch (error) {
        console.error(`Error fetching balance for ${token.symbol}:`, error);
      }
    }

    return balances;
  }

  /**
   * Get additional popular token addresses for the current network
   * This includes tokens that might not be in TOKEN_ADDRESSES but are commonly used
   */
  getPopularTokenAddresses(): string[] {
    const popularTokens: { [network: string]: string[] } = {
      ethereum: [
        '0xA0b86a33E6441b8C4505B4afDcA7aBB2B6e1B4B4', // USDC
        '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
        '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
        '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', // WBTC
        '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
        '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', // UNI
        '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', // AAVE
        '0x514910771AF9Ca656af840dff83E8264EcF986CA', // LINK
      ],
      sepolia: [
        '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // USDC (testnet)
        '0x779877A7B0D9E8603169DdbD7836e478b4624789', // LINK (testnet)
      ],
      polygon: [
        '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC
        '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', // DAI
        '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT
        '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', // WBTC
        '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', // WETH
      ],
      arbitrum: [
        '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // USDC
        '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', // DAI
        '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT
        '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', // WBTC
        '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // WETH
      ]
    };

    return popularTokens[this.network] || [];
  }

  /**
   * Get all tokens (known + popular) with balances for a wallet
   */
  async getAllTokenBalances(walletAddress: string): Promise<TokenBalance[]> {
    const knownTokens = this.getKnownTokens();
    const popularAddresses = this.getPopularTokenAddresses();

    // Combine known tokens with popular token addresses
    const allTokenAddresses = Array.from(new Set([
      ...knownTokens.map(t => t.address.toLowerCase()),
      ...popularAddresses.map(addr => addr.toLowerCase())
    ]));

    const balances: TokenBalance[] = [];

    for (const address of allTokenAddresses) {
      try {
        console.log(`🔍 Checking token balance for ${address}...`);
        const balance = await this.getFormattedTokenBalance(address, walletAddress);
        if (balance && parseFloat(balance.formattedBalance) > 0) {
          console.log(`✅ Found balance: ${balance.formattedBalance} ${balance.tokenInfo.symbol}`);
          balances.push(balance);
        } else {
          console.log(`⚪ Zero balance for token at ${address}`);
        }
      } catch (error) {
        console.warn(`❌ Error fetching balance for token ${address}:`, error);
      }
    }

    return balances;
  }

  /**
   * Validate if an address is a valid ERC-20 token
   */
  async validateTokenAddress(address: string): Promise<boolean> {
    try {
      if (!ethers.utils.isAddress(address)) {
        return false;
      }

      const tokenInfo = await this.getTokenInfo(address);
      return tokenInfo !== null;
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
