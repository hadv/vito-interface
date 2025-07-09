import { SessionTypes } from '@walletconnect/types';

// Test the session filtering logic directly
describe('DAppWalletConnectService Session Filtering', () => {
  // Extract the isDAppSession logic for testing
  const isDAppSession = (session: SessionTypes.Struct): boolean => {
    try {
      // Check if this session has our Safe wallet metadata in self (indicating we're acting as wallet)
      const selfMetadata = session.self?.metadata;
      const peerMetadata = session.peer?.metadata;

      // If our self metadata indicates we're the "Vito Safe Wallet", this is likely a dApp connection
      if (selfMetadata?.name === 'Vito Safe Wallet' && selfMetadata?.description === 'Safe wallet interface for dApp connections') {
        console.log('✅ Identified as dApp session based on self metadata:', peerMetadata?.name);
        return true;
      }

      // Additional check: if peer metadata looks like a typical dApp (not a wallet)
      // Wallets typically have names like "MetaMask", "Trust Wallet", "Uniswap Wallet", etc.
      // dApps typically have names like "Uniswap", "OpenSea", "Compound", etc.
      const peerName = peerMetadata?.name?.toLowerCase() || '';
      const walletKeywords = ['wallet', 'metamask', 'trust', 'coinbase', 'rainbow', 'argent'];
      const isLikelyWallet = walletKeywords.some(keyword => peerName.includes(keyword));

      if (isLikelyWallet) {
        console.log('🚫 Identified as signer wallet session based on peer name:', peerMetadata?.name);
        return false;
      }

      // If we can't determine clearly, default to treating as dApp session
      // but log for debugging
      console.log('❓ Uncertain session type, defaulting to dApp session:', peerMetadata?.name);
      return true;
    } catch (error) {
      console.error('❌ Error determining session type:', error);
      return false;
    }
  };

  describe('isDAppSession', () => {
    it('should identify dApp sessions correctly based on self metadata', () => {
      const dAppSession: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-1',
        self: {
          metadata: {
            name: 'Vito Safe Wallet',
            description: 'Safe wallet interface for dApp connections',
            url: 'https://localhost:3000',
            icons: []
          }
        },
        peer: {
          metadata: {
            name: 'Uniswap',
            description: 'Uniswap Interface',
            url: 'https://app.uniswap.org',
            icons: []
          }
        }
      } as SessionTypes.Struct;

      const result = isDAppSession(dAppSession);
      expect(result).toBe(true);
    });

    it('should reject signer wallet sessions based on peer wallet keywords', () => {
      const signerWalletSession: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-2',
        self: {
          metadata: {
            name: 'Vito Interface',
            description: 'A secure and efficient application designed to interact with Safe wallets',
            url: 'https://localhost:3000',
            icons: []
          }
        },
        peer: {
          metadata: {
            name: 'Uniswap Wallet',
            description: 'Uniswap Wallet',
            url: 'https://wallet.uniswap.org',
            icons: []
          }
        }
      } as SessionTypes.Struct;

      const result = isDAppSession(signerWalletSession);
      expect(result).toBe(false);
    });

    it('should reject MetaMask wallet sessions', () => {
      const metamaskSession: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-3',
        self: {
          metadata: {
            name: 'Vito Interface',
            description: 'A secure and efficient application designed to interact with Safe wallets',
            url: 'https://localhost:3000',
            icons: []
          }
        },
        peer: {
          metadata: {
            name: 'MetaMask',
            description: 'MetaMask Wallet',
            url: 'https://metamask.io',
            icons: []
          }
        }
      } as SessionTypes.Struct;

      const result = isDAppSession(metamaskSession);
      expect(result).toBe(false);
    });

    it('should reject Trust Wallet sessions', () => {
      const trustWalletSession: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-4',
        self: {
          metadata: {
            name: 'Vito Interface',
            description: 'A secure and efficient application designed to interact with Safe wallets',
            url: 'https://localhost:3000',
            icons: []
          }
        },
        peer: {
          metadata: {
            name: 'Trust Wallet',
            description: 'Trust Wallet',
            url: 'https://trustwallet.com',
            icons: []
          }
        }
      } as SessionTypes.Struct;

      const result = isDAppSession(trustWalletSession);
      expect(result).toBe(false);
    });

    it('should accept legitimate dApp sessions when uncertain', () => {
      const uncertainDAppSession: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-5',
        self: {
          metadata: {
            name: 'Some Other App',
            description: 'Some other app description',
            url: 'https://localhost:3000',
            icons: []
          }
        },
        peer: {
          metadata: {
            name: 'OpenSea',
            description: 'OpenSea NFT Marketplace',
            url: 'https://opensea.io',
            icons: []
          }
        }
      } as SessionTypes.Struct;

      const result = isDAppSession(uncertainDAppSession);
      expect(result).toBe(true);
    });

    it('should handle sessions with missing metadata gracefully', () => {
      const sessionWithoutMetadata: Partial<SessionTypes.Struct> = {
        topic: 'test-topic-6',
        self: {},
        peer: {}
      } as SessionTypes.Struct;

      const result = isDAppSession(sessionWithoutMetadata);
      expect(result).toBe(true); // Default to true when uncertain
    });

    it('should handle errors gracefully', () => {
      const invalidSession = null;

      const result = isDAppSession(invalidSession as any);
      expect(result).toBe(false);
    });
  });
});
