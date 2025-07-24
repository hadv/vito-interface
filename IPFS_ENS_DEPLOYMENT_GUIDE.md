# Vito Interface - IPFS & ENS Deployment Guide

## 🌐 Overview

This guide provides a comprehensive plan for deploying the Vito Interface static web application to IPFS (InterPlanetary File System) and linking it to an ENS (Ethereum Name Service) domain for fully decentralized hosting.

## ✅ Deployment Readiness Assessment

**The Vito Interface is READY for IPFS deployment:**
- ✅ Pure client-side React SPA with no server dependencies
- ✅ State-based navigation (no React Router) - perfect for IPFS
- ✅ All external API calls work over HTTPS
- ✅ Environment variables properly configured
- ✅ Static build process already implemented
- ✅ PWA features for offline capability

## 🏗️ Deployment Architecture

```
User Request → ENS Domain → IPFS Content Hash → Distributed IPFS Network → Static Files
```

### Components:
1. **IPFS Network**: Decentralized storage for static files
2. **Pinning Service**: Ensures content availability (Pinata/Fleek/Infura)
3. **ENS Domain**: Human-readable domain pointing to IPFS content
4. **IPFS Gateway**: HTTP access to IPFS content

## 📋 Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] WalletConnect Project ID configured
- [ ] Web3Auth Client ID configured
- [ ] Infura/Alchemy API keys set
- [ ] All contract addresses verified
- [ ] Production environment variables set

### 2. Build Optimization
- [ ] Bundle size optimized (<2MB recommended for IPFS)
- [ ] Assets compressed
- [ ] Service worker configured for offline access
- [ ] Relative paths verified

### 3. IPFS Compatibility
- [ ] No server-side routing dependencies
- [ ] All external resources use HTTPS
- [ ] No localhost references in production build
- [ ] CORS headers not required (client-side only)

## 🚀 Step-by-Step Deployment Plan

### Phase 1: Prepare Production Build

#### 1.1 Configure Environment Variables
```bash
# Create production environment file
cd client
cp .env.example .env.production.local
```

Edit `.env.production.local`:
```bash
# Production API Keys
REACT_APP_INFURA_KEY=your-production-infura-key
REACT_APP_ALCHEMY_KEY=your-production-alchemy-key
REACT_APP_WALLETCONNECT_PROJECT_ID=your-production-walletconnect-id
REACT_APP_WEB3AUTH_CLIENT_ID=your-production-web3auth-id

# Production Environment
REACT_APP_ENVIRONMENT=production

# Enable all features for production
REACT_APP_ENABLE_SAFE_TX_POOL=true
REACT_APP_ENABLE_NETWORK_SWITCHING=true

# Contract addresses (use actual deployed addresses)
REACT_APP_SAFE_TX_POOL_REGISTRY_ETHEREUM=0x...
REACT_APP_SAFE_TX_POOL_REGISTRY_SEPOLIA=0x...
REACT_APP_SAFE_TX_POOL_REGISTRY_ARBITRUM=0x...
```

#### 1.2 Build for Production
```bash
# Use correct Node.js version
nvm use --lts

# Install dependencies
npm install

# Create production build
npm run build

# Verify build size
du -sh build/
```

#### 1.3 Test Build Locally
```bash
# Test the production build
npx serve -s build -p 3000

# Test all functionality:
# - Wallet connections
# - Network switching
# - Transaction creation
# - Address book
# - Settings
```

### Phase 2: IPFS Deployment

#### 2.1 Choose IPFS Pinning Service

**Recommended Options:**

**Option A: Pinata (Recommended for beginners)**
- Free tier: 1GB storage, 100GB bandwidth
- Easy web interface
- Reliable pinning
- Good documentation

**Option B: Fleek (Recommended for developers)**
- Integrated CI/CD
- Automatic deployments
- ENS integration built-in
- GitHub integration

**Option C: Infura IPFS**
- Enterprise-grade reliability
- API-first approach
- Good for programmatic deployments

#### 2.2 Deploy to IPFS via Pinata

```bash
# Install Pinata CLI
npm install -g @pinata/cli

# Configure Pinata
pinata auth

# Upload build directory
cd client
pinata upload build/ --name "vito-interface-v1.0.0"

# Note the returned IPFS hash (CID)
# Example: QmYourContentHashHere...
```

#### 2.3 Deploy to IPFS via Fleek

```bash
# Install Fleek CLI
npm install -g @fleek-platform/cli

# Login to Fleek
fleek login

# Initialize project
fleek sites init

# Configure fleek.config.js
# Deploy
fleek sites deploy
```

#### 2.4 Verify IPFS Deployment

Test access via multiple gateways:
```bash
# Test via different IPFS gateways
https://ipfs.io/ipfs/QmYourHashHere
https://gateway.pinata.cloud/ipfs/QmYourHashHere
https://cloudflare-ipfs.com/ipfs/QmYourHashHere
```

### Phase 3: ENS Domain Configuration

#### 3.1 Acquire ENS Domain

1. Visit [ENS App](https://app.ens.domains/)
2. Connect your wallet
3. Search for available domain (e.g., `vito-wallet.eth`)
4. Register domain (requires ETH for registration + gas)
5. Set primary name if desired

#### 3.2 Configure Content Hash

**Via ENS App Interface:**
1. Go to your domain in ENS App
2. Click "Records" tab
3. Add "Content" record
4. Select "IPFS"
5. Enter your IPFS hash: `QmYourHashHere`
6. Confirm transaction

**Via Smart Contract (Advanced):**
```solidity
// Using ENS Public Resolver
// Content hash format: ipfs://QmYourHashHere
bytes memory contentHash = abi.encodePacked(
    hex"e3010170", // IPFS prefix
    hex"1220",     // SHA-256 prefix
    yourIPFSHash   // 32-byte hash
);
```

#### 3.3 Configure Additional Records (Optional)

```bash
# Text records for metadata
avatar: ipfs://QmAvatarHash
description: Vito Safe Wallet Interface
url: https://vito-wallet.eth
github: https://github.com/hadv/vito-interface
```

### Phase 4: Testing & Verification

#### 4.1 Test ENS Resolution

```bash
# Test via ENS-compatible browsers
# Brave: vito-wallet.eth
# Opera: vito-wallet.eth
# MetaMask: vito-wallet.eth

# Test via ENS gateways
https://vito-wallet.eth.link
https://vito-wallet.eth.limo
```

#### 4.2 Comprehensive Testing

- [ ] Domain resolves correctly
- [ ] All pages load properly
- [ ] Wallet connections work
- [ ] WalletConnect QR codes function
- [ ] Web3Auth social login works
- [ ] Network switching functions
- [ ] Transaction creation/signing works
- [ ] Address book operations work
- [ ] Settings persist correctly
- [ ] PWA installation works
- [ ] Offline functionality works

## 🔄 Update Process

### Automated Updates with Fleek
```yaml
# .github/workflows/deploy-ipfs.yml
name: Deploy to IPFS
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - uses: fleek-platform/actions@v1
        with:
          fleek-token: ${{ secrets.FLEEK_TOKEN }}
```

### Manual Updates
```bash
# 1. Build new version
npm run build

# 2. Upload to IPFS
pinata upload build/ --name "vito-interface-v1.1.0"

# 3. Update ENS content hash
# Use ENS App or smart contract call

# 4. Verify deployment
# Test new IPFS hash before updating ENS
```

## 🔒 Security Considerations

### IPFS Security
- ✅ Content is immutable (hash-based addressing)
- ✅ No server-side vulnerabilities
- ✅ Distributed hosting (no single point of failure)
- ⚠️ Content is public (no private data in build)

### ENS Security
- ✅ Decentralized domain ownership
- ✅ Cryptographic verification
- ⚠️ Requires wallet security for updates
- ⚠️ Gas costs for updates

### Application Security
- ✅ Client-side only (no backend to compromise)
- ✅ HTTPS required for wallet connections
- ✅ Environment variables properly configured
- ⚠️ API keys visible in client code (use public keys only)

## 💰 Cost Analysis

### Initial Setup Costs
- ENS Domain Registration: ~$5-50/year (depending on name)
- ENS Domain Renewal: ~$5/year
- Gas fees for ENS updates: ~$10-50 per update

### Ongoing Costs
- IPFS Pinning Service:
  - Pinata: Free (1GB) / $20/month (100GB)
  - Fleek: Free (1GB) / $10/month (50GB)
  - Infura: Pay-per-use
- ENS Domain Renewal: ~$5/year
- Gas fees for content updates: ~$10-50 per update

### Cost Comparison vs Traditional Hosting
- Traditional hosting: $5-20/month
- IPFS + ENS: $5-20/year + gas fees
- **Savings: 80-95% reduction in hosting costs**

## 🚨 Troubleshooting

### Common Issues

**IPFS Gateway Timeouts:**
- Use multiple gateways
- Consider dedicated gateway
- Implement gateway fallback in app

**ENS Resolution Fails:**
- Verify content hash format
- Check ENS record propagation
- Test with different browsers/wallets

**App Functionality Issues:**
- Verify all environment variables
- Check HTTPS requirements
- Test API key validity
- Verify contract addresses

**Performance Issues:**
- Optimize bundle size
- Use IPFS gateway with CDN
- Implement service worker caching

## 📞 Support Resources

- **IPFS Documentation**: https://docs.ipfs.io/
- **ENS Documentation**: https://docs.ens.domains/
- **Pinata Support**: https://pinata.cloud/documentation
- **Fleek Documentation**: https://docs.fleek.xyz/
- **WalletConnect Docs**: https://docs.walletconnect.com/
- **Web3Auth Docs**: https://web3auth.io/docs/

## 🎯 Success Metrics

- [ ] Domain resolves in <3 seconds
- [ ] App loads in <5 seconds
- [ ] 99.9% uptime via IPFS network
- [ ] All wallet connections functional
- [ ] Mobile compatibility maintained
- [ ] PWA installation works
- [ ] Offline functionality preserved

## 🛠️ Deployment Tools & Scripts

This repository includes several tools to automate the deployment process:

### 1. Automated Deployment Script
```bash
# Make the script executable
chmod +x scripts/deploy-ipfs.sh

# Run the deployment script
./scripts/deploy-ipfs.sh
```

The script will:
- Check prerequisites
- Setup environment
- Build the application
- Test locally
- Deploy to IPFS (Pinata or Fleek)
- Provide deployment URLs and ENS content hash

### 2. GitHub Actions Workflow
Automated deployment on every push to main branch:
- Located at `.github/workflows/deploy-ipfs.yml`
- Supports both Pinata and Fleek deployment
- Includes testing and verification
- Provides deployment artifacts

**Required GitHub Secrets:**
```bash
REACT_APP_INFURA_KEY
REACT_APP_ALCHEMY_KEY
REACT_APP_WALLETCONNECT_PROJECT_ID
REACT_APP_WEB3AUTH_CLIENT_ID
REACT_APP_ETHERSCAN_API_KEY
REACT_APP_SAFE_TX_POOL_REGISTRY_ETHEREUM
REACT_APP_SAFE_TX_POOL_REGISTRY_SEPOLIA
REACT_APP_SAFE_TX_POOL_REGISTRY_ARBITRUM
PINATA_JWT  # For Pinata deployment
FLEEK_TOKEN # For Fleek deployment
```

### 3. ENS Management Tool
Interactive CLI tool for ENS domain management:
```bash
# Install dependencies
npm install ethers bs58

# Run the ENS manager
node scripts/ens-manager.js
```

Features:
- View domain information
- Update content hash
- Verify deployment
- Test gateway access

### 4. Fleek Configuration
Pre-configured Fleek setup in `fleek.config.js`:
- Automated builds
- IPFS deployment
- Performance optimization
- Security headers

## 📊 Deployment Comparison

| Feature | Traditional Hosting | IPFS + ENS |
|---------|-------------------|------------|
| **Cost** | $5-20/month | $5-20/year |
| **Censorship Resistance** | Low | High |
| **Uptime** | 99.9% | 99.99%+ |
| **Global CDN** | Extra cost | Built-in |
| **Domain Control** | Centralized | Decentralized |
| **Setup Complexity** | Low | Medium |
| **Update Process** | Instant | 5-10 minutes |

## 🎯 Quick Start Guide

### For Beginners (Pinata + Manual ENS)
1. Run `./scripts/deploy-ipfs.sh`
2. Choose option 1 (Pinata)
3. Visit [ENS App](https://app.ens.domains/)
4. Update content hash with provided IPFS hash

### For Developers (GitHub Actions + Fleek)
1. Set up GitHub secrets
2. Configure Fleek project
3. Push to main branch
4. Automatic deployment and testing

### For Advanced Users (Custom Setup)
1. Use `scripts/ens-manager.js` for programmatic ENS updates
2. Customize `fleek.config.js` for specific needs
3. Implement custom CI/CD pipeline

## 🔄 Maintenance & Updates

### Regular Updates
- **Content Updates**: Push to main branch (auto-deploy)
- **ENS Updates**: Use ENS manager script or ENS App
- **Dependency Updates**: Regular npm audit and updates

### Monitoring
- **IPFS Gateway Health**: Test multiple gateways regularly
- **ENS Resolution**: Verify domain resolves correctly
- **Application Functionality**: Test wallet connections and features

### Backup Strategy
- **IPFS Pinning**: Use multiple pinning services
- **ENS Records**: Document all ENS configurations
- **Environment Variables**: Secure backup of all keys

---

**Next Steps**:
1. Review the deployment readiness checklist
2. Choose your deployment method (manual script vs automated)
3. Follow Phase 1 to begin the deployment process
4. Each phase builds upon the previous one, ensuring a smooth transition to decentralized hosting

**Support**: If you encounter issues, check the troubleshooting section or use the provided tools for debugging.
