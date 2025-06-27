import { 
  WalletErrorHandler, 
  WalletErrorCode, 
  safeWalletOperation 
} from '../walletErrors'

describe('WalletErrorHandler', () => {
  describe('parseError', () => {
    it('should parse user rejection error (code 4001)', () => {
      const error = { code: 4001, message: 'User rejected the request' }
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.CONNECTION_REJECTED)
      expect(result.userMessage).toContain('cancelled')
      expect(result.retryable).toBe(true)
    })

    it('should parse pending request error (code -32002)', () => {
      const error = { code: -32002, message: 'Request already pending' }
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.CONNECTION_TIMEOUT)
      expect(result.userMessage).toContain('pending')
      expect(result.retryable).toBe(true)
    })

    it('should parse unsupported chain error (code 4902)', () => {
      const error = { code: 4902, message: 'Unrecognized chain ID' }
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.UNSUPPORTED_CHAIN)
      expect(result.userMessage).toContain('not supported')
      expect(result.retryable).toBe(false)
    })

    it('should parse MetaMask not installed error', () => {
      const error = new Error('MetaMask not installed')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.WALLET_NOT_INSTALLED)
      expect(result.userMessage).toContain('not installed')
      expect(result.retryable).toBe(false)
      expect(result.action).toBeDefined()
      expect(result.action?.label).toBe('Install MetaMask')
    })

    it('should parse connector not found error', () => {
      const error = new Error('Connector not found')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.WALLET_NOT_FOUND)
      expect(result.userMessage).toContain('not available')
      expect(result.retryable).toBe(true)
    })

    it('should parse WalletConnect modal closed error', () => {
      const error = new Error('User closed modal')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.WALLETCONNECT_MODAL_CLOSED)
      expect(result.userMessage).toContain('modal was closed')
      expect(result.retryable).toBe(true)
    })

    it('should parse session expired error', () => {
      const error = new Error('session has expired')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.WALLETCONNECT_SESSION_EXPIRED)
      expect(result.userMessage).toContain('expired')
      expect(result.retryable).toBe(true)
    })

    it('should parse insufficient funds error', () => {
      const error = new Error('insufficient funds')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.INSUFFICIENT_FUNDS)
      expect(result.userMessage).toContain('Insufficient funds')
      expect(result.retryable).toBe(false)
    })

    it('should parse network error', () => {
      const error = new Error('network error occurred')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.NETWORK_ERROR)
      expect(result.userMessage).toContain('Network error')
      expect(result.retryable).toBe(true)
    })

    it('should handle unknown errors', () => {
      const error = new Error('Some unknown error')
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.UNKNOWN_ERROR)
      expect(result.userMessage).toContain('unexpected error')
      expect(result.retryable).toBe(true)
    })

    it('should handle non-Error objects', () => {
      const error = 'String error'
      const result = WalletErrorHandler.parseError(error)

      expect(result.code).toBe(WalletErrorCode.UNKNOWN_ERROR)
      expect(result.message).toBe('String error')
    })
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')
      
      const result = await WalletErrorHandler.withRetry(operation, 3)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success')
      
      const result = await WalletErrorHandler.withRetry(operation, 3)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue({ code: 4902 }) // Unsupported chain
      
      await expect(WalletErrorHandler.withRetry(operation, 3)).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should fail after max retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('network error'))
      
      await expect(WalletErrorHandler.withRetry(operation, 2)).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should wait between retries', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      await WalletErrorHandler.withRetry(operation, 3, 100)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(100)
    })
  })

  describe('withTimeout', () => {
    it('should resolve before timeout', async () => {
      const promise = Promise.resolve('success')
      
      const result = await WalletErrorHandler.withTimeout(promise, 1000)
      
      expect(result).toBe('success')
    })

    it('should reject on timeout', async () => {
      const promise = new Promise(resolve => setTimeout(resolve, 200))
      
      await expect(
        WalletErrorHandler.withTimeout(promise, 100, 'Custom timeout')
      ).rejects.toThrow('Custom timeout')
    })
  })
})

describe('safeWalletOperation', () => {
  it('should execute operation successfully', async () => {
    const operation = jest.fn().mockResolvedValue('success')
    
    const result = await safeWalletOperation(operation)
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('should retry failed operations', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue('success')
    
    const result = await safeWalletOperation(operation, { maxRetries: 2 })
    
    expect(result).toBe('success')
    expect(operation).toHaveBeenCalledTimes(2)
  })

  it('should apply timeout', async () => {
    const operation = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 200))
    )
    
    await expect(
      safeWalletOperation(operation, { timeout: 100 })
    ).rejects.toThrow()
  })

  it('should call error handler on failure', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('test error'))
    const onError = jest.fn()
    
    await expect(
      safeWalletOperation(operation, { onError, maxRetries: 1 })
    ).rejects.toThrow()
    
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: WalletErrorCode.UNKNOWN_ERROR,
        message: 'test error'
      })
    )
  })

  it('should throw WalletError instead of original error', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('original error'))
    
    try {
      await safeWalletOperation(operation, { maxRetries: 1 })
    } catch (error: any) {
      expect(error.code).toBeDefined()
      expect(error.userMessage).toBeDefined()
      expect(error.retryable).toBeDefined()
    }
  })
})
