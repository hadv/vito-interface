#!/usr/bin/env node

/**
 * ENS Manager Script for Vito Interface
 * 
 * This script helps manage ENS domain configuration for IPFS deployments.
 * It can update content hashes, verify ENS records, and provide deployment guidance.
 */

const { ethers } = require('ethers');
const readline = require('readline');

// ENS Contract Addresses (Mainnet)
const ENS_REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const ENS_PUBLIC_RESOLVER = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

// ENS utilities
function namehash(name) {
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';
  if (name !== '') {
    const labels = name.split('.');
    for (let i = labels.length - 1; i >= 0; i--) {
      node = ethers.utils.keccak256(
        ethers.utils.concat([node, ethers.utils.keccak256(ethers.utils.toUtf8Bytes(labels[i]))])
      );
    }
  }
  return node;
}

function encodeContentHash(ipfsHash) {
  // Remove 'ipfs://' prefix if present
  const hash = ipfsHash.replace(/^ipfs:\/\//, '');
  
  // Convert IPFS hash to content hash format
  // Format: 0xe3010170 (IPFS prefix) + 0x1220 (SHA-256 prefix) + hash
  const ipfsPrefix = '0xe3010170';
  const sha256Prefix = '0x1220';
  
  // Convert base58 IPFS hash to hex
  const bs58 = require('bs58');
  const hashBytes = bs58.decode(hash);
  const hashHex = '0x' + hashBytes.slice(2).toString('hex'); // Remove first 2 bytes (multihash prefix)
  
  return ipfsPrefix + sha256Prefix.slice(2) + hashHex.slice(2);
}

function decodeContentHash(contentHash) {
  if (!contentHash || contentHash === '0x') {
    return null;
  }
  
  // Check if it's an IPFS content hash
  if (contentHash.startsWith('0xe3010170')) {
    // Extract the hash part
    const hashHex = contentHash.slice(18); // Remove IPFS and SHA-256 prefixes
    
    // Convert back to IPFS hash
    const bs58 = require('bs58');
    const hashBytes = Buffer.from('1220' + hashHex, 'hex'); // Add back multihash prefix
    return 'ipfs://' + bs58.encode(hashBytes);
  }
  
  return contentHash;
}

class ENSManager {
  constructor(provider, signer = null) {
    this.provider = provider;
    this.signer = signer;
    
    // ENS Registry contract
    this.ensRegistry = new ethers.Contract(
      ENS_REGISTRY,
      [
        'function resolver(bytes32 node) view returns (address)',
        'function owner(bytes32 node) view returns (address)',
      ],
      provider
    );
    
    // Public Resolver contract
    this.publicResolver = new ethers.Contract(
      ENS_PUBLIC_RESOLVER,
      [
        'function contenthash(bytes32 node) view returns (bytes)',
        'function setContenthash(bytes32 node, bytes calldata hash) external',
        'function text(bytes32 node, string calldata key) view returns (string)',
        'function setText(bytes32 node, string calldata key, string calldata value) external',
      ],
      signer || provider
    );
  }
  
  async getDomainInfo(domain) {
    try {
      const node = namehash(domain);
      
      // Get owner
      const owner = await this.ensRegistry.owner(node);
      
      // Get resolver
      const resolverAddress = await this.ensRegistry.resolver(node);
      
      if (resolverAddress === ethers.constants.AddressZero) {
        return {
          domain,
          node,
          owner,
          resolver: null,
          contentHash: null,
          records: {},
        };
      }
      
      // Get resolver contract
      const resolver = new ethers.Contract(
        resolverAddress,
        [
          'function contenthash(bytes32 node) view returns (bytes)',
          'function text(bytes32 node, string calldata key) view returns (string)',
        ],
        this.provider
      );
      
      // Get content hash
      let contentHash = null;
      try {
        const contentHashBytes = await resolver.contenthash(node);
        contentHash = decodeContentHash(contentHashBytes);
      } catch (e) {
        // Content hash not set or not supported
      }
      
      // Get common text records
      const textKeys = ['url', 'description', 'avatar', 'github', 'twitter'];
      const records = {};
      
      for (const key of textKeys) {
        try {
          const value = await resolver.text(node, key);
          if (value) {
            records[key] = value;
          }
        } catch (e) {
          // Record not set
        }
      }
      
      return {
        domain,
        node,
        owner,
        resolver: resolverAddress,
        contentHash,
        records,
      };
    } catch (error) {
      throw new Error(`Failed to get domain info: ${error.message}`);
    }
  }
  
  async updateContentHash(domain, ipfsHash) {
    if (!this.signer) {
      throw new Error('Signer required to update content hash');
    }
    
    try {
      const node = namehash(domain);
      const encodedHash = encodeContentHash(ipfsHash);
      
      info(`Updating content hash for ${domain}...`);
      info(`IPFS Hash: ${ipfsHash}`);
      info(`Encoded Hash: ${encodedHash}`);
      
      const tx = await this.publicResolver.setContenthash(node, encodedHash);
      info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      success(`Content hash updated! Gas used: ${receipt.gasUsed.toString()}`);
      
      return receipt;
    } catch (error) {
      throw new Error(`Failed to update content hash: ${error.message}`);
    }
  }
  
  async updateTextRecord(domain, key, value) {
    if (!this.signer) {
      throw new Error('Signer required to update text records');
    }
    
    try {
      const node = namehash(domain);
      
      info(`Updating text record ${key} for ${domain}...`);
      
      const tx = await this.publicResolver.setText(node, key, value);
      info(`Transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      success(`Text record updated! Gas used: ${receipt.gasUsed.toString()}`);
      
      return receipt;
    } catch (error) {
      throw new Error(`Failed to update text record: ${error.message}`);
    }
  }
}

// Main CLI functions
async function showDomainInfo() {
  const domain = await question('Enter ENS domain (e.g., vito-wallet.eth): ');
  
  if (!domain.endsWith('.eth')) {
    error('Please enter a valid .eth domain');
    return;
  }
  
  try {
    // Use public provider for read operations
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum.publicnode.com');
    const ensManager = new ENSManager(provider);
    
    info(`Fetching information for ${domain}...`);
    const domainInfo = await ensManager.getDomainInfo(domain);
    
    console.log('\n📋 Domain Information:');
    console.log(`Domain: ${domainInfo.domain}`);
    console.log(`Owner: ${domainInfo.owner}`);
    console.log(`Resolver: ${domainInfo.resolver || 'Not set'}`);
    console.log(`Content Hash: ${domainInfo.contentHash || 'Not set'}`);
    
    if (Object.keys(domainInfo.records).length > 0) {
      console.log('\n📝 Text Records:');
      for (const [key, value] of Object.entries(domainInfo.records)) {
        console.log(`  ${key}: ${value}`);
      }
    }
    
    if (domainInfo.contentHash) {
      console.log('\n🌐 Access URLs:');
      const ipfsHash = domainInfo.contentHash.replace('ipfs://', '');
      console.log(`  IPFS: https://ipfs.io/ipfs/${ipfsHash}`);
      console.log(`  Cloudflare: https://cloudflare-ipfs.com/ipfs/${ipfsHash}`);
      console.log(`  ENS Link: https://${domain}.link`);
      console.log(`  ENS Limo: https://${domain}.limo`);
    }
    
  } catch (error) {
    error(`Error: ${error.message}`);
  }
}

async function updateContentHash() {
  const domain = await question('Enter ENS domain: ');
  const ipfsHash = await question('Enter IPFS hash (with or without ipfs:// prefix): ');
  
  if (!domain.endsWith('.eth')) {
    error('Please enter a valid .eth domain');
    return;
  }
  
  if (!ipfsHash.match(/^(ipfs:\/\/)?Qm[a-zA-Z0-9]{44}$/)) {
    error('Please enter a valid IPFS hash');
    return;
  }
  
  try {
    // Get provider and signer
    const rpcUrl = await question('Enter RPC URL (or press Enter for default): ') || 'https://ethereum.publicnode.com';
    const privateKey = await question('Enter private key (or press Enter to skip): ');
    
    if (!privateKey) {
      warning('Private key required to update ENS records');
      info('You can update the content hash manually at https://app.ens.domains/');
      info(`Content hash to use: ipfs://${ipfsHash.replace(/^ipfs:\/\//, '')}`);
      return;
    }
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);
    const ensManager = new ENSManager(provider, signer);
    
    // Verify domain ownership
    const domainInfo = await ensManager.getDomainInfo(domain);
    const signerAddress = await signer.getAddress();
    
    if (domainInfo.owner.toLowerCase() !== signerAddress.toLowerCase()) {
      error(`You don't own this domain. Owner: ${domainInfo.owner}`);
      return;
    }
    
    // Update content hash
    await ensManager.updateContentHash(domain, ipfsHash);
    
    success('Content hash updated successfully!');
    info('It may take a few minutes for the changes to propagate.');
    
  } catch (error) {
    error(`Error: ${error.message}`);
  }
}

async function verifyDeployment() {
  const domain = await question('Enter ENS domain to verify: ');
  
  if (!domain.endsWith('.eth')) {
    error('Please enter a valid .eth domain');
    return;
  }
  
  try {
    const provider = new ethers.providers.JsonRpcProvider('https://ethereum.publicnode.com');
    const ensManager = new ENSManager(provider);
    
    info(`Verifying deployment for ${domain}...`);
    const domainInfo = await ensManager.getDomainInfo(domain);
    
    if (!domainInfo.contentHash) {
      error('No content hash set for this domain');
      return;
    }
    
    const ipfsHash = domainInfo.contentHash.replace('ipfs://', '');
    
    // Test different gateways
    const gateways = [
      `https://ipfs.io/ipfs/${ipfsHash}`,
      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
      `https://${domain}.link`,
      `https://${domain}.limo`,
    ];
    
    console.log('\n🧪 Testing gateways:');
    
    for (const gateway of gateways) {
      try {
        const response = await fetch(gateway, { method: 'HEAD' });
        if (response.ok) {
          success(`✅ ${gateway}`);
        } else {
          warning(`⚠️  ${gateway} (Status: ${response.status})`);
        }
      } catch (error) {
        error(`❌ ${gateway} (Error: ${error.message})`);
      }
    }
    
  } catch (error) {
    error(`Error: ${error.message}`);
  }
}

async function showHelp() {
  console.log(`
🔧 ENS Manager for Vito Interface

Available commands:
  1. Show domain info - View current ENS domain configuration
  2. Update content hash - Update IPFS content hash for ENS domain
  3. Verify deployment - Test ENS domain and IPFS gateway access
  4. Help - Show this help message
  5. Exit - Exit the program

Usage Tips:
- Make sure you own the ENS domain before trying to update it
- Keep your private key secure and never share it
- Test your IPFS deployment before updating ENS
- Changes may take a few minutes to propagate
  `);
}

async function main() {
  console.log('🔧 ENS Manager for Vito Interface\n');
  
  while (true) {
    console.log('\nSelect an option:');
    console.log('1. Show domain info');
    console.log('2. Update content hash');
    console.log('3. Verify deployment');
    console.log('4. Help');
    console.log('5. Exit');
    
    const choice = await question('\nEnter your choice (1-5): ');
    
    switch (choice) {
      case '1':
        await showDomainInfo();
        break;
      case '2':
        await updateContentHash();
        break;
      case '3':
        await verifyDeployment();
        break;
      case '4':
        await showHelp();
        break;
      case '5':
        info('Goodbye!');
        rl.close();
        return;
      default:
        warning('Invalid choice. Please enter 1-5.');
    }
  }
}

// Handle errors and cleanup
process.on('SIGINT', () => {
  info('\nGoodbye!');
  rl.close();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  error(`Unhandled error: ${error.message}`);
  process.exit(1);
});

// Install required dependencies if not present
try {
  require('ethers');
  require('bs58');
} catch (error) {
  error('Missing dependencies. Please run: npm install ethers bs58');
  process.exit(1);
}

// Run the main function
if (require.main === module) {
  main().catch((error) => {
    error(`Error: ${error.message}`);
    process.exit(1);
  });
}
