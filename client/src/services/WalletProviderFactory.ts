import { WalletProvider, WalletProviderType, WalletProviderInfo } from './WalletProvider';
import { MetaMaskProvider } from './MetaMaskProvider';
import { WalletConnectProviderImpl } from './WalletConnectProvider';

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
      this.getProvider(WalletProviderType.WALLETCONNECT)
    ];
  }

  static getAvailableProviders(): WalletProvider[] {
    const allProviders = this.getAllProviders();
    const availableProviders = allProviders.filter(provider => provider.info.isAvailable);
    console.log('🔍 Available wallet providers:', availableProviders.map(p => ({ name: p.info.name, available: p.info.isAvailable })));
    return availableProviders;
  }

  static getProviderInfo(): WalletProviderInfo[] {
    return this.getAllProviders().map(provider => provider.info);
  }

  static getAvailableProviderInfo(): WalletProviderInfo[] {
    return this.getAvailableProviders().map(provider => provider.info);
  }

  private static createProvider(type: WalletProviderType): WalletProvider {
    switch (type) {
      case WalletProviderType.METAMASK:
        return new MetaMaskProvider();
      case WalletProviderType.WALLETCONNECT:
        return new WalletConnectProviderImpl();
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
