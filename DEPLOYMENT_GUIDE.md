# Vito Interface Deployment Guide

This guide covers deploying the enhanced vito-interface with optimized transaction history and caching system.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Git access to the repository
- Environment variables configured

### Build & Deploy
```bash
# Clone and setup
git clone https://github.com/hadv/vito-interface.git
cd vito-interface
git checkout feature/transaction-history-on-chain-data

# Install dependencies
cd client
npm install

# Build for production
npm run build

# Serve locally (optional)
npm install -g serve
serve -s build -p 3000
```

## 🔧 Environment Configuration

### Required Environment Variables
```env
# Blockchain RPC Endpoints
REACT_APP_INFURA_KEY=your_infura_key_here
REACT_APP_ALCHEMY_KEY=your_alchemy_key_here

# Network Configuration
REACT_APP_DEFAULT_NETWORK=ethereum
REACT_APP_SUPPORTED_NETWORKS=ethereum,sepolia,arbitrum

# Safe Transaction Service URLs (optional - defaults provided)
REACT_APP_SAFE_SERVICE_MAINNET=https://safe-transaction-mainnet.safe.global
REACT_APP_SAFE_SERVICE_SEPOLIA=https://safe-transaction-sepolia.safe.global
REACT_APP_SAFE_SERVICE_ARBITRUM=https://safe-transaction-arbitrum.safe.global

# Performance Settings
REACT_APP_CACHE_TTL_MEMORY=300000    # 5 minutes
REACT_APP_CACHE_TTL_PERSISTENT=1800000  # 30 minutes
REACT_APP_PAGE_SIZE=20
REACT_APP_PRELOAD_PAGES=2
```

### Network Configuration
The app supports multiple networks with automatic fallback:

```javascript
// Supported networks
const networks = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/YOUR_KEY',
    safeService: 'https://safe-transaction-mainnet.safe.global'
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    safeService: 'https://safe-transaction-sepolia.safe.global'
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    safeService: 'https://safe-transaction-arbitrum.safe.global'
  }
};
```

## 📦 Build Output

### Production Build Stats
```
File sizes after gzip:
  191.27 kB  build/static/js/main.355fd97d.js
  5.33 kB    build/static/css/main.767bc12e.css
  1.77 kB    build/static/js/453.419a5d54.chunk.js
```

### Key Features Included
- ✅ Multi-level caching system
- ✅ Optimized transaction history loading
- ✅ Real-time status monitoring
- ✅ Infinite scroll pagination
- ✅ Search and filtering
- ✅ Multi-network support
- ✅ Responsive design

## 🌐 Deployment Options

### 1. Static Hosting (Recommended)
Deploy to any static hosting service:

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
# Build and deploy
npm run build
# Upload build/ folder to Netlify
```

**AWS S3 + CloudFront:**
```bash
# Build
npm run build

# Upload to S3
aws s3 sync build/ s3://your-bucket-name --delete

# Invalidate CloudFront
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 2. Docker Deployment
```dockerfile
# Dockerfile
FROM node:16-alpine as builder
WORKDIR /app
COPY client/package*.json ./
RUN npm ci --only=production
COPY client/ .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### 3. Traditional Web Server
```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/vito-interface;
    index index.html;

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
}
```

## 🔍 Performance Monitoring

### Cache Performance
Monitor cache effectiveness:
```javascript
// Get cache statistics
const stats = transactionCacheService.getCacheStats();
console.log('Cache Stats:', {
  memoryEntries: stats.memoryEntries,
  persistentEntries: stats.persistentEntries,
  activeRequests: stats.activeRequests,
  memorySize: stats.memorySize
});
```

### Performance Metrics
Track key performance indicators:
- **First Load Time**: Target < 3 seconds
- **Cached Load Time**: Target < 500ms
- **Memory Usage**: Target < 30MB
- **Cache Hit Ratio**: Target > 80%

### Error Monitoring
Implement error tracking:
```javascript
// Example with Sentry
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
});
```

## 🛠️ Maintenance

### Cache Management
```javascript
// Clear all caches (if needed)
transactionCacheService.clearAll();

// Invalidate specific Safe
transactionCacheService.invalidateCache(safeAddress);

// Get cache statistics
const stats = transactionCacheService.getCacheStats();
```

### Performance Tuning
Adjust cache settings based on usage:
```javascript
// In TransactionCacheService.ts
private readonly MEMORY_TTL = 5 * 60 * 1000; // Adjust as needed
private readonly PERSISTENT_TTL = 30 * 60 * 1000; // Adjust as needed
private readonly MAX_MEMORY_ENTRIES = 1000; // Adjust based on memory
private readonly PAGE_SIZE = 20; // Adjust based on UX needs
```

## 🔒 Security Considerations

### API Keys
- Store API keys in environment variables
- Use different keys for different environments
- Rotate keys regularly
- Monitor API usage

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' fonts.googleapis.com;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self' *.infura.io *.alchemy.com *.safe.global;
  img-src 'self' data: https:;
">
```

### HTTPS Configuration
Always use HTTPS in production:
```nginx
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
}
```

## 📊 Analytics & Monitoring

### Performance Analytics
Track user experience metrics:
- Page load times
- Cache hit rates
- Error rates
- User engagement

### Business Metrics
Monitor application usage:
- Active Safe wallets
- Transaction volume
- Feature usage
- User retention

## 🚨 Troubleshooting

### Common Issues

**1. Slow Loading**
- Check cache statistics
- Verify API endpoints
- Monitor network requests

**2. Styling Issues**
- Ensure Tailwind CSS is properly built
- Check CSS file size (should be ~5KB)
- Verify PostCSS configuration

**3. API Errors**
- Check Safe Transaction Service status
- Verify API keys and endpoints
- Monitor rate limits

**4. Memory Issues**
- Monitor cache size
- Adjust MAX_MEMORY_ENTRIES
- Implement cache cleanup

### Debug Mode
Enable debug logging:
```javascript
// Add to localStorage
localStorage.setItem('debug', 'vito:*');

// Or set environment variable
REACT_APP_DEBUG=true
```

## 🎯 Success Metrics

### Performance Targets
- **First Load**: < 3 seconds
- **Cached Load**: < 500ms
- **Memory Usage**: < 30MB
- **Cache Hit Rate**: > 80%

### User Experience
- **Transaction Display**: All transactions visible
- **Real-time Updates**: Status changes within 30s
- **Search Response**: < 1 second
- **Infinite Scroll**: Smooth pagination

The deployment is now ready for production use with enterprise-grade performance and reliability! 🚀
