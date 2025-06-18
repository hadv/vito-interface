import { ethers } from 'ethers';
import { TokenService } from '../services/TokenService';
import { getRpcUrl } from '../contracts/abis';

/**
 * Test function to verify token detection for a specific Safe wallet
 * This is useful for debugging token detection issues
 */
export const testTokenDetection = async (
  safeAddress: string = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19',
  network: string = 'sepolia'
) => {
  console.log(`🧪 Testing token detection for Safe: ${safeAddress} on ${network}`);
  
  try {
    // Initialize TokenService
    const rpcUrl = getRpcUrl(network);
    console.log(`🔗 Using RPC URL: ${rpcUrl}`);
    
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const tokenService = new TokenService(provider, network);

    // Test 1: Check known tokens
    console.log('\n📋 Step 1: Known tokens from TOKEN_ADDRESSES');
    const knownTokens = tokenService.getKnownTokens();
    console.log('Known tokens:', knownTokens);

    // Test 2: Check popular token addresses
    console.log('\n📋 Step 2: Popular token addresses');
    const popularAddresses = tokenService.getPopularTokenAddresses();
    console.log('Popular addresses:', popularAddresses);

    // Test 3: Test specific LINK token
    console.log('\n📋 Step 3: Testing LINK token specifically');
    const linkAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
    
    try {
      console.log(`🔍 Fetching LINK token info for ${linkAddress}...`);
      const linkTokenInfo = await tokenService.getTokenInfo(linkAddress);
      console.log('LINK token info:', linkTokenInfo);

      console.log(`🔍 Fetching LINK balance for ${safeAddress}...`);
      const linkBalance = await tokenService.getFormattedTokenBalance(linkAddress, safeAddress);
      console.log('LINK balance:', linkBalance);
    } catch (error) {
      console.error('❌ Error testing LINK token:', error);
    }

    // Test 4: Get all token balances
    console.log('\n📋 Step 4: Getting all token balances');
    const allBalances = await tokenService.getAllTokenBalances(safeAddress);
    console.log(`Found ${allBalances.length} tokens with balances:`, allBalances);

    return allBalances;

  } catch (error) {
    console.error('❌ Error in token detection test:', error);
    return [];
  }
};

/**
 * Test function specifically for LINK token on Sepolia
 */
export const testLinkTokenSepolia = async (
  safeAddress: string = '0x7a3d07cABd656aEc614831B6eFAbd014697c9E19'
) => {
  console.log(`🔗 Testing LINK token detection on Sepolia for ${safeAddress}`);
  
  const linkAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789';
  const rpcUrl = getRpcUrl('sepolia');
  
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    
    // Direct contract call to check balance
    const linkContract = new ethers.Contract(linkAddress, [
      'function balanceOf(address owner) view returns (uint256)',
      'function symbol() view returns (string)',
      'function name() view returns (string)',
      'function decimals() view returns (uint8)'
    ], provider);

    console.log('📞 Making direct contract calls...');
    
    const [balance, symbol, name, decimals] = await Promise.all([
      linkContract.balanceOf(safeAddress),
      linkContract.symbol(),
      linkContract.name(),
      linkContract.decimals()
    ]);

    const formattedBalance = ethers.utils.formatUnits(balance, decimals);

    console.log('🎯 Direct contract results:');
    console.log(`  Symbol: ${symbol}`);
    console.log(`  Name: ${name}`);
    console.log(`  Decimals: ${decimals}`);
    console.log(`  Raw Balance: ${balance.toString()}`);
    console.log(`  Formatted Balance: ${formattedBalance}`);

    return {
      symbol,
      name,
      decimals,
      balance: balance.toString(),
      formattedBalance
    };

  } catch (error) {
    console.error('❌ Error in direct LINK token test:', error);
    return null;
  }
};

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
  (window as any).testTokenDetection = testTokenDetection;
  (window as any).testLinkTokenSepolia = testLinkTokenSepolia;
}
