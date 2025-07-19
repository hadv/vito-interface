#!/usr/bin/env node

/**
 * Script to diagnose and fix SafeTxPoolRegistry initialization issues
 * 
 * Usage:
 * node scripts/fix-registry-initialization.js --network sepolia --check
 * node scripts/fix-registry-initialization.js --network sepolia --fix
 */

const { ethers } = require('ethers');

// Configuration
const NETWORKS = {
  sepolia: {
    rpc: 'https://ethereum-sepolia-rpc.publicnode.com',
    registryAddress: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_SEPOLIA
  },
  ethereum: {
    rpc: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    registryAddress: process.env.REACT_APP_SAFE_TX_POOL_REGISTRY_ETHEREUM
  }
};

// ABIs
const REGISTRY_ABI = [
  'function trustedContractManager() view returns (address)',
  'function addressBookManager() view returns (address)',
  'function delegateCallManager() view returns (address)'
];

const MANAGER_ABI = [
  'function registry() view returns (address)',
  'function setRegistry(address _registry)'
];

async function checkRegistryInitialization(network) {
  console.log(`🔍 Checking SafeTxPoolRegistry initialization on ${network}...`);
  
  const config = NETWORKS[network];
  if (!config) {
    throw new Error(`Network ${network} not supported`);
  }
  
  if (!config.registryAddress || config.registryAddress === '0x0000000000000000000000000000000000000000') {
    throw new Error(`SafeTxPoolRegistry address not configured for ${network}`);
  }
  
  const provider = new ethers.providers.JsonRpcProvider(config.rpc);
  const registry = new ethers.Contract(config.registryAddress, REGISTRY_ABI, provider);
  
  console.log(`📍 SafeTxPoolRegistry: ${config.registryAddress}`);
  
  // Get manager contract addresses
  const trustedContractManagerAddr = await registry.trustedContractManager();
  const addressBookManagerAddr = await registry.addressBookManager();
  const delegateCallManagerAddr = await registry.delegateCallManager();
  
  console.log(`📍 TrustedContractManager: ${trustedContractManagerAddr}`);
  console.log(`📍 AddressBookManager: ${addressBookManagerAddr}`);
  console.log(`📍 DelegateCallManager: ${delegateCallManagerAddr}`);
  
  // Check each manager's registry setting
  const managers = [
    { name: 'TrustedContractManager', address: trustedContractManagerAddr },
    { name: 'AddressBookManager', address: addressBookManagerAddr },
    { name: 'DelegateCallManager', address: delegateCallManagerAddr }
  ];
  
  const issues = [];
  
  for (const manager of managers) {
    const contract = new ethers.Contract(manager.address, MANAGER_ABI, provider);
    const registryAddr = await contract.registry();
    
    console.log(`\n${manager.name}:`);
    console.log(`  Current registry: ${registryAddr}`);
    console.log(`  Expected registry: ${config.registryAddress}`);
    
    if (registryAddr.toLowerCase() !== config.registryAddress.toLowerCase()) {
      console.log(`  ❌ ISSUE: Registry not set correctly`);
      issues.push(manager);
    } else {
      console.log(`  ✅ OK: Registry set correctly`);
    }
  }
  
  if (issues.length > 0) {
    console.log(`\n🚨 Found ${issues.length} initialization issues:`);
    issues.forEach(manager => {
      console.log(`  - ${manager.name} (${manager.address}) needs setRegistry() called`);
    });
    console.log(`\nTo fix: node scripts/fix-registry-initialization.js --network ${network} --fix`);
    return false;
  } else {
    console.log(`\n✅ All manager contracts are properly initialized!`);
    return true;
  }
}

async function fixRegistryInitialization(network) {
  console.log(`🔧 Fixing SafeTxPoolRegistry initialization on ${network}...`);
  
  // This would require a private key or wallet connection
  console.log(`\n⚠️  Manual fix required:`);
  console.log(`\n1. Connect to ${network} with a wallet that has permission to call setRegistry()`);
  console.log(`2. For each manager contract that needs fixing, call:`);
  console.log(`   managerContract.setRegistry("${NETWORKS[network].registryAddress}")`);
  console.log(`\n3. Verify with: node scripts/fix-registry-initialization.js --network ${network} --check`);
}

async function main() {
  const args = process.argv.slice(2);
  const networkArg = args.find(arg => arg.startsWith('--network='))?.split('=')[1] || 
                     (args.includes('--network') ? args[args.indexOf('--network') + 1] : 'sepolia');
  const isCheck = args.includes('--check');
  const isFix = args.includes('--fix');
  
  if (!isCheck && !isFix) {
    console.log('Usage:');
    console.log('  node scripts/fix-registry-initialization.js --network sepolia --check');
    console.log('  node scripts/fix-registry-initialization.js --network sepolia --fix');
    return;
  }
  
  try {
    if (isCheck) {
      await checkRegistryInitialization(networkArg);
    } else if (isFix) {
      await fixRegistryInitialization(networkArg);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkRegistryInitialization, fixRegistryInitialization };
