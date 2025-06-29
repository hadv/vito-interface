# Web3Auth Setup Guide

This guide walks you through setting up Web3Auth for the Vito interface social login feature.

## What is Web3Auth?

Web3Auth is a pluggable authentication infrastructure for Web3 wallets and applications. It streamlines the onboarding of both mainstream and crypto native users under a single framework by providing experiences that they're most comfortable with.

**Key Benefits:**
- **No OAuth Configuration Needed** - Web3Auth handles all social provider configurations
- **Wallet Generation** - Automatically generates crypto wallets from social logins
- **Multi-Platform Support** - Works across web, mobile, and gaming platforms
- **Enterprise Ready** - Scalable infrastructure with high availability

## Prerequisites

- Web3Auth account
- Basic understanding of OAuth 2.0 (handled by Web3Auth)
- Domain for your application

## Step 1: Create Web3Auth Account

1. **Go to Web3Auth Dashboard**
   - Visit [Web3Auth Dashboard](https://dashboard.web3auth.io/)
   - Sign up for a free account or sign in

2. **Verify Your Email**
   - Check your email for verification link
   - Complete email verification

## Step 2: Create a New Project

1. **Create Project**
   - Click "Create Project" on the dashboard
   - Enter project name: `Vito Interface`
   - Choose your plan (Sapphire Devnet for development, Sapphire Mainnet for production)

2. **Select Platform**
   - Choose "Plug and Play"
   - Select "Web" platform
   - Click "Continue"

## Step 3: Configure Your Application

1. **Basic Configuration**
   - **Project Name**: `Vito Interface`
   - **Project Logo**: Upload your app logo (optional)
   - **Project Description**: Brief description of your app

2. **Domain Configuration**
   - **Development Domain**: `http://localhost:3000`
   - **Production Domain**: `https://your-production-domain.com`
   - **Additional Domains**: Add any staging or testing domains

3. **Blockchain Configuration**
   - **Default Chain**: Ethereum Mainnet
   - **Additional Chains**: Add any other chains you plan to support

## Step 4: Configure Social Login Providers

Web3Auth automatically handles OAuth configurations for major providers:

### Available Providers
- ✅ **Google** - Gmail accounts
- ✅ **Facebook** - Facebook accounts  
- ✅ **Twitter** - Twitter/X accounts
- ✅ **Discord** - Discord accounts
- ✅ **GitHub** - GitHub accounts
- ✅ **LinkedIn** - LinkedIn accounts
- ✅ **Apple** - Apple ID accounts
- ✅ **Twitch** - Twitch accounts

### Enable Providers
1. Go to "Social Login" section in your project
2. Toggle on the providers you want to enable
3. **No additional OAuth setup required** - Web3Auth handles everything!

## Step 5: Get Your Client ID

1. **Copy Client ID**
   - In your project dashboard, find the "Client ID"
   - Copy this ID (it looks like: `BPi5PB_UiIZ-cPz1GtV5i1I2iOSOHuimiXBI0e-Oe_u6X3oVAbCiAZOTEBtTXw4tsluTITPqA8zMsfxIKMjiqNQ`)

2. **Important Notes**
   - Keep this Client ID secure
   - Use different Client IDs for development and production
   - Never commit Client IDs to public repositories

## Step 6: Configure Environment Variables

1. **Create Environment File**
   - Copy `client/.env.example` to `client/.env.local`
   - Update the Web3Auth Client ID:
   ```bash
   REACT_APP_WEB3AUTH_CLIENT_ID=your-actual-web3auth-client-id-here
   ```

2. **Verify Configuration**
   - Make sure the Client ID doesn't contain any extra spaces
   - Ensure it matches exactly from the Web3Auth dashboard

## Step 7: Test the Integration

1. **Start Development Server**
   ```bash
   cd client
   npm start
   ```

2. **Test Web3Auth Flow**
   - Click "Connect" in the header
   - Click "Social Login" (should be first option)
   - Click any social provider (Google, Twitter, Discord, GitHub)
   - Complete the authentication flow
   - Verify wallet connection success

## Development vs Production

### Development Setup
- **Network**: Sapphire Devnet (free)
- **Domain**: `http://localhost:3000`
- **Client ID**: Development Client ID
- **Environment**: `.env.local` (not committed to git)

### Production Setup
- **Network**: Sapphire Mainnet (paid plans available)
- **Domain**: `https://your-production-domain.com`
- **Client ID**: Production Client ID
- **Environment**: Secure environment variable storage

## Security Best Practices

### Environment Variables
1. **Never commit Client IDs** to version control
2. **Use different Client IDs** for development and production
3. **Validate environment variables** on app startup
4. **Use secure storage** for production environment variables

### Domain Security
1. **Only add trusted domains** to Web3Auth project
2. **Use HTTPS in production**
3. **Validate redirect URIs** if applicable
4. **Monitor usage** in Web3Auth dashboard

### User Data
1. **Follow privacy policies** for user data handling
2. **Implement proper logout** functionality
3. **Handle user consent** appropriately
4. **Secure wallet private keys** (handled by Web3Auth)

## Troubleshooting

### Common Issues

1. **"Web3Auth not initialized" Error**
   - Verify Client ID is correct in environment variables
   - Check that Web3Auth dashboard project is active
   - Ensure domain is added to allowed domains

2. **"Domain not allowed" Error**
   - Add your current domain to Web3Auth project settings
   - Check for typos in domain configuration
   - Ensure protocol (http/https) matches

3. **"User closed the modal" Error**
   - This is normal when user cancels authentication
   - Handle gracefully in your error handling

4. **Social Provider Not Working**
   - Check if provider is enabled in Web3Auth dashboard
   - Verify provider is supported by Web3Auth
   - Check Web3Auth status page for provider issues

### Debug Steps

1. **Check Browser Console**
   - Look for Web3Auth initialization errors
   - Verify Client ID is loaded correctly
   - Check for network errors

2. **Verify Environment Variables**
   ```javascript
   console.log('Web3Auth Client ID:', process.env.REACT_APP_WEB3AUTH_CLIENT_ID);
   ```

3. **Test Authentication Flow**
   - Use browser developer tools to inspect network requests
   - Check for CORS errors
   - Verify Web3Auth modal appears

4. **Check Web3Auth Dashboard**
   - Monitor usage statistics
   - Check for error logs
   - Verify project configuration

## Production Deployment

### Before Going Live

1. **Upgrade to Production Plan**
   - Choose appropriate Web3Auth plan
   - Configure production domains
   - Set up monitoring and alerts

2. **Domain Configuration**
   - Add all production domains to Web3Auth project
   - Remove development domains from production project
   - Test authentication on production domain

3. **Environment Setup**
   - Use production Client ID
   - Secure environment variable storage
   - Test complete authentication flow

### Monitoring

1. **Web3Auth Dashboard**
   - Monitor authentication usage
   - Check for errors and failed attempts
   - Review user analytics

2. **Application Logs**
   - Log authentication success/failure events
   - Monitor wallet generation and connection
   - Track user engagement metrics

## Advanced Configuration

### Custom UI Theming
```javascript
uiConfig: {
  appName: "Vito Interface",
  theme: {
    primary: "#3b82f6",
  },
  mode: "light", // or "dark"
  logoLight: "https://your-domain.com/logo-light.png",
  logoDark: "https://your-domain.com/logo-dark.png",
}
```

### Custom Chain Configuration
```javascript
chainConfig: {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x1", // Ethereum Mainnet
  rpcTarget: "https://rpc.ankr.com/eth",
  displayName: "Ethereum Mainnet",
  blockExplorerUrl: "https://etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
}
```

## Support and Resources

- **Web3Auth Documentation**: https://web3auth.io/docs/
- **Web3Auth Discord**: https://discord.gg/web3auth
- **GitHub Repository**: https://github.com/Web3Auth/web3auth-web
- **Support Email**: support@web3auth.io

## Pricing

Web3Auth offers various pricing tiers:
- **Sapphire Devnet**: Free for development
- **Sapphire Mainnet**: Paid plans for production
- **Enterprise**: Custom solutions for large-scale applications

Visit [Web3Auth Pricing](https://web3auth.io/pricing.html) for current pricing information.
