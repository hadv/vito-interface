import { ethers } from 'ethers';
import { createSafeTxPoolService } from './SafeTxPoolService';
import { TokenService } from './TokenService';
import { Asset } from '../components/wallet/types';

export interface TrustedContractInfo {
  address: string;
  name: string;
  dateAdded?: string;
}

export class TrustedContractsAssetService {
  private network: string;
  private provider: ethers.providers.Provider;
  private tokenService: TokenService;

  constructor(network: string, provider: ethers.providers.Provider) {
    this.network = network;
    this.provider = provider;
    this.tokenService = new TokenService(provider, network);
  }

  /**
   * Load trusted contract names from localStorage
   */
  private loadTrustedContractNames(safeAddress: string): Record<string, { name: string; dateAdded: string }> {
    try {
      const storageKey = `trustedContracts_${safeAddress.toLowerCase()}_${this.network}`;
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error loading trusted contract names:', error);
      return {};
    }
  }

  /**
   * Get trusted contracts for a Safe from on-chain data
   */
  private async getTrustedContractsFromChain(safeAddress: string): Promise<string[]> {
    try {
      const safeTxPoolService = createSafeTxPoolService(this.network);
      
      if (!safeTxPoolService.isInitialized()) {
        console.warn('SafeTxPool not configured for network:', this.network);
        return [];
      }

      // Note: Since the smart contract doesn't have a method to get all trusted contracts,
      // we'll need to rely on localStorage for now. In the future, we could:
      // 1. Add an event listener to track TrustedContractAdded/Removed events
      // 2. Add a method to the smart contract to enumerate trusted contracts
      // 3. Use a subgraph to index the events
      
      // For now, we'll verify each stored contract against the chain
      const storedContracts = this.loadTrustedContractNames(safeAddress);
      const verifiedContracts: string[] = [];

      for (const address of Object.keys(storedContracts)) {
        try {
          const isTrusted = await safeTxPoolService.isTrustedContract(safeAddress, address);
          if (isTrusted) {
            verifiedContracts.push(address);
          }
        } catch (error) {
          console.warn(`Failed to verify trusted status for ${address}:`, error);
          // Include anyway - user will see if it's not working when they try to use it
          verifiedContracts.push(address);
        }
      }

      return verifiedContracts;
    } catch (error) {
      console.error('Error getting trusted contracts from chain:', error);
      return [];
    }
  }

  /**
   * Get trusted contracts with their metadata
   */
  async getTrustedContracts(safeAddress: string): Promise<TrustedContractInfo[]> {
    try {
      const trustedAddresses = await this.getTrustedContractsFromChain(safeAddress);
      const storedNames = this.loadTrustedContractNames(safeAddress);

      return trustedAddresses.map(address => ({
        address,
        name: storedNames[address.toLowerCase()]?.name || `Contract ${address.slice(0, 6)}...`,
        dateAdded: storedNames[address.toLowerCase()]?.dateAdded
      }));
    } catch (error) {
      console.error('Error getting trusted contracts:', error);
      return [];
    }
  }

  /**
   * Check if a contract address is an ERC20 token
   */
  private async isERC20Token(contractAddress: string): Promise<boolean> {
    try {
      const contract = new ethers.Contract(contractAddress, [
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)'
      ], this.provider);

      // Try to call ERC20 methods
      await Promise.all([
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ]);

      return true;
    } catch (error) {
      // If any of the ERC20 methods fail, it's probably not an ERC20 token
      return false;
    }
  }

  /**
   * Load assets from trusted contracts (focusing on ERC20 tokens)
   */
  async loadTrustedContractAssets(safeAddress: string): Promise<Asset[]> {
    try {
      console.log('🔍 Loading assets from trusted contracts...');
      
      const trustedContracts = await this.getTrustedContracts(safeAddress);
      console.log(`📋 Found ${trustedContracts.length} trusted contracts`);

      if (trustedContracts.length === 0) {
        return [];
      }

      const assets: Asset[] = [];

      for (const contract of trustedContracts) {
        try {
          // Check if it's an ERC20 token
          const isERC20 = await this.isERC20Token(contract.address);
          
          if (isERC20) {
            console.log(`🪙 Processing ERC20 token: ${contract.name} (${contract.address})`);
            
            // Get token info and balance
            const tokenInfo = await this.tokenService.getTokenInfo(contract.address);
            if (tokenInfo) {
              const balanceString = await this.tokenService.getTokenBalance(contract.address, safeAddress);
              const formattedBalance = ethers.utils.formatUnits(balanceString, tokenInfo.decimals);

              if (balanceString && parseFloat(formattedBalance) > 0) {
                // Mock price calculation (in a real app, you'd fetch from a price API)
                const mockPrice = this.getMockTokenPrice(tokenInfo.symbol);
                const usdValue = parseFloat(formattedBalance) * mockPrice;

                assets.push({
                  symbol: tokenInfo.symbol,
                  name: `${contract.name} (${tokenInfo.name})`, // Include trusted name
                  balance: formattedBalance,
                  value: `$${usdValue.toFixed(2)}`,
                  type: 'erc20',
                  contractAddress: tokenInfo.address,
                  decimals: tokenInfo.decimals,
                  isTrusted: true // Mark as trusted
                });

                console.log(`✅ Added trusted token: ${tokenInfo.symbol} - ${formattedBalance}`);
              } else {
                console.log(`⚠️ Trusted token ${tokenInfo.symbol} has zero balance, skipping`);
              }
            }
          } else {
            console.log(`ℹ️ Contract ${contract.name} is not an ERC20 token, skipping`);
          }
        } catch (error) {
          console.error(`❌ Error processing trusted contract ${contract.address}:`, error);
        }
      }

      console.log(`🎯 Loaded ${assets.length} trusted contract assets`);
      return assets;

    } catch (error) {
      console.error('❌ Error loading trusted contract assets:', error);
      return [];
    }
  }

  /**
   * Mock price data for tokens (in a real app, fetch from CoinGecko, etc.)
   */
  private getMockTokenPrice(symbol: string): number {
    const mockPrices: Record<string, number> = {
      'USDC': 1.00,
      'USDT': 1.00,
      'DAI': 1.00,
      'WETH': 2000,
      'UNI': 9.50,
      'LINK': 15.00,
      'AAVE': 85.00,
      'COMP': 45.00,
      'MKR': 1200,
      'SNX': 2.50,
      'CRV': 0.85,
      'BAL': 4.20,
      'YFI': 8500,
      'SUSHI': 1.10,
      '1INCH': 0.45,
      'GRT': 0.15,
      'ENS': 12.00,
      'LDO': 2.80
    };

    return mockPrices[symbol.toUpperCase()] || 1.00; // Default to $1 if unknown
  }

  /**
   * Combine regular assets with trusted contract assets
   */
  async enhanceAssetsWithTrustedContracts(
    regularAssets: Asset[],
    safeAddress: string
  ): Promise<Asset[]> {
    try {
      const trustedAssets = await this.loadTrustedContractAssets(safeAddress);

      // Merge assets, avoiding duplicates
      const combinedAssets = [...regularAssets];
      const existingAddresses = new Set(
        regularAssets
          .filter(asset => asset.contractAddress)
          .map(asset => asset.contractAddress!.toLowerCase())
      );

      for (const trustedAsset of trustedAssets) {
        if (trustedAsset.contractAddress &&
            !existingAddresses.has(trustedAsset.contractAddress.toLowerCase())) {
          combinedAssets.push(trustedAsset);
        }
      }

      // Sort assets: native first, then by balance value (descending)
      return combinedAssets.sort((a, b) => {
        if (a.type === 'native' && b.type !== 'native') return -1;
        if (a.type !== 'native' && b.type === 'native') return 1;

        const aValue = parseFloat(a.value.replace(/[$,]/g, ''));
        const bValue = parseFloat(b.value.replace(/[$,]/g, ''));
        return bValue - aValue;
      });

    } catch (error) {
      console.error('Error enhancing assets with trusted contracts:', error);
      return regularAssets; // Return original assets if enhancement fails
    }
  }

  /**
   * Refresh trusted contract assets (force reload balances)
   */
  async refreshTrustedContractAssets(safeAddress: string): Promise<Asset[]> {
    try {
      console.log('🔄 Refreshing trusted contract assets...');

      // Clear any cached token information for trusted contracts
      const trustedContracts = await this.getTrustedContracts(safeAddress);

      // Force refresh of token balances by creating a new TokenService instance
      const refreshedTokenService = new TokenService(this.provider, this.network);

      const assets: Asset[] = [];

      for (const contract of trustedContracts) {
        try {
          // Check if it's an ERC20 token
          const isERC20 = await this.isERC20Token(contract.address);

          if (isERC20) {
            console.log(`🔄 Refreshing ERC20 token: ${contract.name} (${contract.address})`);

            // Force refresh token info and balance
            const tokenInfo = await refreshedTokenService.getTokenInfo(contract.address);
            if (tokenInfo) {
              const balanceString = await refreshedTokenService.getTokenBalance(contract.address, safeAddress);
              const formattedBalance = refreshedTokenService.formatTokenAmount(balanceString, tokenInfo.decimals);

              if (balanceString && parseFloat(formattedBalance) > 0) {
                // Mock price calculation (in a real app, you'd fetch from a price API)
                const mockPrice = this.getMockTokenPrice(tokenInfo.symbol);
                const usdValue = parseFloat(formattedBalance) * mockPrice;

                assets.push({
                  symbol: tokenInfo.symbol,
                  name: `${contract.name} (${tokenInfo.name})`, // Include trusted name
                  balance: formattedBalance,
                  value: `$${usdValue.toFixed(2)}`,
                  type: 'erc20',
                  contractAddress: tokenInfo.address,
                  decimals: tokenInfo.decimals,
                  isTrusted: true // Mark as trusted
                });

                console.log(`✅ Refreshed trusted token: ${tokenInfo.symbol} - ${formattedBalance}`);
              } else {
                console.log(`⚠️ Trusted token ${tokenInfo.symbol} has zero balance, skipping`);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Error refreshing trusted contract ${contract.address}:`, error);
        }
      }

      console.log(`🔄 Refreshed ${assets.length} trusted contract assets`);
      return assets;

    } catch (error) {
      console.error('Error refreshing trusted contract assets:', error);
      return [];
    }
  }
}
