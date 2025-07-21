/**
 * RPC Configuration Service
 * 
 * Manages custom RPC URLs for different networks with localStorage persistence.
 * Provides fallback to default RPC URLs when custom URLs are not configured.
 */

import { getRpcUrl as getDefaultRpcUrl } from '../contracts/abis';

export interface NetworkRpcConfig {
  ethereum: string;
  sepolia: string;
  arbitrum: string;
}

export interface RpcValidationResult {
  isValid: boolean;
  error?: string;
  chainId?: number;
  blockNumber?: number;
}

class RpcConfigService {
  private static instance: RpcConfigService;
  private readonly STORAGE_KEY = 'vito_custom_rpc_urls';
  private customRpcUrls: Partial<NetworkRpcConfig> = {};

  private constructor() {
    this.loadFromStorage();
  }

  public static getInstance(): RpcConfigService {
    if (!RpcConfigService.instance) {
      RpcConfigService.instance = new RpcConfigService();
    }
    return RpcConfigService.instance;
  }

  /**
   * Load custom RPC URLs from localStorage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.customRpcUrls = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load custom RPC URLs from storage:', error);
      this.customRpcUrls = {};
    }
  }

  /**
   * Save custom RPC URLs to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.customRpcUrls));
    } catch (error) {
      console.error('Failed to save custom RPC URLs to storage:', error);
    }
  }

  /**
   * Get RPC URL for a network (custom or default)
   */
  public getRpcUrl(network: string): string {
    const customUrl = this.customRpcUrls[network as keyof NetworkRpcConfig];
    if (customUrl && this.isValidUrl(customUrl)) {
      return customUrl;
    }
    return getDefaultRpcUrl(network);
  }

  /**
   * Set custom RPC URL for a network
   */
  public setCustomRpcUrl(network: keyof NetworkRpcConfig, url: string): void {
    if (!url.trim()) {
      // Remove custom URL if empty
      delete this.customRpcUrls[network];
    } else {
      this.customRpcUrls[network] = url.trim();
    }
    this.saveToStorage();
  }

  /**
   * Get custom RPC URL for a network (returns null if not set)
   */
  public getCustomRpcUrl(network: keyof NetworkRpcConfig): string | null {
    return this.customRpcUrls[network] || null;
  }

  /**
   * Check if a network has a custom RPC URL configured
   */
  public hasCustomRpcUrl(network: keyof NetworkRpcConfig): boolean {
    return Boolean(this.customRpcUrls[network]);
  }

  /**
   * Get all custom RPC URLs
   */
  public getAllCustomRpcUrls(): Partial<NetworkRpcConfig> {
    return { ...this.customRpcUrls };
  }

  /**
   * Reset custom RPC URL for a network to default
   */
  public resetToDefault(network: keyof NetworkRpcConfig): void {
    delete this.customRpcUrls[network];
    this.saveToStorage();
  }

  /**
   * Reset all custom RPC URLs to defaults
   */
  public resetAllToDefaults(): void {
    this.customRpcUrls = {};
    this.saveToStorage();
  }

  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Validate RPC URL by making a test request
   */
  public async validateRpcUrl(url: string): Promise<RpcValidationResult> {
    if (!this.isValidUrl(url)) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      if (!response.ok) {
        return {
          isValid: false,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      
      if (data.error) {
        return {
          isValid: false,
          error: data.error.message || 'RPC error'
        };
      }

      const blockNumber = parseInt(data.result, 16);
      
      // Also get chain ID
      const chainResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 2
        })
      });

      let chainId: number | undefined;
      if (chainResponse.ok) {
        const chainData = await chainResponse.json();
        if (!chainData.error) {
          chainId = parseInt(chainData.result, 16);
        }
      }

      return {
        isValid: true,
        blockNumber,
        chainId
      };

    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Get expected chain ID for a network
   */
  public getExpectedChainId(network: string): number {
    switch (network.toLowerCase()) {
      case 'ethereum':
        return 1;
      case 'sepolia':
        return 11155111;
      case 'arbitrum':
        return 42161;
      default:
        return 1;
    }
  }

  /**
   * Get network name from chain ID
   */
  public getNetworkFromChainId(chainId: number): string | null {
    switch (chainId) {
      case 1:
        return 'ethereum';
      case 11155111:
        return 'sepolia';
      case 42161:
        return 'arbitrum';
      default:
        return null;
    }
  }
}

export const rpcConfigService = RpcConfigService.getInstance();
