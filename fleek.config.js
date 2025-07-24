/**
 * Fleek Configuration for Vito Interface
 * 
 * This configuration file is used by Fleek for automated IPFS deployment
 * and ENS integration.
 */

export default {
  // Site configuration
  site: {
    id: 'vito-interface', // Will be set during fleek sites init
    name: 'Vito Interface',
    description: 'A secure and efficient application designed to interact with Safe wallets',
  },

  // Build configuration
  build: {
    // Build command
    command: 'npm run build',
    
    // Build directory (relative to project root)
    publishDir: 'client/build',
    
    // Working directory for build
    baseDir: 'client',
    
    // Environment variables for build
    environment: {
      NODE_VERSION: '18',
      NPM_VERSION: '9',
    },
  },

  // IPFS configuration
  ipfs: {
    // Enable IPFS deployment
    enabled: true,
    
    // IPFS gateway configuration
    gateway: {
      // Use Fleek's gateway by default
      enabled: true,
      
      // Custom domain (optional)
      // customDomain: 'vito-wallet.eth.link',
    },
    
    // Pinning configuration
    pinning: {
      // Enable automatic pinning
      enabled: true,
      
      // Pin to multiple nodes for redundancy
      redundancy: 3,
    },
  },

  // ENS integration (optional)
  ens: {
    // Enable automatic ENS updates
    enabled: false, // Set to true if you want automatic ENS updates
    
    // ENS domain to update
    // domain: 'vito-wallet.eth',
    
    // Wallet configuration for ENS updates
    // wallet: {
    //   privateKey: process.env.ENS_PRIVATE_KEY, // Store in Fleek secrets
    // },
  },

  // Deployment hooks
  hooks: {
    // Pre-build hook
    preBuild: [
      // Ensure we're using the correct Node.js version
      'node --version',
      'npm --version',
      
      // Install dependencies
      'npm ci',
      
      // Run any pre-build checks
      'npm run type-check',
    ],
    
    // Post-build hook
    postBuild: [
      // Verify build output
      'ls -la build/',
      'du -sh build/',
      
      // Optional: Run build verification tests
      // 'npm run test:build',
    ],
    
    // Post-deploy hook
    postDeploy: [
      // Log deployment success
      'echo "Deployment completed successfully"',
      
      // Optional: Send notification
      // 'curl -X POST $WEBHOOK_URL -d "Vito Interface deployed to IPFS"',
    ],
  },

  // Performance optimization
  optimization: {
    // Enable build optimization
    enabled: true,
    
    // Compression settings
    compression: {
      // Enable gzip compression
      gzip: true,
      
      // Enable brotli compression
      brotli: true,
    },
    
    // Caching settings
    caching: {
      // Cache static assets
      staticAssets: {
        maxAge: '1y',
        immutable: true,
      },
      
      // Don't cache HTML files
      html: {
        maxAge: '0',
        noCache: true,
      },
    },
  },

  // Security headers
  headers: {
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "connect-src 'self' https://api.etherscan.io https://api.covalenthq.com https://relay.walletconnect.com wss://relay.walletconnect.com https://*.infura.io https://*.alchemy.com",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for React
      "style-src 'self' 'unsafe-inline'", // Required for styled-components
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join('; '),
    
    // Other security headers
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  },

  // Redirects and rewrites
  redirects: [
    // SPA fallback - redirect all routes to index.html
    {
      from: '/*',
      to: '/index.html',
      status: 200,
      conditions: {
        // Only apply to HTML requests (not assets)
        headers: {
          'Accept': '*text/html*',
        },
      },
    },
  ],

  // Custom domains (optional)
  domains: [
    // Add custom domains here if you have them
    // 'vito-wallet.eth.link',
    // 'vito-wallet.eth.limo',
  ],

  // Monitoring and analytics
  monitoring: {
    // Enable performance monitoring
    performance: true,
    
    // Enable error tracking
    errors: true,
    
    // Custom analytics (optional)
    // analytics: {
    //   provider: 'google',
    //   trackingId: 'GA_TRACKING_ID',
    // },
  },

  // Development settings
  development: {
    // Local development server settings
    server: {
      port: 3000,
      host: 'localhost',
    },
    
    // Hot reload settings
    hotReload: true,
    
    // Source maps
    sourceMaps: true,
  },

  // Advanced IPFS settings
  advanced: {
    // IPFS node settings
    ipfs: {
      // Use specific IPFS version
      version: 'latest',
      
      // Custom IPFS configuration
      config: {
        // Enable experimental features
        Experimental: {
          FilestoreEnabled: true,
          UrlstoreEnabled: true,
        },
        
        // Gateway configuration
        Gateway: {
          HTTPHeaders: {
            'Access-Control-Allow-Origin': ['*'],
            'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE'],
            'Access-Control-Allow-Headers': ['Content-Type'],
          },
        },
      },
    },
    
    // Build optimization
    build: {
      // Enable tree shaking
      treeShaking: true,
      
      // Enable code splitting
      codeSplitting: true,
      
      // Bundle analyzer (for debugging)
      bundleAnalyzer: false,
    },
  },
};
