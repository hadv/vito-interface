import { WalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';
import { MetaMaskProvider } from './MetaMaskProvider';
import { WalletConnectProviderImpl } from './WalletConnectProvider';
import { CoinbaseWalletProvider } from './CoinbaseWalletProvider';
import { RainbowProvider } from './RainbowProvider';
import { TrustWalletProvider } from './TrustWalletProvider';

declare global {
  interface Window {
    coinbaseWalletExtension?: any;
    rainbow?: any;
    trustWallet?: any;
  }
}

export class WalletProviderFactory {
  private static providers: Map<WalletProviderType, WalletProvider> = new Map();

  static getProvider(type: WalletProviderType): WalletProvider {
    if (!this.providers.has(type)) {
      this.providers.set(type, this.createProvider(type));
    }
    return this.providers.get(type)!;
  }

  static getAllProviders(): WalletProvider[] {
    return [
      this.getProvider(WalletProviderType.METAMASK),
      this.getProvider(WalletProviderType.WALLETCONNECT),
      this.getProvider(WalletProviderType.COINBASE_WALLET),
      this.getProvider(WalletProviderType.RAINBOW),
      this.getProvider(WalletProviderType.TRUST_WALLET)
    ];
  }

  static getAvailableProviders(): WalletProvider[] {
    const allProviders = this.getAllProviders();
    const availableProviders = allProviders.filter(provider => provider.info.isAvailable);
    console.log('🔍 Available wallet providers:', availableProviders.map(p => ({ name: p.info.name, available: p.info.isAvailable })));
    return availableProviders;
  }

  // Get provider info without creating provider instances
  static getProviderInfo(): WalletProviderInfo[] {
    return [
      WalletProviderType.METAMASK,
      WalletProviderType.WALLETCONNECT,
      WalletProviderType.COINBASE_WALLET,
      WalletProviderType.RAINBOW,
      WalletProviderType.TRUST_WALLET
    ].map(type => this.getProviderInfoByType(type));
  }

  static getAvailableProviderInfo(): WalletProviderInfo[] {
    return this.getProviderInfo().filter(info => info.isAvailable);
  }

  // Get provider info without creating the provider instance
  private static getProviderInfoByType(type: WalletProviderType): WalletProviderInfo {
    switch (type) {
      case WalletProviderType.METAMASK:
        return {
          type: WalletProviderType.METAMASK,
          name: 'MetaMask',
          icon: 'metamask',
          description: 'Connect using MetaMask browser extension',
          isAvailable: typeof window !== 'undefined' && typeof window.ethereum !== 'undefined'
        };
      case WalletProviderType.WALLETCONNECT:
        return {
          type: WalletProviderType.WALLETCONNECT,
          name: 'WalletConnect',
          icon: 'walletconnect',
          description: 'Connect using WalletConnect protocol',
          isAvailable: true // WalletConnect is available when imported
        };
      case WalletProviderType.COINBASE_WALLET:
        return {
          type: WalletProviderType.COINBASE_WALLET,
          name: 'Coinbase Wallet',
          icon: 'coinbase',
          description: 'Connect using Coinbase Wallet',
          isAvailable: typeof window !== 'undefined' && (
            typeof window.coinbaseWalletExtension !== 'undefined' ||
            typeof window.ethereum?.isCoinbaseWallet !== 'undefined'
          )
        };
      case WalletProviderType.RAINBOW:
        return {
          type: WalletProviderType.RAINBOW,
          name: 'Rainbow',
          icon: 'rainbow',
          description: 'Connect using Rainbow Wallet',
          isAvailable: typeof window !== 'undefined' && (
            typeof window.rainbow !== 'undefined' ||
            typeof window.ethereum?.isRainbow !== 'undefined'
          )
        };
      case WalletProviderType.TRUST_WALLET:
        return {
          type: WalletProviderType.TRUST_WALLET,
          name: 'Trust Wallet',
          icon: 'trust',
          description: 'Connect using Trust Wallet',
          isAvailable: typeof window !== 'undefined' && (
            typeof window.trustWallet !== 'undefined' ||
            typeof window.ethereum?.isTrust !== 'undefined'
          )
        };
      default:
        throw new Error(`Unsupported wallet provider type: ${type}`);
    }
  }

  private static createProvider(type: WalletProviderType): WalletProvider {
    switch (type) {
      case WalletProviderType.METAMASK:
        return new MetaMaskProvider();
      case WalletProviderType.WALLETCONNECT:
        return new WalletConnectProviderImpl();
      case WalletProviderType.COINBASE_WALLET:
        return new CoinbaseWalletProvider();
      case WalletProviderType.RAINBOW:
        return new RainbowProvider();
      case WalletProviderType.TRUST_WALLET:
        return new TrustWalletProvider();
      default:
        throw new Error(`Unsupported wallet provider type: ${type}`);
    }
  }

  static async disconnectAll(): Promise<void> {
    const providers = Array.from(this.providers.values());
    const promises = providers.map(provider => {
      if (provider.isConnected()) {
        return provider.disconnect();
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    this.providers.clear();
  }

  static getConnectedProvider(): WalletProvider | null {
    const providers = Array.from(this.providers.values());
    for (const provider of providers) {
      if (provider.isConnected()) {
        return provider;
      }
    }
    return null;
  }

  static isAnyProviderConnected(): boolean {
    return this.getConnectedProvider() !== null;
  }
}
