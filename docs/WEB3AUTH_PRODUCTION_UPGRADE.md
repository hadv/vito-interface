# Web3Auth Production Upgrade Guide

## Overview

This guide provides step-by-step instructions for upgrading the current Web3Auth demo implementation to a full production-ready integration with the actual Web3Auth SDK.

## Prerequisites

- Web3Auth Dashboard account
- Social provider OAuth applications configured
- Production environment variables set up

## Step 1: Install Production Dependencies

```bash
cd client

# Install Web3Auth packages with compatible versions
npm install @web3auth/modal@^8.0.0 @web3auth/base@^8.0.0 @web3auth/ethereum-provider@^8.0.0 @web3auth/openlogin-adapter@^8.0.0 --legacy-peer-deps
```

## Step 2: Update Web3AuthService

Replace the current simplified implementation in `client/src/services/Web3AuthService.ts`:

```typescript
import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK, WALLET_ADAPTERS } from '@web3auth/base';
import { EthereumPrivateKeyProvider } from '@web3auth/ethereum-provider';
import { OpenloginAdapter } from '@web3auth/openlogin-adapter';
import { ethers } from 'ethers';

export class Web3AuthService {
  private web3auth: Web3Auth | null = null;
  private provider: IProvider | null = null;
  
  constructor() {
    this.initializeWeb3Auth();
  }

  private async initializeWeb3Auth(): Promise<void> {
    try {
      const privateKeyProvider = new EthereumPrivateKeyProvider({
        config: {
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: '0xaa36a7', // Sepolia testnet
            rpcTarget: 'https://rpc.sepolia.org',
            displayName: 'Ethereum Sepolia Testnet',
            blockExplorerUrl: 'https://sepolia.etherscan.io',
            ticker: 'ETH',
            tickerName: 'Ethereum',
          },
        },
      });

      this.web3auth = new Web3Auth({
        clientId: process.env.REACT_APP_WEB3AUTH_CLIENT_ID!,
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET, // Use MAINNET for production
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: '0x1', // Ethereum mainnet for production
          rpcTarget: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
          displayName: 'Ethereum Mainnet',
          blockExplorerUrl: 'https://etherscan.io',
          ticker: 'ETH',
          tickerName: 'Ethereum',
        },
        uiConfig: {
          appName: 'Vito Safe Wallet',
          appUrl: window.location.origin,
          logoLight: '/vito-logo-light.png',
          logoDark: '/vito-logo-dark.png',
          defaultLanguage: 'en',
          mode: 'dark',
          theme: {
            primary: '#3b82f6',
          },
        },
      });

      const openloginAdapter = new OpenloginAdapter({
        privateKeyProvider,
        adapterSettings: {
          uxMode: 'popup',
          loginConfig: {
            google: {
              verifier: 'google',
              typeOfLogin: 'google',
              clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
            },
            github: {
              verifier: 'github', 
              typeOfLogin: 'github',
              clientId: process.env.REACT_APP_GITHUB_CLIENT_ID,
            },
            discord: {
              verifier: 'discord',
              typeOfLogin: 'discord', 
              clientId: process.env.REACT_APP_DISCORD_CLIENT_ID,
            },
            twitter: {
              verifier: 'twitter',
              typeOfLogin: 'twitter',
              clientId: process.env.REACT_APP_TWITTER_CLIENT_ID,
            },
          },
        },
      });

      this.web3auth.configureAdapter(openloginAdapter);
      await this.web3auth.init();

      if (this.web3auth.connected) {
        this.provider = this.web3auth.provider;
        await this.updateConnectionState();
      }

      console.log('✅ Web3Auth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Web3Auth:', error);
      throw error;
    }
  }

  async connectWithSocial(loginProvider: string): Promise<Web3AuthState> {
    if (!this.web3auth) {
      throw new Error('Web3Auth not initialized');
    }

    if (this.state.isConnecting) {
      throw new Error('Connection already in progress');
    }

    this.updateState({ isConnecting: true, error: undefined });

    try {
      this.provider = await this.web3auth.connectTo(WALLET_ADAPTERS.OPENLOGIN, {
        loginProvider,
      });

      if (!this.provider) {
        throw new Error('Failed to get provider after connection');
      }

      await this.updateConnectionState();
      return this.state;
    } catch (error: any) {
      const errorMessage = error.message || `Failed to connect with ${loginProvider}`;
      this.updateState({ 
        isConnecting: false, 
        error: errorMessage 
      });
      throw new Error(errorMessage);
    }
  }

  private async updateConnectionState(): Promise<void> {
    if (!this.web3auth || !this.provider) return;

    try {
      const user = await this.web3auth.getUserInfo();
      const ethersProvider = new ethers.providers.Web3Provider(this.provider);
      const signer = ethersProvider.getSigner();
      const address = await signer.getAddress();
      const socialProvider = (user as any).typeOfLogin || 'unknown';

      this.updateState({
        isConnected: true,
        isConnecting: false,
        user,
        provider: ethersProvider,
        address,
        socialProvider,
        error: undefined
      });
    } catch (error) {
      console.error('Failed to update connection state:', error);
      this.updateState({ 
        isConnecting: false, 
        error: 'Failed to get user information' 
      });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.web3auth) return;

    try {
      await this.web3auth.logout();
      this.provider = null;
      this.updateState({
        isConnected: false,
        isConnecting: false,
        user: undefined,
        provider: undefined,
        address: undefined,
        socialProvider: undefined,
        error: undefined
      });
    } catch (error) {
      console.error('Failed to disconnect from Web3Auth:', error);
      throw error;
    }
  }
}
```

## Step 3: Configure Social Providers

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized origins:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
6. Copy client ID to environment variables

### GitHub OAuth Setup

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create new OAuth App
3. Set Authorization callback URL:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
4. Copy client ID to environment variables

### Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create new application
3. Go to OAuth2 section
4. Add redirect URIs:
   - `http://localhost:3000` (development)
   - `https://yourdomain.com` (production)
5. Copy client ID to environment variables

### Twitter OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create new app
3. Configure OAuth 1.0a settings
4. Add callback URLs
5. Copy API key to environment variables

## Step 4: Update Environment Variables

Create production `.env` file:

```bash
# Web3Auth Configuration
REACT_APP_WEB3AUTH_CLIENT_ID=your-production-web3auth-client-id

# Social Provider Client IDs
REACT_APP_GOOGLE_CLIENT_ID=your-google-oauth-client-id
REACT_APP_GITHUB_CLIENT_ID=your-github-oauth-client-id
REACT_APP_DISCORD_CLIENT_ID=your-discord-oauth-client-id
REACT_APP_TWITTER_CLIENT_ID=your-twitter-api-key

# Network Configuration (for production)
REACT_APP_ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your-infura-key
REACT_APP_NETWORK_CHAIN_ID=0x1
```

## Step 5: Web3Auth Dashboard Configuration

1. **Create Web3Auth Project**
   - Visit [Web3Auth Dashboard](https://dashboard.web3auth.io/)
   - Create new project
   - Select "Plug and Play" SDK

2. **Configure Project Settings**
   - Set project name: "Vito Safe Wallet"
   - Add allowed origins:
     - `http://localhost:3000` (development)
     - `https://yourdomain.com` (production)

3. **Configure Social Login Providers**
   - Enable Google, GitHub, Discord, Twitter
   - Add respective client IDs from Step 3
   - Configure custom verifiers if needed

4. **Network Configuration**
   - Set default network to Ethereum Mainnet
   - Configure custom RPC if needed

## Step 6: Testing Production Implementation

### Development Testing

```bash
# Start development server
cd client
npm start

# Test each social provider
# - Verify OAuth redirects work
# - Check wallet creation
# - Test signing operations
```

### Production Testing Checklist

- [ ] All social providers authenticate successfully
- [ ] Wallet addresses are generated correctly
- [ ] Signing operations work with Safe contracts
- [ ] Session persistence across browser refreshes
- [ ] Proper error handling for failed authentications
- [ ] Logout functionality clears all data

## Step 7: Security Hardening

### Production Security Measures

1. **Environment Variables**
   - Never commit production keys to version control
   - Use secure environment variable management
   - Rotate keys regularly

2. **HTTPS Configuration**
   - Ensure all production URLs use HTTPS
   - Configure proper SSL certificates
   - Update OAuth redirect URLs to HTTPS

3. **Content Security Policy**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; 
                  connect-src 'self' https://api.web3auth.io https://rpc.sepolia.org;
                  script-src 'self' 'unsafe-inline' https://cdn.web3auth.io;">
   ```

## Step 8: Monitoring and Analytics

### Error Tracking

```typescript
// Add to Web3AuthService
private logError(error: Error, context: string) {
  // Send to your error tracking service
  console.error(`Web3Auth Error [${context}]:`, error);
  
  // Example: Sentry integration
  // Sentry.captureException(error, { tags: { context } });
}
```

### Usage Analytics

```typescript
// Track social login usage
private trackSocialLogin(provider: string, success: boolean) {
  // Send to your analytics service
  console.log(`Social login: ${provider}, success: ${success}`);
  
  // Example: Google Analytics
  // gtag('event', 'social_login', {
  //   provider,
  //   success
  // });
}
```

## Rollback Plan

If issues occur during production deployment:

1. **Immediate Rollback**
   ```bash
   # Revert to demo implementation
   git checkout HEAD~1 -- client/src/services/Web3AuthService.ts
   npm run build
   ```

2. **Gradual Rollout**
   - Deploy to staging environment first
   - Test with limited user group
   - Monitor error rates and user feedback

## Support and Maintenance

### Regular Maintenance Tasks

- Monitor Web3Auth service status
- Update SDK versions quarterly
- Review and rotate OAuth credentials
- Monitor authentication success rates

### Troubleshooting Resources

- [Web3Auth Documentation](https://web3auth.io/docs/)
- [Web3Auth GitHub Issues](https://github.com/Web3Auth/web3auth-web/issues)
- [Web3Auth Discord Support](https://discord.gg/web3auth)

## Conclusion

Following this guide will upgrade your Web3Auth implementation from demo mode to a fully functional, production-ready social login system. Remember to test thoroughly in a staging environment before deploying to production.
