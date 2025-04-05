import { ethers } from 'ethers';

/**
 * Get an Ethereum provider based on the network
 * @param network The network name (ethereum, sepolia, arbitrum)
 * @returns An ethers.js provider for the specified network
 */
export const getProviderForNetwork = (network: string): ethers.providers.Provider => {
  // Use environment variables with fallbacks
  const INFURA_KEY = process.env.REACT_APP_INFURA_KEY || 'YOUR_INFURA_KEY';
  const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'YOUR_ALCHEMY_KEY';

  switch(network.toLowerCase()) {
    case 'arbitrum':
      return new ethers.providers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    case 'sepolia':
      return new ethers.providers.JsonRpcProvider(`https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`);
    case 'ethereum':
    default:
      // Use Alchemy for bette  r ENS resolution
      return new ethers.providers.AlchemyProvider('mainnet', ALCHEMY_KEY);
  }
};

/**
 * Cache for ENS name lookups to reduce API calls
 */
const ensCache: Record<string, string | null> = {};

/**
 * Resolve an Ethereum address to its ENS name
 * @param address The Ethereum address to lookup
 * @param network The network to use for the lookup
 * @returns The ENS name if found, null otherwise
 */
export const resolveAddressToEns = async (
  address: string,
  network: string = 'ethereum'
): Promise<string | null> => {
  if (!address) return null;
  
  // Normalize address
  const normalizedAddress = address.toLowerCase();
  
  // Check cache first
  const cacheKey = `${normalizedAddress}-${network}`;
  if (ensCache[cacheKey] !== undefined) {
    return ensCache[cacheKey];
  }

  try {
    const provider = getProviderForNetwork(network);
    
    // Perform reverse lookup
    const ensName = await provider.lookupAddress(normalizedAddress);
    
    // Cache the result (even if null)
    ensCache[cacheKey] = ensName;
    
    return ensName;
  } catch (error) {
    console.error('Error resolving ENS name:', error);
    // Cache the error as null
    ensCache[cacheKey] = null;
    return null;
  }
};

/**
 * Resolve an ENS name to its Ethereum address
 * @param ensName The ENS name to resolve
 * @param network The network to use for the resolution
 * @returns The Ethereum address if resolved, null otherwise
 */
export const resolveEnsToAddress = async (
  ensName: string,
  network: string = 'ethereum'
): Promise<string | null> => {
  if (!ensName) return null;
  
  try {
    const provider = getProviderForNetwork(network);
    
    // Resolve ENS name to address
    const address = await provider.resolveName(ensName);
    return address;
  } catch (error) {
    console.error('Error resolving address from ENS:', error);
    return null;
  }
};

/**
 * Check if a string is a valid ENS name
 * @param name String to check
 * @returns True if the string is a valid ENS name
 */
export const isValidEnsName = (name: string): boolean => {
  if (!name) return false;
  return name.endsWith('.eth') || name.includes('.'); // Simple check for .eth or other TLDs
};

/**
 * Check if a string is a valid Ethereum address
 * @param address String to check
 * @returns True if the string is a valid Ethereum address
 */
export const isValidEthereumAddress = (address: string): boolean => {
  return ethers.utils.isAddress(address);
}; 