import { ethers } from 'ethers';

export enum WalletProviderType {
  METAMASK = 'metamask',
  WALLETCONNECT = 'walletconnect'
}

export interface WalletProviderInfo {
  type: WalletProviderType;
  name: string;
  icon: string;
  description: string;
  isAvailable: boolean;
}

export interface WalletProvider {
  readonly type: WalletProviderType;
  readonly info: WalletProviderInfo;
  
  // Connection methods
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // Provider methods
  getProvider(): any;
  getSigner(): ethers.Signer | null;
  getAddress(): Promise<string>;
  getBalance(): Promise<string>;
  
  // Network methods
  getNetwork(): Promise<ethers.providers.Network>;
  switchNetwork(chainId: number): Promise<boolean>;
  
  // Event handling
  on(event: string, listener: (...args: any[]) => void): void;
  off(event: string, listener: (...args: any[]) => void): void;
  removeAllListeners(): void;
}

export abstract class BaseWalletProvider implements WalletProvider {
  abstract readonly type: WalletProviderType;
  abstract readonly info: WalletProviderInfo;
  
  protected provider: any = null;
  protected signer: ethers.Signer | null = null;
  protected connected: boolean = false;
  
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  
  isConnected(): boolean {
    return this.connected;
  }
  
  getProvider(): any {
    return this.provider;
  }
  
  getSigner(): ethers.Signer | null {
    return this.signer;
  }
  
  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.getAddress();
  }
  
  async getBalance(): Promise<string> {
    if (!this.provider || !this.signer) {
      throw new Error('Wallet not connected');
    }
    const address = await this.getAddress();
    const balance = await this.provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  }
  
  async getNetwork(): Promise<ethers.providers.Network> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }
    return await this.provider.getNetwork();
  }
  
  abstract switchNetwork(chainId: number): Promise<boolean>;
  abstract on(event: string, listener: (...args: any[]) => void): void;
  abstract off(event: string, listener: (...args: any[]) => void): void;
  abstract removeAllListeners(): void;
}
