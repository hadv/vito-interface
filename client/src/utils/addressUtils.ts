import { ethers } from 'ethers';

/**
 * Convert an address to checksum format
 * @param address - The address to convert
 * @returns The checksum address or null if invalid
 */
export const toChecksumAddress = (address: string): string | null => {
  try {
    return ethers.utils.getAddress(address);
  } catch {
    return null;
  }
};

/**
 * Check if two addresses are equal (case-insensitive)
 * @param address1 - First address
 * @param address2 - Second address
 * @returns True if addresses are equal
 */
export const addressesEqual = (address1: string, address2: string): boolean => {
  try {
    return ethers.utils.getAddress(address1) === ethers.utils.getAddress(address2);
  } catch {
    return false;
  }
};

/**
 * Validate if a string is a valid Ethereum address
 * @param address - The address to validate
 * @returns True if valid address
 */
export const isValidAddress = (address: string): boolean => {
  try {
    ethers.utils.getAddress(address);
    return true;
  } catch {
    return false;
  }
};

/**
 * Convert an array of addresses to checksum format
 * @param addresses - Array of addresses to convert
 * @returns Array of checksum addresses (invalid addresses are filtered out)
 */
export const toChecksumAddresses = (addresses: string[]): string[] => {
  return addresses
    .map(address => toChecksumAddress(address))
    .filter((address): address is string => address !== null);
};

/**
 * Check if an address is in an array of addresses (case-insensitive)
 * @param address - The address to find
 * @param addresses - Array of addresses to search in
 * @returns True if address is found
 */
export const addressInArray = (address: string, addresses: string[]): boolean => {
  try {
    const checksumAddress = ethers.utils.getAddress(address);
    return addresses.some(addr => {
      try {
        return ethers.utils.getAddress(addr) === checksumAddress;
      } catch {
        return false;
      }
    });
  } catch {
    return false;
  }
};

/**
 * Format an address for display (truncated with checksum)
 * @param address - The address to format
 * @param startLength - Number of characters to show at start (default: 6)
 * @param endLength - Number of characters to show at end (default: 4)
 * @returns Formatted address string
 */
export const formatChecksumAddress = (
  address: string, 
  startLength: number = 6, 
  endLength: number = 4
): string => {
  try {
    const checksumAddress = ethers.utils.getAddress(address);
    if (checksumAddress.length <= startLength + endLength + 2) {
      return checksumAddress;
    }
    return `${checksumAddress.substring(0, startLength)}...${checksumAddress.substring(checksumAddress.length - endLength)}`;
  } catch {
    // Fallback for invalid addresses
    if (address.length <= startLength + endLength + 2) {
      return address;
    }
    return `${address.substring(0, startLength)}...${address.substring(address.length - endLength)}`;
  }
};

/**
 * Get the zero address in checksum format
 * @returns The zero address
 */
export const getZeroAddress = (): string => {
  return ethers.constants.AddressZero;
};

/**
 * Check if an address is the zero address
 * @param address - The address to check
 * @returns True if it's the zero address
 */
export const isZeroAddress = (address: string): boolean => {
  try {
    return ethers.utils.getAddress(address) === ethers.constants.AddressZero;
  } catch {
    return false;
  }
};
