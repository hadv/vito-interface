import { WalletConnectionService } from '../services/WalletConnectionService';

// Mock window.ethereum for testing
const mockEthereum = {
  isRabby: true,
  request: jest.fn(),
  providers: undefined
};

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    providers: {
      Web3Provider: jest.fn().mockImplementation(() => ({
        getSigner: jest.fn().mockReturnValue({
          getAddress: jest.fn().mockResolvedValue('0x1234567890123456789012345678901234567890')
        }),
        getBalance: jest.fn().mockResolvedValue('1000000000000000000') // 1 ETH
      }))
    },
    utils: {
      formatEther: jest.fn().mockReturnValue('1.0')
    }
  }
}));

// Mock SafeWalletService
jest.mock('../services/SafeWalletService', () => ({
  safeWalletService: {
    setSigner: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true)
  }
}));

describe('Rabby Wallet Integration', () => {
  let walletService: WalletConnectionService;

  beforeEach(() => {
    // Setup window.ethereum mock
    (global as any).window = {
      ethereum: mockEthereum
    };
    
    walletService = new WalletConnectionService();
    
    // Mock initial Safe wallet connection
    walletService['state'] = {
      isConnected: true,
      safeAddress: '0x1234567890123456789012345678901234567890',
      network: 'ethereum',
      signerConnected: false,
      readOnlyMode: false
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should detect Rabby wallet when isRabby is true', () => {
    expect(window.ethereum.isRabby).toBe(true);
  });

  test('should connect to Rabby wallet successfully', async () => {
    mockEthereum.request.mockResolvedValue(['0x1234567890123456789012345678901234567890']);

    const result = await walletService.connectRabbyWallet();

    expect(result.signerConnected).toBe(true);
    expect(result.walletType).toBe('rabby');
    expect(result.signerAddress).toBe('0x1234567890123456789012345678901234567890');
    expect(mockEthereum.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
  });

  test('should handle user rejection gracefully', async () => {
    const rejectionError = new Error('User rejected the request') as any;
    rejectionError.code = 4001;
    mockEthereum.request.mockRejectedValue(rejectionError);

    await expect(walletService.connectRabbyWallet()).rejects.toThrow('Connection cancelled by user');
  });

  test('should handle pending request error', async () => {
    const pendingError = new Error('Request already pending') as any;
    pendingError.code = -32002;
    mockEthereum.request.mockRejectedValue(pendingError);

    await expect(walletService.connectRabbyWallet()).rejects.toThrow('Connection request already pending. Please check your Rabby wallet.');
  });

  test('should throw error when Safe wallet is not connected first', async () => {
    walletService['state'] = {
      isConnected: false,
      signerConnected: false,
      readOnlyMode: false
    };

    await expect(walletService.connectRabbyWallet()).rejects.toThrow('Safe wallet must be connected first');
  });

  test('should detect Rabby in providers array', () => {
    const mockEthereumWithProviders = {
      providers: [
        { isMetaMask: true },
        { isRabby: true },
        { isPhantom: true }
      ]
    };

    (global as any).window = {
      ethereum: mockEthereumWithProviders
    };

    const rabbyProvider = window.ethereum.providers.find((p: any) => p.isRabby);
    expect(rabbyProvider).toBeDefined();
    expect(rabbyProvider.isRabby).toBe(true);
  });

  test('should throw error when Rabby is not detected', async () => {
    (global as any).window = {
      ethereum: {
        isMetaMask: true,
        isRabby: false,
        providers: [{ isMetaMask: true }]
      }
    };

    await expect(walletService.connectRabbyWallet()).rejects.toThrow('Rabby wallet not found. Please install Rabby wallet.');
  });
});
