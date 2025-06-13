import { OnChainDataService } from '../OnChainDataService';

describe('OnChainDataService', () => {
  let service: OnChainDataService;

  beforeEach(() => {
    service = new OnChainDataService('ethereum');
  });

  it('should initialize with correct network', () => {
    expect(service).toBeDefined();
  });

  it('should handle transaction status for pending transactions', async () => {
    // Mock the provider to return null (transaction not found)
    const mockProvider = {
      getTransactionReceipt: jest.fn().mockResolvedValue(null),
    };
    
    // Replace the provider
    (service as any).provider = mockProvider;

    const result = await service.getTransactionStatus('0x123');
    expect(result.status).toBe('pending');
    expect(result.confirmations).toBe(0);
  });
});
